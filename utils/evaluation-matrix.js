'use strict';

const catalog = require('../data/evaluation-questions.json');
const { INSTRUMENT_STANDARDS } = require('./standards');

function normalizeCode(value) {
  const code = String(value || '').trim().toUpperCase();
  if (!catalog[code]) throw new Error(`Instrumen ${value} tidak dikenal.`);
  return code;
}

function getInstrumentQuestions(value) {
  return catalog[normalizeCode(value)].questions;
}

function getInstrumentCatalog(value) {
  return catalog[normalizeCode(value)];
}

function roundScore(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function formatValue(value) {
  if (value === undefined || value === null || String(value).trim() === '') return 'Belum diisi';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(roundScore(value));
  return String(value).trim();
}

function humanizeField(field) {
  const suffixMap = {
    status: 'Status',
    jumlah: 'Jumlah',
    persen: 'Persentase',
    nama: 'Nama',
    nilai: 'Nilai',
    pilihan: 'Pilihan',
    program: 'Jumlah program',
    indikator: 'Jumlah indikator',
    nasional: 'Tingkat nasional',
    provinsi: 'Tingkat provinsi',
    kabupaten: 'Tingkat kabupaten',
    klasifikasi: 'Klasifikasi',
    tertinggi: 'Persentase tertinggi',
    detail: 'Rincian'
  };

  const cleaned = String(field || '')
    .replace(/^ind_\d+[a-z]?\d?_?/, '')
    .replace(/_/g, ' ')
    .trim();
  if (!cleaned) return 'Jawaban';
  return cleaned.split(/\s+/).map(part => suffixMap[part] || part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function questionFieldRegex(number) {
  return new RegExp(`^ind_${number}(?:_|[a-z])`, 'i');
}

function collectAnswers(row, questionNumber) {
  const pattern = questionFieldRegex(questionNumber);
  return Object.entries(row || {})
    .filter(([field]) => pattern.test(field))
    .filter(([field]) => !field.endsWith('_file'))
    .filter(([field]) => !['total_score', 'upload_status', 'updated_at'].includes(field))
    .map(([field, value]) => ({
      field,
      label: humanizeField(field),
      value: formatValue(value),
      filled: value !== undefined && value !== null && String(value).trim() !== ''
    }));
}

function keyBelongsToQuestion(key, question) {
  const normalizedKey = String(key || '').toLowerCase();
  const questionKey = String(question.key || '').toLowerCase();
  if (normalizedKey === questionKey) return true;
  if ((question.evidence || []).some(item => String(item.key || '').toLowerCase() === normalizedKey)) return true;
  return new RegExp(`^${questionKey}[a-z]\\d*$`, 'i').test(normalizedKey);
}

function buildAutoQuestionScore(code, question, aspectScore) {
  const details = aspectScore && aspectScore.details ? aspectScore.details : {};
  const direct = details[question.key];

  if (direct && (Number(direct.score || 0) > 0 || direct.hasEvidence || direct.selectedOption)) {
    return roundScore(direct.score);
  }

  const score = Object.entries(details)
    .filter(([key]) => keyBelongsToQuestion(key, question))
    .reduce((sum, [, detail]) => sum + Number(detail && detail.score ? detail.score : 0), 0);

  return roundScore(Math.min(score, Number(question.maxScore || score || 0)));
}

function mapFilesByKey(files) {
  const map = new Map();
  for (const file of files || []) {
    const key = String(file.indicator_key || file.indicatorKey || '').trim().toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({
      ...file,
      indicatorKey: key,
      url: file.url || `/assessment/preview/${file.id}`
    });
  }
  return map;
}

function mapScoresByKey(rows) {
  return new Map((rows || []).map(row => [String(row.indicator_key || '').toLowerCase(), row]));
}

function buildInstrumentMatrix({ code: rawCode, row, files, itemScores, aspectScore }) {
  const code = normalizeCode(rawCode);
  const definition = getInstrumentCatalog(code);
  const fileMap = mapFilesByKey(files);
  const scoreMap = mapScoresByKey(itemScores);

  const questions = definition.questions.map(question => {
    const isChoice = question.answerType === 'single_choice_with_evidence';
    const selectedChoice = isChoice ? String(row && row[question.field] || '').trim().toLowerCase() : '';
    const selectedOption = isChoice
      ? (question.options || []).find(option => String(option.key) === selectedChoice)
      : null;
    const expectedEvidence = question.evidence.map(item => {
      const exactFiles = fileMap.get(String(item.key).toLowerCase()) || [];
      const active = !isChoice || Boolean(selectedOption && String(selectedOption.evidenceKey) === String(item.key));
      return {
        ...item,
        active,
        files: exactFiles,
        complete: active && exactFiles.length > 0
      };
    });
    const activeEvidence = expectedEvidence.filter(item => item.active !== false);
    const evidenceFilled = activeEvidence.filter(item => item.complete).length;
    const legacyFiles = question.evidence.length > 1 ? (fileMap.get(question.key) || []) : [];
    const automaticScore = buildAutoQuestionScore(code, question, aspectScore);
    const saved = scoreMap.get(question.key);
    const awardedScore = saved ? roundScore(saved.awarded_score) : automaticScore;

    return {
      ...question,
      answers: collectAnswers(row, question.number),
      expectedEvidence,
      evidenceFilled,
      evidenceTotal: activeEvidence.length,
      evidenceComplete: activeEvidence.length > 0 && evidenceFilled === activeEvidence.length,
      legacyFiles,
      automaticScore,
      awardedScore,
      saved: Boolean(saved),
      notes: saved && saved.notes ? saved.notes : ''
    };
  });

  const awardedTotal = roundScore(questions.reduce((sum, question) => sum + Number(question.awardedScore || 0), 0));
  const automaticTotal = roundScore(questions.reduce((sum, question) => sum + Number(question.automaticScore || 0), 0));

  return {
    code,
    name: definition.name,
    maxScore: definition.maxScore,
    questions,
    automaticTotal: Math.min(automaticTotal, definition.maxScore),
    awardedTotal: Math.min(awardedTotal, definition.maxScore),
    savedCount: questions.filter(question => question.saved).length,
    totalQuestions: questions.length,
    evidenceFilled: questions.reduce((sum, question) => sum + question.evidenceFilled, 0),
    evidenceTotal: questions.reduce((sum, question) => sum + question.evidenceTotal, 0)
  };
}

function buildReviewedAspect(code, matrix, automaticAspect) {
  const standard = INSTRUMENT_STANDARDS[normalizeCode(code)];
  const hasSavedScores = matrix && matrix.savedCount > 0;
  const totalScore = hasSavedScores
    ? roundScore(Math.min(matrix.awardedTotal, standard.maxScore))
    : roundScore(automaticAspect && automaticAspect.totalScore);
  return {
    ...(automaticAspect || {}),
    aspect: standard.code,
    name: standard.name,
    totalScore,
    maxScore: standard.maxScore,
    percentage: standard.maxScore > 0 ? roundScore((totalScore / standard.maxScore) * 100) : 0,
    scoringSource: hasSavedScores ? 'Penilaian administrator per pertanyaan' : 'Nilai sistem sementara'
  };
}

function validateAwardedScore(question, rawValue) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
    throw new Error(`Hasil penilaian Pertanyaan ${question.number} wajib diisi.`);
  }
  const value = Number(String(rawValue).replace(',', '.'));
  if (!Number.isFinite(value)) throw new Error(`Hasil penilaian Pertanyaan ${question.number} tidak valid.`);
  const rounded = roundScore(value);
  if (rounded < 0 || rounded > Number(question.maxScore) + 0.000001) {
    throw new Error(`Hasil Pertanyaan ${question.number} harus berada antara 0 dan ${question.maxScore}.`);
  }
  const allowedScores = Array.isArray(question.scoreOptions)
    ? question.scoreOptions.map(roundScore)
    : [];
  if (allowedScores.length && !allowedScores.some(score => Math.abs(score - rounded) < 0.000001)) {
    throw new Error(
      `Hasil Pertanyaan ${question.number} harus mengikuti pilihan nilai resmi: ${allowedScores.join(', ')}.`
    );
  }
  return rounded;
}

module.exports = {
  getInstrumentCatalog,
  getInstrumentQuestions,
  buildInstrumentMatrix,
  buildReviewedAspect,
  validateAwardedScore,
  roundScore
};

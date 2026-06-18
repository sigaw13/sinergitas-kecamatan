'use strict';

const EVALUATION_QUESTIONS = require('../data/evaluation-questions.json');

const INSTRUMENTS = {
  a: {
    key: 'A',
    title: 'Pelayanan Publik',
    fields: [
      'ind_1_status',
      'ind_2a_status', 'ind_2b_status', 'ind_2c_status',
      'ind_3_status', 'ind_4_jumlah',
      'ind_5a_jumlah', 'ind_5b_jumlah',
      'ind_6_status', 'ind_7_jumlah', 'ind_8_status',
      'ind_9a_status', 'ind_9b_status', 'ind_9c_status', 'ind_9d_status', 'ind_9e_status',
      'ind_10a_status', 'ind_10b_status', 'ind_10c_status', 'ind_10d_status',
      'ind_10e_status', 'ind_10f_status', 'ind_10g_status',
      'ind_11_status', 'ind_12a_jumlah', 'ind_12b_jumlah',
      'ind_13_status', 'ind_14a_status', 'ind_14b_status', 'ind_14c_status',
      'ind_15_persen', 'ind_16_persen'
    ],
    evidenceKeys: [
      'ind_1',
      'ind_2a', 'ind_2b', 'ind_2c',
      'ind_3', 'ind_4',
      'ind_5a', 'ind_5b',
      'ind_6', 'ind_7', 'ind_8',
      'ind_9a', 'ind_9b', 'ind_9c', 'ind_9d', 'ind_9e',
      'ind_10a', 'ind_10b', 'ind_10c', 'ind_10d', 'ind_10e', 'ind_10f', 'ind_10g',
      'ind_11',
      'ind_12a', 'ind_12b',
      'ind_13',
      'ind_14a', 'ind_14b', 'ind_14c',
      'ind_15', 'ind_16'
    ]
  },
  b: {
    key: 'B',
    title: 'Penyelenggaraan Urusan Pemerintahan Umum',
    fields: [
      'ind_1_jumlah', 'ind_2_jumlah', 'ind_3_pilihan',
      'ind_4a_jumlah', 'ind_4b_jumlah', 'ind_5_jumlah', 'ind_6_jumlah',
      'ind_7a_jumlah', 'ind_7b_jumlah', 'ind_8a_jumlah', 'ind_8b_jumlah',
      'ind_9a_jumlah', 'ind_9b_jumlah',
      'ind_10a_status', 'ind_10b_status', 'ind_10c_status',
      'ind_11a_jumlah', 'ind_11b_jumlah',
      'ind_12a_jumlah', 'ind_12b_jumlah',
      'ind_13a_jumlah', 'ind_13b_jumlah',
      'ind_14a_jumlah', 'ind_14b_jumlah', 'ind_14c_jumlah',
      'ind_15a_jumlah', 'ind_15b_jumlah', 'ind_15c_jumlah', 'ind_15d_jumlah',
      'ind_16a1_jumlah', 'ind_16a2_jumlah', 'ind_16a3_jumlah',
      'ind_16b1_jumlah', 'ind_16b2_jumlah', 'ind_16b3_jumlah',
      'ind_17_jumlah', 'ind_18a_jumlah', 'ind_18b_jumlah',
      'ind_19a_jumlah', 'ind_19b_jumlah',
      'ind_20a_jumlah', 'ind_20b_jumlah', 'ind_20c_jumlah', 'ind_20d_jumlah', 'ind_20e_jumlah',
      'ind_21_jumlah', 'ind_22_jumlah',
      'ind_23a_jumlah', 'ind_23b_jumlah',
      'ind_24a_jumlah', 'ind_24b_jumlah',
      'ind_25a_jumlah', 'ind_25b_jumlah',
      'ind_26a_status', 'ind_26a_jumlah', 'ind_26b_jumlah',
      'ind_26c_status', 'ind_26c_jumlah', 'ind_26d_status', 'ind_26d_jumlah',
      'ind_26e_status', 'ind_26e_jumlah', 'ind_26f_status', 'ind_26f_jumlah',
      'ind_27_pilihan',
      'ind_28a_jumlah', 'ind_28b_jumlah',
      'ind_29a_jumlah', 'ind_29b_jumlah',
      'ind_30a_jumlah', 'ind_30b_jumlah', 'ind_30_klasifikasi',
      'ind_31a_jumlah', 'ind_31b_jumlah',
      'ind_32a_jumlah', 'ind_32b_jumlah',
      'ind_33a_jumlah', 'ind_33b_jumlah', 'ind_33c_jumlah', 'ind_33d_jumlah', 'ind_33e_jumlah', 'ind_33f_jumlah',
      'ind_34a_jumlah', 'ind_34b_jumlah',
      'ind_35a_jumlah', 'ind_35b_jumlah',
      'ind_36a_jumlah', 'ind_36b_jumlah',
      'ind_37a_jumlah', 'ind_37b_jumlah',
      'ind_38a_jumlah', 'ind_38b_jumlah',
      'ind_39a_jumlah', 'ind_39b_jumlah',
      'ind_40a_jumlah', 'ind_40b_jumlah',
      'ind_41_pilihan', 'ind_42_status',
      'ind_43a_status', 'ind_43a_jumlah', 'ind_43b_status', 'ind_43b_jumlah',
      'ind_43c_komentar', 'ind_43d_status', 'ind_43d_jumlah', 'ind_43e_status'
    ],
    evidenceKeys: EVALUATION_QUESTIONS.B.questions.flatMap(question => question.evidence.map(item => item.key))
  },
  c: {
    key: 'C',
    title: 'Pengelolaan Anggaran Kecamatan',
    fields: [
      'ind_1a', 'ind_1b', 'ind_1c', 'ind_1d',
      'ind_2a_program', 'ind_2a_indikator', 'ind_2b_program', 'ind_2b_indikator',
      'ind_3a', 'ind_3b', 'ind_3c', 'ind_3d', 'ind_3e', 'ind_3f',
      'ind_4',
      'ind_5a', 'ind_5b', 'ind_5c', 'ind_5d', 'ind_5e', 'ind_5f', 'ind_5g',
      'ind_6a', 'ind_6b'
    ],
    evidenceKeys: Array.from({ length: 6 }, (_, index) => `ind_${index + 1}`)
  },
  d: {
    key: 'D',
    title: 'Inovasi Kecamatan dan Upaya yang Dilakukan Kecamatan',
    fields: [
      'ind_1a_nama', 'ind_1b_nama',
      'ind_2_jumlah', 'ind_2_detail',
      'ind_3_pilihan',
      'ind_4a_nasional', 'ind_4a_provinsi', 'ind_4a_kabupaten',
      'ind_4b_nasional', 'ind_4b_provinsi', 'ind_4_detail'
    ],
    evidenceKeys: EVALUATION_QUESTIONS.D.questions.flatMap(question => question.evidence.map(item => item.key))
  },
  e: {
    key: 'E',
    title: 'Kompetensi Sumber Daya Manusia Kecamatan',
    fields: [
      'ind_1a_sd', 'ind_1b_smp', 'ind_1c_sma', 'ind_1d_d3',
      'ind_1e_s1', 'ind_1f_s2', 'ind_1g_s3', 'ind_1_persen_tertinggi',
      'ind_2_jumlah', 'ind_3_jumlah', 'ind_4_jumlah', 'ind_5_status'
    ],
    evidenceKeys: Array.from({ length: 5 }, (_, index) => `ind_${index + 1}`)
  },
  f: {
    key: 'F',
    title: 'Keberadaan Data Dukung Lainnya',
    fields: Array.from({ length: 40 }, (_, index) => `ind_${index + 1}_status`),
    evidenceKeys: Array.from({ length: 40 }, (_, index) => `ind_${index + 1}`)
  }
};

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function parseFilledFields(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : null;
  } catch (_) {
    return null;
  }
}

function inferFilledFields(row, fields) {
  const set = new Set();
  if (!row) return set;
  for (const field of fields) {
    if (hasValue(row[field])) set.add(field);
  }
  return set;
}


function inferMeaningfulLegacyFields(row, fields) {
  const set = new Set();
  if (!row) return set;

  const defaultTextValues = new Set([
    'tidak', 'belum', 'tidak ada data'
  ]);

  for (const field of fields) {
    const value = row[field];
    if (!hasValue(value)) continue;

    if (typeof value === 'number') {
      if (value !== 0) set.add(field);
      continue;
    }

    const text = String(value).trim();
    const lower = text.toLowerCase();
    if (/^-?\d+(?:[.,]\d+)?$/.test(text)) {
      if (Number(text.replace(',', '.')) !== 0) set.add(field);
      continue;
    }
    if (defaultTextValues.has(lower)) continue;
    if (field === 'ind_41_nilai' && lower === 'd') continue;
    if (field === 'ind_1_persen_tertinggi' && lower === 'c') continue;
    set.add(field);
  }
  return set;
}

function sanitizeLegacyRow(row, fields, filledFields) {
  const output = { ...(row || {}) };
  const filled = filledFields instanceof Set ? filledFields : new Set(filledFields || []);
  for (const field of fields) {
    if (!filled.has(field)) output[field] = null;
  }
  return output;
}


function inferChoiceForProgress(instrument, question, row = {}) {
  const explicit = String(row && row[question.field] || '').trim().toLowerCase();
  if ((question.options || []).some(option => String(option.key) === explicit)) return explicit;
  const number = Number(question.number);
  if (instrument === 'b' && number === 3) {
    const value = Number(row.ind_3_jumlah);
    if (value >= 1 && value < 5) return 'a';
    if (value >= 6 && value <= 11) return 'b';
    if (value >= 12 && value <= 35) return 'c';
    if (value >= 36 && value <= 48) return 'd';
  }
  if (instrument === 'b' && number === 27) {
    const value = Number(row.ind_27_jumlah);
    if (value >= 1 && value <= 4) return 'b';
    if (value >= 5 && value <= 8) return 'c';
    if (value >= 9) return 'd';
  }
  if (instrument === 'b' && number === 41) {
    const value = String(row.ind_41_nilai || '').trim().toUpperCase();
    if (['A','AA','A-AA'].includes(value)) return 'a';
    if (['B','BB','B-BB'].includes(value)) return 'b';
    if (['C','CC','C-CC'].includes(value)) return 'c';
    if (['D','DD','D-DD'].includes(value)) return 'd';
  }
  if (instrument === 'd' && number === 3) {
    const value = Number(row.ind_3_jumlah);
    if (value >= 1 && value <= 5) return 'a';
    if (value >= 6 && value <= 10) return 'b';
    if (value >= 11 && value <= 15) return 'c';
    if (value > 15) return 'd';
  }
  return null;
}

function resolveRequiredEvidenceKeys(instrument, row = {}) {
  const definition = INSTRUMENTS[instrument];
  if (!definition) return [];
  let required = [...definition.evidenceKeys];
  const catalog = EVALUATION_QUESTIONS[String(instrument || '').toUpperCase()];
  for (const question of (catalog && catalog.questions) || []) {
    if (question.answerType !== 'single_choice_with_evidence') continue;
    const optionKeys = new Set((question.options || []).map(option => String(option.evidenceKey)));
    required = required.filter(key => !optionKeys.has(String(key)));
    const selected = inferChoiceForProgress(instrument, question, row);
    const option = (question.options || []).find(item => String(item.key) === String(selected));
    required.push(option ? String(option.evidenceKey) : String(question.key));
  }
  return required;
}

function calculateInstrumentProgress({ instrument, row, filledFields, evidenceKeys, requiredEvidenceKeys }) {
  const definition = INSTRUMENTS[instrument];
  if (!definition) throw new Error(`Instrumen ${instrument} tidak dikenal.`);

  // Progres pengisian harus berasal dari jejak field yang benar-benar dikirim pengguna.
  // Nilai bawaan database seperti 0 atau 'tidak' tidak boleh dianggap sebagai jawaban.
  const parsedFilledFields = filledFields instanceof Set
    ? filledFields
    : parseFilledFields(filledFields);
  const explicit = parsedFilledFields || new Set();
  const evidence = evidenceKeys instanceof Set ? evidenceKeys : new Set(evidenceKeys || []);
  const requiredEvidence = Array.isArray(requiredEvidenceKeys)
    ? requiredEvidenceKeys
    : resolveRequiredEvidenceKeys(instrument, row || {});

  const dataFilled = definition.fields.filter(field => explicit.has(field)).length;
  const evidenceFilled = requiredEvidence.filter(key => evidence.has(key)).length;
  const dataTotal = definition.fields.length;
  const evidenceTotal = requiredEvidence.length;
  const completed = dataFilled + evidenceFilled;
  const total = dataTotal + evidenceTotal;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    instrument: definition.key,
    title: definition.title,
    dataFilled,
    dataTotal,
    dataPercent: dataTotal > 0 ? Math.round((dataFilled / dataTotal) * 100) : 0,
    evidenceFilled,
    evidenceTotal,
    evidencePercent: evidenceTotal > 0 ? Math.round((evidenceFilled / evidenceTotal) * 100) : 0,
    completed,
    total,
    percent
  };
}

function calculateOverallProgress(progressItems) {
  const items = Array.isArray(progressItems) ? progressItems : [];
  const completed = items.reduce((sum, item) => sum + Number(item.completed || 0), 0);
  const total = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

module.exports = {
  INSTRUMENTS,
  hasValue,
  parseFilledFields,
  inferFilledFields,
  inferMeaningfulLegacyFields,
  sanitizeLegacyRow,
  resolveRequiredEvidenceKeys,
  calculateInstrumentProgress,
  calculateOverallProgress
};

'use strict';

/**
 * Sistem scoring SIESELON yang diselaraskan dengan workbook resmi 2026.
 * Skor otomatis mengikuti rumus workbook
 * hasil penilaian = standar nilai apabila bukti dukung berstatus SUDAH.
 */

const {
  INSTRUMENT_STANDARDS,
  TOTAL_MAX_SCORE,
  scoreFromEvidence
} = require('./standards');

function normalizeKeySet(evidenceKeys = []) {
  return evidenceKeys instanceof Set
    ? new Set([...evidenceKeys].map(key => String(key).trim().toLowerCase()))
    : new Set((evidenceKeys || []).map(key => String(key).trim().toLowerCase()));
}

function hasEvidence(keys, ...candidateKeys) {
  return candidateKeys.some(key => keys.has(String(key).trim().toLowerCase()));
}

function numberValue(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const numeric = Number(String(value).replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : null;
}

function hasAnyInput(data, fields) {
  return fields.some(field => data[field] !== undefined && data[field] !== null && String(data[field]).trim() !== '');
}

function positiveScore(data, fieldsWithScores) {
  return fieldsWithScores.reduce((sum, [field, score]) => {
    const value = numberValue(data[field]);
    return sum + (value !== null && value > 0 ? Number(score) : 0);
  }, 0);
}

function ratioScore(numerator, denominator, maxScore) {
  const top = numberValue(numerator);
  const bottom = numberValue(denominator);
  if (top === null || bottom === null || bottom <= 0) return { score: 0, percentage: null };

  const percentage = Math.max(0, Math.min(100, (top / bottom) * 100));
  let score = 0;
  if (percentage >= 76) score = maxScore;
  else if (percentage >= 51) score = maxScore === 1 ? 0.75 : 0.4;
  else if (percentage >= 26) score = maxScore === 1 ? 0.5 : 0.3;
  else score = maxScore === 1 ? 0.25 : 0.2;

  return {
    score: Math.round(score * 100) / 100,
    percentage: Math.round(percentage * 100) / 100
  };
}

class ScoringSystem {
  static calculateAspectA(_data = {}, evidenceKeys = []) {
    return scoreFromEvidence('A', evidenceKeys);
  }

  static calculateAspectB(data = {}, evidenceKeys = []) {
    const keys = normalizeKeySet(evidenceKeys);

    const choiceQuestions = [
      {
        number: 3,
        field: 'ind_3_pilihan',
        parentKey: 'ind_3',
        scores: { a: 0.25, b: 0.50, c: 0.75, d: 1.00 },
        infer: row => {
          const value = Number(row.ind_3_jumlah);
          if (!Number.isFinite(value)) return null;
          if (value >= 1 && value < 5) return 'a';
          if (value >= 6 && value <= 11) return 'b';
          if (value >= 12 && value <= 35) return 'c';
          if (value >= 36 && value <= 48) return 'd';
          return null;
        }
      },
      {
        number: 27,
        field: 'ind_27_pilihan',
        parentKey: 'ind_27',
        scores: { a: 0, b: 0.25, c: 0.75, d: 1.00 },
        infer: row => {
          const value = Number(row.ind_27_jumlah);
          if (!Number.isFinite(value)) return null;
          if (value >= 1 && value <= 4) return 'b';
          if (value >= 5 && value <= 8) return 'c';
          if (value >= 9) return 'd';
          return null;
        }
      },
      {
        number: 41,
        field: 'ind_41_pilihan',
        parentKey: 'ind_41',
        scores: { a: 1.00, b: 0.75, c: 0.50, d: 0.25 },
        infer: row => {
          const value = String(row.ind_41_nilai || '').trim().toUpperCase();
          if (['A', 'AA', 'A-AA'].includes(value)) return 'a';
          if (['B', 'BB', 'B-BB'].includes(value)) return 'b';
          if (['C', 'CC', 'C-CC'].includes(value)) return 'c';
          if (['D', 'DD', 'D-DD'].includes(value)) return 'd';
          return null;
        }
      }
    ];

    const ratioQuestions = {
      28: 1, 29: 1, 31: 1, 32: 1, 34: 1, 35: 1,
      36: 0.5, 37: 0.5, 39: 0.5, 40: 0.5
    };

    const baseKeys = new Set(keys);
    for (const question of choiceQuestions) {
      baseKeys.delete(question.parentKey);
      for (const option of Object.keys(question.scores)) baseKeys.delete(`${question.parentKey}${option}`);
    }
    for (const number of Object.keys(ratioQuestions)) {
      const parent = `ind_${number}`;
      baseKeys.delete(parent);
      baseKeys.delete(`${parent}a`);
      baseKeys.delete(`${parent}b`);
    }
    for (const key of ['ind_30', 'ind_30a', 'ind_30b']) baseKeys.delete(key);

    const result = scoreFromEvidence('B', baseKeys);
    let extraTotal = 0;

    for (const question of choiceQuestions) {
      let selected = String(data[question.field] || '').trim().toLowerCase();
      if (!Object.prototype.hasOwnProperty.call(question.scores, selected)) selected = question.infer(data);
      const evidenceKey = selected ? `${question.parentKey}${selected}` : null;
      const hasSelectedEvidence = Boolean(evidenceKey && (keys.has(evidenceKey) || keys.has(question.parentKey)));
      const score = hasSelectedEvidence && Object.prototype.hasOwnProperty.call(question.scores, selected)
        ? Number(question.scores[selected])
        : 0;
      extraTotal += score;
      result.details[question.parentKey] = {
        score,
        max: 1,
        hasEvidence: hasSelectedEvidence,
        selectedOption: selected || null,
        evidenceKey
      };
    }

    for (const [numberText, maxScore] of Object.entries(ratioQuestions)) {
      const parent = `ind_${numberText}`;
      const hasSupportingEvidence = hasEvidence(keys, parent, `${parent}a`);
      const hasRatioInput = hasAnyInput(data, [`${parent}a_jumlah`, `${parent}b_jumlah`]);
      const calculated = hasSupportingEvidence
        ? (hasRatioInput
          ? ratioScore(data[`${parent}a_jumlah`], data[`${parent}b_jumlah`], Number(maxScore))
          : { score: Number(maxScore), percentage: null })
        : { score: 0, percentage: null };
      extraTotal += calculated.score;
      result.details[parent] = {
        score: calculated.score,
        max: Number(maxScore),
        hasEvidence: hasSupportingEvidence,
        percentage: calculated.percentage,
        scoringBasis: 'persentase pembilang/penyebut sesuai rubrik Excel'
      };
    }

    const classification = String(data.ind_30_klasifikasi || '').trim().toLowerCase();
    const classificationScores = { swasembada: 1, swakarya: 0.75, swakarsa: 0.75, swadaya: 0.5 };
    const hasB30Evidence = hasEvidence(keys, 'ind_30', 'ind_30a');
    const scoreB30 = hasB30Evidence
      ? (Object.prototype.hasOwnProperty.call(classificationScores, classification) ? classificationScores[classification] : 1)
      : 0;
    extraTotal += scoreB30;
    result.details.ind_30 = {
      score: scoreB30,
      max: 1,
      hasEvidence: hasB30Evidence,
      selectedClassification: classification || null,
      scoringBasis: 'klasifikasi tertinggi sesuai rubrik Excel'
    };

    result.totalScore = Math.round(Math.min(result.totalScore + extraTotal, result.maxScore) * 100) / 100;
    result.percentage = Math.round((result.totalScore / result.maxScore) * 10000) / 100;
    return result;
  }

  static calculateAspectC(_data = {}, evidenceKeys = []) {
    return scoreFromEvidence('C', evidenceKeys);
  }

  static calculateAspectD(data = {}, evidenceKeys = []) {
    const keys = normalizeKeySet(evidenceKeys);
    const baseKeys = new Set(keys);
    for (const key of ['ind_1', 'ind_1a', 'ind_1b', 'ind_2', 'ind_3', 'ind_3a', 'ind_3b', 'ind_3c', 'ind_3d', 'ind_4', 'ind_4a', 'ind_4b']) {
      baseKeys.delete(key);
    }
    const result = scoreFromEvidence('D', baseKeys);

    const hasLegacyD1 = keys.has('ind_1');
    const scoreD1 = hasLegacyD1
      ? 5
      : (keys.has('ind_1a') ? 3 : 0) + (keys.has('ind_1b') ? 2 : 0);
    result.details.ind_1 = { score: scoreD1, max: 5, hasEvidence: scoreD1 > 0 };

    const hasD2Evidence = keys.has('ind_2');
    const innovationCount = numberValue(data.ind_2_jumlah);
    const scoreD2 = hasD2Evidence
      ? (innovationCount === null ? 7 : (innovationCount > 1 ? 7 : (innovationCount === 1 ? 3 : 0)))
      : 0;
    result.details.ind_2 = {
      score: scoreD2,
      max: 7,
      hasEvidence: hasD2Evidence,
      count: innovationCount,
      scoringBasis: 'jumlah inovasi sesuai rubrik Excel'
    };

    const optionScores = { a: 1.5, b: 2, c: 2.5, d: 3 };
    let selected = String(data.ind_3_pilihan || '').trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(optionScores, selected)) {
      const value = Number(data.ind_3_jumlah);
      if (value >= 1 && value <= 5) selected = 'a';
      else if (value >= 6 && value <= 10) selected = 'b';
      else if (value >= 11 && value <= 15) selected = 'c';
      else if (value > 15) selected = 'd';
    }
    const evidenceKey = selected ? `ind_3${selected}` : null;
    const hasD3Evidence = Boolean(evidenceKey && (keys.has(evidenceKey) || keys.has('ind_3')));
    const scoreD3 = hasD3Evidence && Object.prototype.hasOwnProperty.call(optionScores, selected)
      ? optionScores[selected]
      : 0;
    result.details.ind_3 = { score: scoreD3, max: 3, hasEvidence: hasD3Evidence, selectedOption: selected || null, evidenceKey };

    const d4aFields = [
      ['ind_4a_nasional', 1.5],
      ['ind_4a_provinsi', 1],
      ['ind_4a_kabupaten', 0.75]
    ];
    const d4bFields = [
      ['ind_4b_nasional', 1],
      ['ind_4b_provinsi', 0.75]
    ];
    const hasLegacyD4 = keys.has('ind_4');
    const hasD4aEvidence = hasLegacyD4 || keys.has('ind_4a');
    const hasD4bEvidence = hasLegacyD4 || keys.has('ind_4b');
    const scoreD4a = hasD4aEvidence
      ? (hasAnyInput(data, d4aFields.map(([field]) => field)) ? positiveScore(data, d4aFields) : 3.25)
      : 0;
    const scoreD4b = hasD4bEvidence
      ? (hasAnyInput(data, d4bFields.map(([field]) => field)) ? positiveScore(data, d4bFields) : 1.75)
      : 0;
    const scoreD4 = Math.round(Math.min(scoreD4a + scoreD4b, 5) * 100) / 100;
    result.details.ind_4 = {
      score: scoreD4,
      max: 5,
      hasEvidence: scoreD4 > 0,
      scoringBasis: 'tingkat prestasi sesuai rubrik Excel'
    };

    result.totalScore = Math.round(Math.min(result.totalScore + scoreD1 + scoreD2 + scoreD3 + scoreD4, result.maxScore) * 100) / 100;
    result.percentage = Math.round((result.totalScore / result.maxScore) * 10000) / 100;
    return result;
  }

  static calculateAspectE(_data = {}, evidenceKeys = []) {
    return scoreFromEvidence('E', evidenceKeys);
  }

  static calculateAspectF(_data = {}, evidenceKeys = []) {
    return scoreFromEvidence('F', evidenceKeys);
  }

  static calculateTotalScore(aspectA, aspectB, aspectC, aspectD, aspectE, aspectF) {
    const aspects = { A: aspectA, B: aspectB, C: aspectC, D: aspectD, E: aspectE, F: aspectF };
    const totalScore = Object.values(aspects)
      .reduce((sum, aspect) => sum + Number(aspect && aspect.totalScore ? aspect.totalScore : 0), 0);
    const roundedTotal = Math.round(Math.min(totalScore, TOTAL_MAX_SCORE) * 100) / 100;
    const percentage = Math.round((roundedTotal / TOTAL_MAX_SCORE) * 10000) / 100;

    let category;
    let categoryColor;
    if (percentage >= 90) {
      category = 'Sangat Baik';
      categoryColor = '#28a745';
    } else if (percentage >= 75) {
      category = 'Baik';
      categoryColor = '#17a2b8';
    } else if (percentage >= 60) {
      category = 'Cukup';
      categoryColor = '#ffc107';
    } else if (percentage >= 40) {
      category = 'Kurang';
      categoryColor = '#fd7e14';
    } else {
      category = 'Sangat Kurang';
      categoryColor = '#dc3545';
    }

    return {
      totalScore: roundedTotal,
      maxScore: TOTAL_MAX_SCORE,
      percentage,
      category,
      categoryColor,
      scoringBasis: 'Bukti dukung aktif sesuai standar workbook 2026',
      aspects
    };
  }

  static calculateRanking(allScores) {
    const sorted = [...(allScores || [])].sort((a, b) => Number(b.totalScore || 0) - Number(a.totalScore || 0));
    sorted.forEach((item, index) => { item.ranking = index + 1; });
    return sorted;
  }

  static getStandards() {
    return INSTRUMENT_STANDARDS;
  }
}

module.exports = ScoringSystem;

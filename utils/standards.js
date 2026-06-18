'use strict';

/**
 * Standar nilai resmi berdasarkan workbook
 * "1. KECAMATAN WADO (ADMIN)__SINERGITAS - TINGKAT KAB. SUMEDANG 2026.xlsx".
 *
 * Rumus workbook memberi nilai standar saat bukti dukung berstatus SUDAH.
 * Aplikasi menerjemahkannya menjadi satu bukti aktif per key indikator.
 */

const INSTRUMENT_STANDARDS = Object.freeze({
  A: Object.freeze({
    code: 'A',
    name: 'Pelayanan Publik',
    maxScore: 30,
    evidenceWeights: Object.freeze({
      ind_1: 2,
      ind_2a: 1, ind_2b: 0.5, ind_2c: 0.5,
      ind_3: 2.5,
      ind_4: 2,
      ind_5a: 1, ind_5b: 1,
      ind_6: 2.5,
      ind_7: 2.5,
      ind_8: 1.5,
      ind_9a: 0.25, ind_9b: 0.5, ind_9c: 0.25, ind_9d: 0.25, ind_9e: 0.25,
      ind_10a: 0.5, ind_10b: 0.5, ind_10c: 0.5, ind_10d: 0.5,
      ind_10e: 0.5, ind_10f: 0.5, ind_10g: 0.5,
      ind_11: 1.5,
      ind_12a: 0.5, ind_12b: 0.5,
      ind_13: 1,
      ind_14a: 0.5, ind_14b: 0.5, ind_14c: 0.5,
      ind_15: 1.5,
      ind_16: 1.5
    }),
    legacyAliases: Object.freeze({
      ind_2: ['ind_2a', 'ind_2b', 'ind_2c'],
      ind_5: ['ind_5a', 'ind_5b'],
      ind_9: ['ind_9a', 'ind_9b', 'ind_9c', 'ind_9d', 'ind_9e'],
      ind_10: ['ind_10a', 'ind_10b', 'ind_10c', 'ind_10d', 'ind_10e', 'ind_10f', 'ind_10g'],
      ind_12: ['ind_12a', 'ind_12b'],
      ind_14: ['ind_14a', 'ind_14b', 'ind_14c']
    })
  }),
  B: Object.freeze({
    code: 'B',
    name: 'Koordinasi Penyelenggaraan Pemerintahan',
    maxScore: 30,
    evidenceWeights: Object.freeze({
      ind_1: 0.5, ind_2: 0.5, ind_3: 1,
      ind_4a: 0.25, ind_4b: 0.25, ind_5: 0.5, ind_6: 0.5,
      ind_7a: 0.25, ind_7b: 0.25, ind_8a: 0.25, ind_8b: 0.25,
      ind_9a: 0.25, ind_9b: 0.25,
      ind_10a: 0.5, ind_10b: 0.25, ind_10c: 0.25,
      ind_11a: 0.25, ind_11b: 0.25,
      ind_12a: 0.25, ind_12b: 0.25,
      ind_13a: 0.25, ind_13b: 0.25,
      ind_14a: 0.2, ind_14b: 0.2, ind_14c: 0.1,
      ind_15a: 0.2, ind_15b: 0.1, ind_15c: 0.1, ind_15d: 0.1,
      ind_16a1: 0.5, ind_16a2: 0.25, ind_16a3: 0.25,
      ind_16b1: 0.5, ind_16b2: 0.25, ind_16b3: 0.25,
      ind_17: 0.5,
      ind_18a: 0.25, ind_18b: 0.25,
      ind_19a: 0.25, ind_19b: 0.25,
      ind_20a: 0.1, ind_20b: 0.1, ind_20c: 0.1, ind_20d: 0.1, ind_20e: 0.1,
      ind_21: 1, ind_22: 0.5,
      ind_23a: 0.25, ind_23b: 0.25,
      ind_24a: 0.25, ind_24b: 0.25,
      ind_25a: 0.25, ind_25b: 0.25,
      ind_26a: 0.3, ind_26b: 0.3, ind_26c: 0.1,
      ind_26d: 0.1, ind_26e: 0.1, ind_26f: 0.1,
      ind_27: 1,
      ind_28: 1, ind_29: 1, ind_30: 1, ind_31: 1, ind_32: 1,
      ind_33a: 0.2, ind_33b: 0.1, ind_33c: 0.1, ind_33d: 0.1, ind_33e: 0.5, ind_33f: 0,
      ind_34: 1, ind_35: 1, ind_36: 0.5, ind_37: 0.5,
      ind_38a: 0.5, ind_38b: 0,
      ind_39: 0.5, ind_40: 0.5,
      ind_41: 1, ind_42: 0.5,
      ind_43a: 0.1, ind_43b: 0.1, ind_43c: 0.1, ind_43d: 0.1, ind_43e: 0.1
    }),
    completionAliases: Object.freeze({
      ind_28: ['ind_28a', 'ind_28b'],
      ind_29: ['ind_29a', 'ind_29b'],
      ind_30: ['ind_30a', 'ind_30b'],
      ind_31: ['ind_31a', 'ind_31b'],
      ind_32: ['ind_32a', 'ind_32b'],
      ind_34: ['ind_34a', 'ind_34b'],
      ind_35: ['ind_35a', 'ind_35b'],
      ind_36: ['ind_36a', 'ind_36b'],
      ind_37: ['ind_37a', 'ind_37b'],
      ind_39: ['ind_39a', 'ind_39b'],
      ind_40: ['ind_40a', 'ind_40b']
    })
  }),
  C: Object.freeze({
    code: 'C',
    name: 'Pengelolaan Anggaran Kecamatan',
    maxScore: 5,
    evidenceWeights: Object.freeze({
      ind_1: 1, ind_2: 1, ind_3: 0.5, ind_4: 0.5, ind_5: 1, ind_6: 1
    })
  }),
  D: Object.freeze({
    code: 'D',
    name: 'Inovasi Kecamatan dan Upaya yang Dilakukan Kecamatan',
    maxScore: 20,
    evidenceWeights: Object.freeze({ ind_1: 5, ind_2: 7, ind_3: 3, ind_4: 5 })
  }),
  E: Object.freeze({
    code: 'E',
    name: 'Kompetensi Sumber Daya Manusia Kecamatan',
    maxScore: 5,
    evidenceWeights: Object.freeze({ ind_1: 1, ind_2: 1, ind_3: 1, ind_4: 1, ind_5: 1 })
  }),
  F: Object.freeze({
    code: 'F',
    name: 'Keberadaan Data Dukung Lainnya',
    maxScore: 10,
    evidenceWeights: Object.freeze(
      Object.fromEntries(Array.from({ length: 40 }, (_, index) => [`ind_${index + 1}`, 0.25]))
    )
  })
});

const TOTAL_MAX_SCORE = Object.values(INSTRUMENT_STANDARDS)
  .reduce((sum, item) => sum + item.maxScore, 0);

function normalizeInstrumentCode(value) {
  const code = String(value || '').trim().toUpperCase();
  if (!INSTRUMENT_STANDARDS[code]) throw new Error(`Instrumen ${value} tidak dikenal.`);
  return code;
}

function getInstrumentStandard(value) {
  return INSTRUMENT_STANDARDS[normalizeInstrumentCode(value)];
}

function normalizeEvidenceKeys(value) {
  if (value instanceof Set) return new Set([...value].map(item => String(item).trim().toLowerCase()));
  if (Array.isArray(value)) return new Set(value.map(item => String(item).trim().toLowerCase()));
  if (value && typeof value === 'object') {
    return new Set(Object.keys(value).filter(key => value[key]).map(key => String(key).trim().toLowerCase()));
  }
  return new Set();
}

function expandLegacyAliases(standard, evidenceKeys) {
  const expanded = new Set(evidenceKeys);
  for (const [legacyKey, mappedKeys] of Object.entries(standard.legacyAliases || {})) {
    if (expanded.has(legacyKey)) mappedKeys.forEach(key => expanded.add(key));
  }
  for (const [summaryKey, requiredKeys] of Object.entries(standard.completionAliases || {})) {
    if (requiredKeys.every(key => expanded.has(key))) expanded.add(summaryKey);
  }
  return expanded;
}


function expandEvidenceKeys(instrument, evidenceKeys) {
  const standard = getInstrumentStandard(instrument);
  return expandLegacyAliases(standard, normalizeEvidenceKeys(evidenceKeys));
}

function scoreFromEvidence(instrument, evidenceKeys) {
  const standard = getInstrumentStandard(instrument);
  const normalized = expandEvidenceKeys(instrument, evidenceKeys);
  const details = {};
  let totalScore = 0;

  for (const [key, max] of Object.entries(standard.evidenceWeights)) {
    const hasEvidence = normalized.has(key);
    const score = hasEvidence ? Number(max) : 0;
    totalScore += score;
    details[key] = { score, max: Number(max), hasEvidence };
  }

  totalScore = Math.round(Math.min(totalScore, standard.maxScore) * 100) / 100;
  return {
    aspect: standard.code,
    name: standard.name,
    totalScore,
    maxScore: standard.maxScore,
    percentage: standard.maxScore > 0
      ? Math.round((totalScore / standard.maxScore) * 10000) / 100
      : 0,
    details
  };
}

function validateStandards() {
  for (const standard of Object.values(INSTRUMENT_STANDARDS)) {
    const total = Object.values(standard.evidenceWeights).reduce((sum, value) => sum + Number(value), 0);
    if (Math.abs(total - standard.maxScore) > 0.000001) {
      throw new Error(`Jumlah bobot Instrumen ${standard.code} ${total} tidak sama dengan maksimum ${standard.maxScore}.`);
    }
  }
  if (Math.abs(TOTAL_MAX_SCORE - 100) > 0.000001) {
    throw new Error(`Skor maksimum keseluruhan harus 100, saat ini ${TOTAL_MAX_SCORE}.`);
  }
  return true;
}

validateStandards();

module.exports = {
  INSTRUMENT_STANDARDS,
  TOTAL_MAX_SCORE,
  getInstrumentStandard,
  normalizeEvidenceKeys,
  expandEvidenceKeys,
  scoreFromEvidence,
  validateStandards
};

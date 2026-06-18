'use strict';

const ScoringSystem = require('./scoring');

const CODES = ['a', 'b', 'c', 'd', 'e', 'f'];

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row || null)));
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(Array.isArray(rows) ? rows : [])));
  });
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (error, result) => (error ? reject(error) : resolve(result || {})));
  });
}

function indicatorKeyFromLegacyField(fieldName) {
  return String(fieldName || '').replace(/_file$/i, '').toLowerCase();
}

function collectLegacyAEvidence(row) {
  const keys = new Set();
  for (const [field, value] of Object.entries(row || {})) {
    if (field.endsWith('_file') && String(value || '').trim()) {
      keys.add(indicatorKeyFromLegacyField(field));
    }
  }
  return keys;
}

async function loadEvidenceMap(db, kecamatanId, aspectA) {
  const rows = await dbAll(
    db,
    'SELECT instrument, indicator_key FROM assessment_files WHERE kecamatan_id = ?',
    [kecamatanId]
  );
  const map = new Map(CODES.map(code => [code, new Set()]));
  for (const row of rows) {
    const code = String(row.instrument || '').toLowerCase();
    if (!map.has(code)) map.set(code, new Set());
    map.get(code).add(String(row.indicator_key || '').trim().toLowerCase());
  }
  for (const key of collectLegacyAEvidence(aspectA)) map.get('a').add(key);
  return map;
}

function calculate(rows, evidence) {
  const aspects = {
    A: ScoringSystem.calculateAspectA(rows.a || {}, evidence.get('a') || new Set()),
    B: ScoringSystem.calculateAspectB(rows.b || {}, evidence.get('b') || new Set()),
    C: ScoringSystem.calculateAspectC(rows.c || {}, evidence.get('c') || new Set()),
    D: ScoringSystem.calculateAspectD(rows.d || {}, evidence.get('d') || new Set()),
    E: ScoringSystem.calculateAspectE(rows.e || {}, evidence.get('e') || new Set()),
    F: ScoringSystem.calculateAspectF(rows.f || {}, evidence.get('f') || new Set())
  };
  const total = ScoringSystem.calculateTotalScore(
    aspects.A, aspects.B, aspects.C, aspects.D, aspects.E, aspects.F
  );
  return { aspects, total };
}

async function synchronizeKecamatanScore(db, kecamatanId) {
  const resultRows = await Promise.all(CODES.map(code => dbGet(
    db,
    `SELECT * FROM aspect_${code} WHERE kecamatan_id = ?`,
    [kecamatanId]
  )));
  const rows = Object.fromEntries(CODES.map((code, index) => [code, resultRows[index] || {}]));
  const evidence = await loadEvidenceMap(db, kecamatanId, rows.a);
  const scoring = calculate(rows, evidence);

  await Promise.all(CODES.map(code => dbRun(
    db,
    `UPDATE aspect_${code} SET total_score = ? WHERE kecamatan_id = ?`,
    [scoring.aspects[code.toUpperCase()].totalScore, kecamatanId]
  )));

  const finalRow = await dbGet(db, 'SELECT kecamatan_id FROM evaluation_results WHERE kecamatan_id = ?', [kecamatanId]);
  if (finalRow) {
    const total = scoring.total;
    await dbRun(
      db,
      `UPDATE evaluation_results
       SET score_a = ?, score_b = ?, score_c = ?, score_d = ?, score_e = ?, score_f = ?,
           total_score = ?, max_score = ?, percentage = ?, category = ?, score_snapshot = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE kecamatan_id = ?`,
      [
        scoring.aspects.A.totalScore,
        scoring.aspects.B.totalScore,
        scoring.aspects.C.totalScore,
        scoring.aspects.D.totalScore,
        scoring.aspects.E.totalScore,
        scoring.aspects.F.totalScore,
        total.totalScore,
        total.maxScore,
        total.percentage,
        total.category,
        JSON.stringify(total),
        kecamatanId
      ]
    );
  }

  return scoring.total;
}

async function synchronizeAllScores(db) {
  const kecamatans = await dbAll(db, "SELECT id FROM kecamatan WHERE username != ? ORDER BY id", ['admin']);
  for (const kecamatan of kecamatans) {
    await synchronizeKecamatanScore(db, Number(kecamatan.id));
  }
  return { synchronized: kecamatans.length };
}

module.exports = {
  collectLegacyAEvidence,
  synchronizeKecamatanScore,
  synchronizeAllScores
};

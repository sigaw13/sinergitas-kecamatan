'use strict';

const db = require('../database/database');
const { synchronizeAllScores } = require('../utils/score-sync');

async function closeDatabase() {
  if (db.pool && typeof db.pool.end === 'function') {
    await db.pool.end();
    return;
  }
  if (typeof db.close === 'function') {
    await new Promise(resolve => db.close(() => resolve()));
  }
}

async function main() {
  if (db.ready) await db.ready;
  const result = await synchronizeAllScores(db);
  console.log(`✅ Skor ${result.synchronized} kecamatan diselaraskan dengan workbook resmi 2026.`);
}

main()
  .catch(error => {
    console.error('❌ Sinkronisasi skor gagal:', error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);

'use strict';

const assert = require('assert');
const path = require('path');
const ejs = require('ejs');
const questions = require('../data/evaluation-questions.json');
const { INSTRUMENTS } = require('../utils/progress');
const { getInstrumentStandard } = require('../utils/standards');

async function main() {
  const viewDirectory = path.join(__dirname, '..', 'views', 'assessment');
  for (const code of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const definition = questions[code];
    assert(definition && Array.isArray(definition.questions), `Konfigurasi Instrumen ${code} tidak tersedia.`);
    for (const question of definition.questions) {
      assert(Array.isArray(question.evidence) && question.evidence.length > 0, `Instrumen ${code} Pertanyaan ${question.number} tidak memiliki upload data.`);
    }
    const evidenceKeys = definition.questions.flatMap(question => question.evidence.map(item => String(item.key)));
    assert.strictEqual(new Set(evidenceKeys).size, evidenceKeys.length, `Instrumen ${code} memiliki kunci upload duplikat.`);

    const key = code.toLowerCase();
    const html = await ejs.renderFile(path.join(viewDirectory, `aspect-${key}.ejs`), {
      data: {}, uploadedFiles: [], missingEvidenceKeys: [], saved: false,
      saveResult: null, kecamatan_id: 1, isAdmin: false,
      kecamatan: 'Kecamatan Pengujian', username: 'pengujian', evaluationLocked: false,
      progress: {
        instrument: code, percent: 0,
        dataFilled: 0, dataTotal: INSTRUMENTS[key].fields.length,
        evidenceFilled: 0, evidenceTotal: INSTRUMENTS[key].evidenceKeys.length
      },
      standard: getInstrumentStandard(code), questionDefinitions: definition.questions
    });
    const renderedKeys = [...html.matchAll(/name="([^"]+)_file"/g)].map(match => match[1]);
    assert.strictEqual(renderedKeys.length, INSTRUMENTS[key].evidenceKeys.length, `Instrumen ${code} tidak merender seluruh slot upload aktif.`);
    assert(renderedKeys.length >= definition.questions.length, `Instrumen ${code} harus memiliki sedikitnya satu upload untuk setiap pertanyaan.`);
    assert.strictEqual(new Set(renderedKeys).size, renderedKeys.length, `Instrumen ${code} memiliki nama upload duplikat.`);
  }
  console.log('✅ Seluruh pertanyaan Instrumen A sampai F memiliki area upload data.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

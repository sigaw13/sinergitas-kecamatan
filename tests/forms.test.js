'use strict';

const assert = require('assert');
const path = require('path');
const ejs = require('ejs');
const { INSTRUMENTS } = require('../utils/progress');
const { getInstrumentStandard } = require('../utils/standards');
const evaluationQuestions = require('../data/evaluation-questions.json');

const viewDirectory = path.join(__dirname, '..', 'views', 'assessment');
const baseLocals = {
  data: {}, uploadedFiles: [], missingEvidenceKeys: [], saved: false,
  saveResult: null, kecamatan_id: 1, isAdmin: false,
  kecamatan: 'Kecamatan Pengujian', username: 'pengujian', evaluationLocked: false
};

async function main() {
  for (const code of ['a', 'b', 'c', 'd', 'e', 'f']) {
    const definition = INSTRUMENTS[code];
    const progress = {
      instrument: definition.key,
      percent: 0,
      dataFilled: 0,
      dataTotal: definition.fields.length,
      evidenceFilled: 0,
      evidenceTotal: definition.evidenceKeys.length
    };
    const html = await ejs.renderFile(
      path.join(viewDirectory, `aspect-${code}.ejs`),
      { ...baseLocals, progress, standard: getInstrumentStandard(code), questionDefinitions: evaluationQuestions[code.toUpperCase()].questions }
    );
    const names = [...html.matchAll(/\bname="([^"]+)"/g)]
      .map(match => match[1])
      .filter(name => name !== 'viewport');
    const dataNames = new Set(names.filter(name => !name.endsWith('_file') && name !== 'save_action'));
    const fileNames = names.filter(name => name.endsWith('_file'));

    assert.deepStrictEqual(
      definition.fields.filter(field => !dataNames.has(field)),
      [],
      `Instrumen ${definition.key}: ada field data yang tidak dirender`
    );
    assert.strictEqual(
      fileNames.length,
      definition.evidenceKeys.length,
      `Instrumen ${definition.key}: jumlah input bukti tidak sesuai`
    );
  }

  const bHtml = await ejs.renderFile(
    path.join(viewDirectory, 'aspect-b.ejs'),
    {
      ...baseLocals,
      progress: { instrument: 'B', percent: 0, dataFilled: 0, dataTotal: 0, evidenceFilled: 0, evidenceTotal: 0 },
      standard: getInstrumentStandard('B'), questionDefinitions: evaluationQuestions.B.questions
    }
  );
  for (const label of ['A - AA', 'B - BB', 'C - CC', 'D - DD']) {
    assert(bHtml.includes(label), `Kelompok nilai SAKIP tidak ditemukan ${label}`);
  }
  assert(bHtml.includes('name="ind_3_pilihan"'), 'Pertanyaan 3 harus menggunakan pilihan tunggal.');
  assert(!bHtml.includes('name="ind_3_jumlah"'), 'Pertanyaan 3 tidak boleh memakai input angka.');
  for (const number of [3, 27, 41]) {
    assert(bHtml.includes(`name="ind_${number}_pilihan"`), `Pilihan Pertanyaan ${number} tidak ditemukan`);
    for (const letter of ['a','b','c','d']) {
      const key = `ind_${number}${letter}_file`;
      assert(bHtml.includes(`name="${key}"`), `Upload pilihan Pertanyaan ${number} tidak ditemukan ${key}`);
    }
  }
  assert(bHtml.includes('name="ind_43c_komentar"'), 'Pertanyaan 43.c harus menggunakan komentar atau uraian.');
  assert(bHtml.includes('name="ind_43a_jumlah"') && bHtml.includes('name="ind_43b_jumlah"') && bHtml.includes('name="ind_43d_jumlah"'), 'Pertanyaan 43.a, 43.b, dan 43.d harus menyediakan jumlah dokumen.');
  for (const key of ['ind_26a_file','ind_26b_file','ind_26c_file','ind_26d_file','ind_26e_file','ind_26f_file']) {
    assert(bHtml.includes(`name=\"${key}\"`), `Slot upload Pertanyaan 26 tidak ditemukan: ${key}`);
  }

  const dHtml = await ejs.renderFile(
    path.join(viewDirectory, 'aspect-d.ejs'),
    {
      ...baseLocals,
      progress: { instrument: 'D', percent: 0, dataFilled: 0, dataTotal: INSTRUMENTS.d.fields.length, evidenceFilled: 0, evidenceTotal: 6 },
      standard: getInstrumentStandard('D'), questionDefinitions: evaluationQuestions.D.questions
    }
  );
  assert(dHtml.includes('name="ind_3_pilihan"'), 'Instrumen D nomor 3 harus menggunakan pilihan tunggal.');
  for (const key of ['ind_3a_file','ind_3b_file','ind_3c_file','ind_3d_file']) {
    assert(dHtml.includes(`name="${key}"`), `Upload pilihan Instrumen D nomor 3 tidak ditemukan ${key}`);
  }
  for (const forbidden of ['Data lama mencatat', 'Isi ulang jumlah', 'Jenis jawaban:', 'Kategori aktif', 'Belum dapat dihitung']) {
    assert(!bHtml.includes(forbidden), `Instrumen B tidak boleh menampilkan keterangan tambahan ${forbidden}`);
    assert(!dHtml.includes(forbidden), `Instrumen D tidak boleh menampilkan keterangan tambahan ${forbidden}`);
  }

  const allHtml = await Promise.all(['a','b','c','d','e','f'].map(code => ejs.renderFile(
    path.join(viewDirectory, `aspect-${code}.ejs`),
    {
      ...baseLocals,
      progress: { instrument: code.toUpperCase(), percent: 0, dataFilled: 0, dataTotal: 0, evidenceFilled: 0, evidenceTotal: 0 },
      standard: getInstrumentStandard(code), questionDefinitions: evaluationQuestions[code.toUpperCase()].questions
    }
  )));
  const combined = allHtml.join('\n');
  for (const code of ['A','B','C','D','E','F']) {
    assert(combined.includes(`Standar nilai resmi Instrumen ${code}`), `Panel standar nilai Instrumen ${code} tidak dirender`);
  }
  for (const fullTerm of [
    'Sistem Pemerintahan Berbasis Elektronik (SPBE)',
    'Sistem Akuntabilitas Kinerja Instansi Pemerintah (SAKIP)',
    'Sumber Daya Manusia',
    'Usaha Mikro, Kecil, dan Menengah (UMKM)',
    'Pemberdayaan dan Kesejahteraan Keluarga (PKK)'
  ]) {
    assert(combined.includes(fullTerm), `Istilah lengkap tidak ditemukan: ${fullTerm}`);
  }

  console.log('✅ Semua pengujian form dan keterangan istilah lulus.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

/**
 * SISTEM SCORING PENILAIAN SINERGITAS KINERJA KECAMATAN
 * Kabupaten Sumedang - TA 2025
 * Total Skor Maksimal: 137.50
 */

class ScoringSystem {
  
  // ============================================
  // ASPEK A: PELAYANAN PUBLIK (Maks: 25 poin)
  // ============================================
  static calculateAspectA(data) {
    let score = 0;
    const details = {};

    // Indikator 1: Kelengkapan Data Monografi (2 poin)
    if (data.ind_1_status === 'ada') {
      score += 2;
      details.ind_1 = { score: 2, max: 2, note: 'Data monografi lengkap' };
    } else {
      details.ind_1 = { score: 0, max: 2, note: 'Data monografi tidak lengkap' };
    }

    // Indikator 2: Struktur Organisasi (3 poin)
    let ind2Score = 0;
    if (data.ind_2a_status === 'ada') ind2Score += 1;
    if (data.ind_2b_status === 'ada') ind2Score += 1;
    if (data.ind_2c_status === 'ada') ind2Score += 1;
    score += ind2Score;
    details.ind_2 = { score: ind2Score, max: 3 };

    // Indikator 3: Perbup Pendelegasian Kewenangan (2 poin)
    if (data.ind_3_status === 'ada') {
      score += 2;
      details.ind_3 = { score: 2, max: 2 };
    } else {
      details.ind_3 = { score: 0, max: 2 };
    }

    // Indikator 4: Perizinan NonUsaha (2 poin)
    const ind4Max = 2;
    const ind4Score = Math.min(data.ind_4_jumlah || 0, 5) * 0.4;
    score += ind4Score;
    details.ind_4 = { score: ind4Score, max: ind4Max, value: data.ind_4_jumlah };

    // Indikator 5: Kewenangan Dilimpahkan (2 poin)
    const ind5Total = (data.ind_5a_jumlah || 0) + (data.ind_5b_jumlah || 0);
    const ind5Score = Math.min(ind5Total, 10) * 0.2;
    score += ind5Score;
    details.ind_5 = { score: ind5Score, max: 2 };

    // Indikator 6: Tim Pelimpahan Kewenangan (1 poin)
    if (data.ind_6_status === 'ada') {
      score += 1;
      details.ind_6 = { score: 1, max: 1 };
    } else {
      details.ind_6 = { score: 0, max: 1 };
    }

    // Indikator 7: Pelaporan Pelimpahan (1 poin)
    const ind7Score = Math.min(data.ind_7_jumlah || 0, 4) * 0.25;
    score += ind7Score;
    details.ind_7 = { score: ind7Score, max: 1 };

    // Indikator 8: Simpul Pelayanan Terpadu (1 poin)
    if (data.ind_8_status === 'ada') {
      score += 1;
      details.ind_8 = { score: 1, max: 1 };
    } else {
      details.ind_8 = { score: 0, max: 1 };
    }

    // Indikator 9: Pelaksana Teknis Pelayanan (2 poin)
    let ind9Count = 0;
    ['ind_9a_status', 'ind_9b_status', 'ind_9c_status', 'ind_9d_status', 'ind_9e_status'].forEach(key => {
      if (data[key] === 'ada') ind9Count++;
    });
    const ind9Score = (ind9Count / 5) * 2;
    score += ind9Score;
    details.ind_9 = { score: ind9Score, max: 2, count: ind9Count };

    // Indikator 10: Informasi Pelayanan Publik (2 poin)
    let ind10Count = 0;
    ['ind_10a_status', 'ind_10b_status', 'ind_10c_status', 'ind_10d_status', 
     'ind_10e_status', 'ind_10f_status', 'ind_10g_status'].forEach(key => {
      if (data[key] === 'ada') ind10Count++;
    });
    const ind10Score = (ind10Count / 7) * 2;
    score += ind10Score;
    details.ind_10 = { score: ind10Score, max: 2, count: ind10Count };

    // Indikator 11: Kepuasan Masyarakat (2 poin)
    const satisfactionScores = {
      'Sangat Baik': 2,
      'Baik': 1.5,
      'Kurang Baik': 1,
      'Tidak Baik': 0.5,
      'Tidak Ada Data': 0
    };
    const ind11Score = satisfactionScores[data.ind_11_status] || 0;
    score += ind11Score;
    details.ind_11 = { score: ind11Score, max: 2, status: data.ind_11_status };

    // Indikator 12: Pengaduan Masyarakat (2 poin)
    const ind12Total = (data.ind_12a_jumlah || 0) + (data.ind_12b_jumlah || 0);
    const ind12Percentage = ind12Total > 0 ? (data.ind_12a_jumlah / ind12Total) * 100 : 0;
    let ind12Score = 0;
    if (ind12Percentage >= 76) ind12Score = 2;
    else if (ind12Percentage >= 51) ind12Score = 1.5;
    else if (ind12Percentage >= 26) ind12Score = 1;
    else ind12Score = 0.5;
    score += ind12Score;
    details.ind_12 = { score: ind12Score, max: 2, percentage: ind12Percentage };

    // Indikator 13: Kependudukan dan Capil (1 poin)
    if (data.ind_13_status === 'ada') {
      score += 1;
      details.ind_13 = { score: 1, max: 1 };
    } else {
      details.ind_13 = { score: 0, max: 1 };
    }

    // Indikator 14: SPBE (2 poin)
    let ind14Count = 0;
    ['ind_14a_status', 'ind_14b_status', 'ind_14c_status'].forEach(key => {
      if (data[key] === 'ada') ind14Count++;
    });
    const ind14Score = (ind14Count / 3) * 2;
    score += ind14Score;
    details.ind_14 = { score: ind14Score, max: 2, count: ind14Count };

    // Indikator 15: Target NIB (1 poin)
    const ind15Score = Math.min((data.ind_15_persen || 0) / 100, 1);
    score += ind15Score;
    details.ind_15 = { score: ind15Score, max: 1, percentage: data.ind_15_persen };

    // Indikator 16: Pungutan PBB (1 poin)
    const ind16Score = Math.min((data.ind_16_persen || 0) / 100, 1);
    score += ind16Score;
    details.ind_16 = { score: ind16Score, max: 1, percentage: data.ind_16_persen };

    return {
      aspect: 'A',
      name: 'Pelayanan Publik',
      totalScore: Math.round(score * 100) / 100,
      maxScore: 25,
      percentage: Math.round((score / 25) * 100 * 100) / 100,
      details
    };
  }

  // ============================================
  // ASPEK B: PENYELENGGARAAN PEMERINTAHAN (Maks: 50 poin)
  // ============================================
  static calculateAspectB(data) {
    let score = 0;
    const details = {};

    // Indikator 1: Peringatan Hari Besar Nasional (1 poin)
    const ind1Score = Math.min(data.ind_1_jumlah || 0, 5) * 0.2;
    score += ind1Score;
    details.ind_1 = { score: ind1Score, max: 1 };

    // Indikator 2: Dialog Kerukunan (1 poin)
    const ind2Score = Math.min(data.ind_2_jumlah || 0, 4) * 0.25;
    score += ind2Score;
    details.ind_2 = { score: ind2Score, max: 1 };

    // Indikator 3: Rapat Forkopimcam (2 poin)
    const ind3Jumlah = data.ind_3_jumlah || 0;
    let ind3Score = 0;
    if (ind3Jumlah >= 36) ind3Score = 2;
    else if (ind3Jumlah >= 12) ind3Score = 1.5;
    else if (ind3Jumlah >= 6) ind3Score = 1;
    else ind3Score = 0.5;
    score += ind3Score;
    details.ind_3 = { score: ind3Score, max: 2, value: ind3Jumlah };

    // Indikator 4: Koordinasi Penegakan Perundang-undangan (2 poin)
    const ind4Total = (data.ind_4a_jumlah || 0) + (data.ind_4b_jumlah || 0);
    const ind4Score = Math.min(ind4Total, 10) * 0.2;
    score += ind4Score;
    details.ind_4 = { score: ind4Score, max: 2 };

    // Indikator 5: Pertemuan Rutin Camat (2 poin)
    const ind5Percentage = data.ind_5_persen || 0;
    let ind5Score = 0;
    if (ind5Percentage >= 76) ind5Score = 2;
    else if (ind5Percentage >= 51) ind5Score = 1.5;
    else if (ind5Percentage >= 26) ind5Score = 1;
    else ind5Score = 0.5;
    score += ind5Score;
    details.ind_5 = { score: ind5Score, max: 2, percentage: ind5Percentage };

    // Indikator 6: Permasalahan Trantib (2 poin)
    const ind6Score = Math.min(data.ind_6_jumlah || 0, 10) * 0.2;
    score += ind6Score;
    details.ind_6 = { score: ind6Score, max: 2 };

    // Indikator 7: Koordinasi Trantibum (2 poin)
    const ind7Total = (data.ind_7a_jumlah || 0) + (data.ind_7b_jumlah || 0);
    const ind7Score = Math.min(ind7Total, 10) * 0.2;
    score += ind7Score;
    details.ind_7 = { score: ind7Score, max: 2 };

    // Indikator 8: Koordinasi Perencanaan (2 poin)
    const ind8Total = (data.ind_8a_jumlah || 0) + (data.ind_8b_jumlah || 0);
    const ind8Score = Math.min(ind8Total, 10) * 0.2;
    score += ind8Score;
    details.ind_8 = { score: ind8Score, max: 2 };

    // Indikator 9: Fasilitasi SPM (2 poin)
    const ind9Total = (data.ind_9a_jumlah || 0) + (data.ind_9b_jumlah || 0);
    const ind9Score = Math.min(ind9Total, 10) * 0.2;
    score += ind9Score;
    details.ind_9 = { score: ind9Score, max: 2 };

    // Indikator 10: Penanganan Kebencanaan (2 poin)
    let ind10Score = 0;
    if (data.ind_10a_status === 'sudah') ind10Score += 0.67;
    if (data.ind_10b_status === 'ada') ind10Score += 0.67;
    if (data.ind_10c_status === 'ada') ind10Score += 0.66;
    score += ind10Score;
    details.ind_10 = { score: ind10Score, max: 2 };

    // Indikator 11: Pelayanan Masyarakat (2 poin)
    const ind11Total = (data.ind_11a_jumlah || 0) + (data.ind_11b_jumlah || 0);
    const ind11Score = Math.min(ind11Total, 10) * 0.2;
    score += ind11Score;
    details.ind_11 = { score: ind11Score, max: 2 };

    // Indikator 12: Harmonisasi Tokoh Agama (2 poin)
    const ind12Total = (data.ind_12a_jumlah || 0) + (data.ind_12b_jumlah || 0);
    const ind12Score = Math.min(ind12Total, 10) * 0.2;
    score += ind12Score;
    details.ind_12 = { score: ind12Score, max: 2 };

    // Indikator 13: Koordinasi Sarana Prasarana (2 poin)
    const ind13Total = (data.ind_13a_jumlah || 0) + (data.ind_13b_jumlah || 0);
    const ind13Score = Math.min(ind13Total, 10) * 0.2;
    score += ind13Score;
    details.ind_13 = { score: ind13Score, max: 2 };

    // Indikator 14: Persentase Sarana Diperbaiki (2 poin)
    const ind14Total = (data.ind_14a_jumlah || 0) + (data.ind_14b_jumlah || 0) + (data.ind_14c_jumlah || 0);
    const ind14Percentage = ind14Total > 0 ? ((data.ind_14b_jumlah + data.ind_14c_jumlah) / ind14Total) * 100 : 0;
    let ind14Score = 0;
    if (ind14Percentage >= 76) ind14Score = 2;
    else if (ind14Percentage >= 51) ind14Score = 1.5;
    else if (ind14Percentage >= 26) ind14Score = 1;
    else ind14Score = 0.5;
    score += ind14Score;
    details.ind_14 = { score: ind14Score, max: 2, percentage: ind14Percentage };

    // Indikator 15: Pemberdayaan Masyarakat (3 poin)
    const ind15Total = (data.ind_15a_jumlah || 0) + (data.ind_15b_jumlah || 0) + 
                       (data.ind_15c_jumlah || 0) + (data.ind_15d_jumlah || 0);
    const ind15Score = Math.min(ind15Total, 15) * 0.2;
    score += ind15Score;
    details.ind_15 = { score: ind15Score, max: 3 };

    // Indikator 16: Fasilitasi Pemerintahan Desa (4 poin)
    const ind16Total = (data.ind_16a1_jumlah || 0) + (data.ind_16a2_jumlah || 0) + 
                       (data.ind_16a3_jumlah || 0) + (data.ind_16b1_jumlah || 0) + 
                       (data.ind_16b2_jumlah || 0) + (data.ind_16b3_jumlah || 0);
    const ind16Score = Math.min(ind16Total, 20) * 0.2;
    score += ind16Score;
    details.ind_16 = { score: ind16Score, max: 4 };

    // Indikator 17: Profil Desa (1 poin)
    const ind17Score = Math.min(data.ind_17_jumlah || 0, 5) * 0.2;
    score += ind17Score;
    details.ind_17 = { score: ind17Score, max: 1 };

    // Indikator 18: Pengelolaan Keuangan Desa (2 poin)
    const ind18Total = (data.ind_18a_jumlah || 0) + (data.ind_18b_jumlah || 0);
    const ind18Score = Math.min(ind18Total, 10) * 0.2;
    score += ind18Score;
    details.ind_18 = { score: ind18Score, max: 2 };

    // Indikator 19: Penegakan Perda (2 poin)
    const ind19Total = (data.ind_19a_jumlah || 0) + (data.ind_19b_jumlah || 0);
    const ind19Score = Math.min(ind19Total, 10) * 0.2;
    score += ind19Score;
    details.ind_19 = { score: ind19Score, max: 2 };

    // Indikator 20: Fasilitasi Kepala Desa (3 poin)
    const ind20Total = (data.ind_20a_jumlah || 0) + (data.ind_20b_jumlah || 0) + 
                       (data.ind_20c_jumlah || 0) + (data.ind_20d_jumlah || 0) + 
                       (data.ind_20e_jumlah || 0);
    const ind20Score = Math.min(ind20Total, 15) * 0.2;
    score += ind20Score;
    details.ind_20 = { score: ind20Score, max: 3 };

    // Indikator 21: Kawasan Perdesaan (1 poin)
    const ind21Score = Math.min(data.ind_21_jumlah || 0, 5) * 0.2;
    score += ind21Score;
    details.ind_21 = { score: ind21Score, max: 1 };

    // Indikator 22: Trantibum Desa (1 poin)
    const ind22Score = Math.min(data.ind_22_jumlah || 0, 5) * 0.2;
    score += ind22Score;
    details.ind_22 = { score: ind22Score, max: 1 };

    // Indikator 23: Lembaga Kemasyarakatan (2 poin)
    const ind23Total = (data.ind_23a_jumlah || 0) + (data.ind_23b_jumlah || 0);
    const ind23Score = Math.min(ind23Total, 10) * 0.2;
    score += ind23Score;
    details.ind_23 = { score: ind23Score, max: 2 };

    // Indikator 24: Perencanaan Partisipatif (2 poin)
    const ind24Total = (data.ind_24a_jumlah || 0) + (data.ind_24b_jumlah || 0);
    const ind24Score = Math.min(ind24Total, 10) * 0.2;
    score += ind24Score;
    details.ind_24 = { score: ind24Score, max: 2 };

    // Indikator 25: Kerja Sama Antardesa (2 poin)
    const ind25Total = (data.ind_25a_jumlah || 0) + (data.ind_25b_jumlah || 0);
    const ind25Score = Math.min(ind25Total, 10) * 0.2;
    score += ind25Score;
    details.ind_25 = { score: ind25Score, max: 2 };

    // Indikator 26: Pemberdayaan Masyarakat Desa (3 poin)
    let ind26Score = 0;
    ['ind_26a_status', 'ind_26b_jumlah', 'ind_26c_status', 'ind_26d_status', 
     'ind_26e_status', 'ind_26f_status'].forEach((key, idx) => {
      if (data[key] === 'ada' || data[key] > 0) ind26Score += 0.5;
    });
    score += ind26Score;
    details.ind_26 = { score: ind26Score, max: 3 };

    // Indikator 27: Koordinasi Perencanaan (2 poin)
    const ind27Jumlah = data.ind_27_jumlah || 0;
    let ind27Score = 0;
    if (ind27Jumlah >= 9) ind27Score = 2;
    else if (ind27Jumlah >= 5) ind27Score = 1.5;
    else if (ind27Jumlah >= 1) ind27Score = 1;
    else ind27Score = 0;
    score += ind27Score;
    details.ind_27 = { score: ind27Score, max: 2, value: ind27Jumlah };

    // Indikator 28: Batas Desa SIG (2 poin)
    const ind28Percentage = data.ind_28_persen || 0;
    let ind28Score = 0;
    if (ind28Percentage >= 76) ind28Score = 2;
    else if (ind28Percentage >= 51) ind28Score = 1.5;
    else if (ind28Percentage >= 26) ind28Score = 1;
    else ind28Score = 0.5;
    score += ind28Score;
    details.ind_28 = { score: ind28Score, max: 2, percentage: ind28Percentage };

    // Indikator 29: Update Prodeskel (2 poin)
    const ind29Percentage = data.ind_29_persen || 0;
    let ind29Score = 0;
    if (ind29Percentage >= 76) ind29Score = 2;
    else if (ind29Percentage >= 51) ind29Score = 1.5;
    else if (ind29Percentage >= 26) ind29Score = 1;
    else ind29Score = 0.5;
    score += ind29Score;
    details.ind_29 = { score: ind29Score, max: 2, percentage: ind29Percentage };

    // Indikator 30: Klasifikasi Desa (2 poin)
    const ind30Percentage = data.ind_30_persen || 0;
    let ind30Score = 0;
    if (ind30Percentage >= 76) ind30Score = 2;
    else if (ind30Percentage >= 51) ind30Score = 1.5;
    else if (ind30Percentage >= 26) ind30Score = 1;
    else ind30Score = 0.5;
    score += ind30Score;
    details.ind_30 = { score: ind30Score, max: 2, percentage: ind30Percentage };

    // Indikator 31: RPJMDesa/RKPDesa (2 poin)
    const ind31Percentage = data.ind_31_persen || 0;
    let ind31Score = 0;
    if (ind31Percentage >= 76) ind31Score = 2;
    else if (ind31Percentage >= 51) ind31Score = 1.5;
    else if (ind31Percentage >= 26) ind31Score = 1;
    else ind31Score = 0.5;
    score += ind31Score;
    details.ind_31 = { score: ind31Score, max: 2, percentage: ind31Percentage };

    // Indikator 32: APBDesa Tepat Waktu (2 poin)
    const ind32Percentage = data.ind_32_persen || 0;
    let ind32Score = 0;
    if (ind32Percentage >= 76) ind32Score = 2;
    else if (ind32Percentage >= 51) ind32Score = 1.5;
    else if (ind32Percentage >= 26) ind32Score = 1;
    else ind32Score = 0.5;
    score += ind32Score;
    details.ind_32 = { score: ind32Score, max: 2, percentage: ind32Percentage };

    // Indikator 33: BUMDes (2 poin)
    const ind33Total = (data.ind_33a_jumlah || 0) + (data.ind_33b_jumlah || 0) + 
                       (data.ind_33c_jumlah || 0) + (data.ind_33d_jumlah || 0) + 
                       (data.ind_33e_jumlah || 0) + (data.ind_33f_jumlah || 0);
    const ind33Score = Math.min(ind33Total, 10) * 0.2;
    score += ind33Score;
    details.ind_33 = { score: ind33Score, max: 2 };

    // Indikator 34: SISKEUDES (2 poin)
    const ind34Percentage = data.ind_34_persen || 0;
    let ind34Score = 0;
    if (ind34Percentage >= 76) ind34Score = 2;
    else if (ind34Percentage >= 51) ind34Score = 1.5;
    else if (ind34Percentage >= 26) ind34Score = 1;
    else ind34Score = 0.5;
    score += ind34Score;
    details.ind_34 = { score: ind34Score, max: 2, percentage: ind34Percentage };

    // Indikator 35: Website Desa (1 poin)
    const ind35Percentage = data.ind_35_persen || 0;
    let ind35Score = 0;
    if (ind35Percentage >= 76) ind35Score = 1;
    else if (ind35Percentage >= 51) ind35Score = 0.75;
    else if (ind35Percentage >= 26) ind35Score = 0.5;
    else ind35Score = 0.25;
    score += ind35Score;
    details.ind_35 = { score: ind35Score, max: 1, percentage: ind35Percentage };

    // Indikator 36: Pengembangan Aparatur (1 poin)
    const ind36Percentage = data.ind_36_persen || 0;
    let ind36Score = 0;
    if (ind36Percentage >= 76) ind36Score = 1;
    else if (ind36Percentage >= 51) ind36Score = 0.75;
    else if (ind36Percentage >= 26) ind36Score = 0.5;
    else ind36Score = 0.25;
    score += ind36Score;
    details.ind_36 = { score: ind36Score, max: 1, percentage: ind36Percentage };

    // Indikator 37: Evaluasi Diri (1 poin)
    const ind37Percentage = data.ind_37_persen || 0;
    let ind37Score = 0;
    if (ind37Percentage >= 76) ind37Score = 1;
    else if (ind37Percentage >= 51) ind37Score = 0.75;
    else if (ind37Percentage >= 26) ind37Score = 0.5;
    else ind37Score = 0.25;
    score += ind37Score;
    details.ind_37 = { score: ind37Score, max: 1, percentage: ind37Percentage };

    // Indikator 38: Kategori Desa (1 poin)
    const ind38Total = (data.ind_38a_jumlah || 0) + (data.ind_38b_jumlah || 0);
    const ind38Score = Math.min(ind38Total, 5) * 0.2;
    score += ind38Score;
    details.ind_38 = { score: ind38Score, max: 1 };

    // Indikator 39: Posyandu (1 poin)
    const ind39Percentage = data.ind_39_persen || 0;
    let ind39Score = 0;
    if (ind39Percentage >= 76) ind39Score = 1;
    else if (ind39Percentage >= 51) ind39Score = 0.75;
    else if (ind39Percentage >= 26) ind39Score = 0.5;
    else ind39Score = 0.25;
    score += ind39Score;
    details.ind_39 = { score: ind39Score, max: 1, percentage: ind39Percentage };

    // Indikator 40: Padat Karya Tunai (1 poin)
    const ind40Percentage = data.ind_40_persen || 0;
    let ind40Score = 0;
    if (ind40Percentage >= 76) ind40Score = 1;
    else if (ind40Percentage >= 51) ind40Score = 0.75;
    else if (ind40Percentage >= 26) ind40Score = 0.5;
    else ind40Score = 0.25;
    score += ind40Score;
    details.ind_40 = { score: ind40Score, max: 1, percentage: ind40Percentage };

    // Indikator 41: SAKIP (2 poin)
    const sakipScores = {
      'A': 2, 'AA': 2,
      'B': 1.5, 'BB': 1.5,
      'C': 1, 'CC': 1,
      'D': 0.5, 'DD': 0.5
    };
    const ind41Score = sakipScores[data.ind_41_nilai] || 0;
    score += ind41Score;
    details.ind_41 = { score: ind41Score, max: 2, nilai: data.ind_41_nilai };

    // Indikator 42: Inventarisasi Aset (1 poin)
    if (data.ind_42_status === 'ada') {
      score += 1;
      details.ind_42 = { score: 1, max: 1 };
    } else {
      details.ind_42 = { score: 0, max: 1 };
    }

    // Indikator 43: Kerjasama (2 poin)
    let ind43Score = 0;
    ['ind_43a_status', 'ind_43b_status', 'ind_43c_status', 'ind_43d_status', 'ind_43e_status'].forEach(key => {
      if (data[key] === 'ada' || data[key] === 'ya') ind43Score += 0.4;
    });
    score += ind43Score;
    details.ind_43 = { score: ind43Score, max: 2 };

    return {
      aspect: 'B',
      name: 'Penyelenggaraan Pemerintahan',
      totalScore: Math.round(score * 100) / 100,
      maxScore: 50,
      percentage: Math.round((score / 50) * 100 * 100) / 100,
      details
    };
  }

  // ============================================
  // ASPEK C: PENGELOLAAN ANGGARAN (Maks: 20 poin)
  // ============================================
  static calculateAspectC(data) {
    let score = 0;
    const details = {};

    // Indikator 1: Dokumen Perencanaan dan Anggaran (4 poin)
    let ind1Score = 0;
    if (data.ind_1a_status === 'ada') ind1Score += 1;
    if (data.ind_1b_status === 'ada') ind1Score += 1;
    if (data.ind_1c_status === 'ada') ind1Score += 1;
    if (data.ind_1d_status === 'ada') ind1Score += 1;
    score += ind1Score;
    details.ind_1 = { score: ind1Score, max: 4 };

    // Indikator 2: Kesesuaian Program (3 poin)
    const ind2Total = (data.ind_2a_program || 0) + (data.ind_2a_indikator || 0) + 
                      (data.ind_2b_program || 0) + (data.ind_2b_indikator || 0);
    const ind2Percentage = data.ind_2_persen || 0;
    let ind2Score = 0;
    if (ind2Percentage >= 76) ind2Score = 3;
    else if (ind2Percentage >= 51) ind2Score = 2.25;
    else if (ind2Percentage >= 26) ind2Score = 1.5;
    else ind2Score = 0.75;
    score += ind2Score;
    details.ind_2 = { score: ind2Score, max: 3, percentage: ind2Percentage };

    // Indikator 3: Persentase Anggaran per Kegiatan (4 poin)
    const ind3Values = [
      data.ind_3a_persen || 0, data.ind_3b_persen || 0, data.ind_3c_persen || 0,
      data.ind_3d_persen || 0, data.ind_3e_persen || 0, data.ind_3f_persen || 0
    ];
    const ind3Avg = ind3Values.reduce((a, b) => a + b, 0) / 6;
    let ind3Score = 0;
    if (ind3Avg >= 76) ind3Score = 4;
    else if (ind3Avg >= 51) ind3Score = 3;
    else if (ind3Avg >= 26) ind3Score = 2;
    else ind3Score = 1;
    score += ind3Score;
    details.ind_3 = { score: ind3Score, max: 4, average: ind3Avg };

    // Indikator 5: Bobot Pelaksanaan Kegiatan (5 poin)
    const ind5Values = [
      data.ind_5a_persen || 0, data.ind_5b_persen || 0, data.ind_5c_persen || 0,
      data.ind_5d_persen || 0, data.ind_5e_persen || 0, data.ind_5f_persen || 0,
      data.ind_5g_persen || 0
    ];
    const ind5Total = ind5Values.reduce((a, b) => a + b, 0);
    const ind5Score = Math.min(ind5Total / 100 * 5, 5);
    score += ind5Score;
    details.ind_5 = { score: ind5Score, max: 5, total: ind5Total };

    // Indikator 6: Realisasi Anggaran (4 poin)
    const ind6Percentage = data.ind_6_persen || 0;
    let ind6Score = 0;
    if (ind6Percentage >= 90) ind6Score = 4;
    else if (ind6Percentage >= 75) ind6Score = 3;
    else if (ind6Percentage >= 50) ind6Score = 2;
    else ind6Score = 1;
    score += ind6Score;
    details.ind_6 = { score: ind6Score, max: 4, percentage: ind6Percentage };

    return {
      aspect: 'C',
      name: 'Pengelolaan Anggaran',
      totalScore: Math.round(score * 100) / 100,
      maxScore: 20,
      percentage: Math.round((score / 20) * 100 * 100) / 100,
      details
    };
  }

  // ============================================
  // ASPEK D: INOVASI (Maks: 15 poin)
  // ============================================
  static calculateAspectD(data) {
    let score = 0;
    const details = {};

    // Indikator 1: Sistem Informasi (4 poin)
    let ind1Score = 0;
    if (data.ind_1a_nama) ind1Score += 2;
    if (data.ind_1b_nama) ind1Score += 2;
    score += ind1Score;
    details.ind_1 = { score: ind1Score, max: 4 };

    // Indikator 2: Inovasi Camat (4 poin)
    const ind2Total = (data.ind_2a_jumlah || 0) + (data.ind_2b_jumlah || 0);
    const ind2Score = Math.min(ind2Total, 4);
    score += ind2Score;
    details.ind_2 = { score: ind2Score, max: 4 };

    // Indikator 3: SK Camat (3 poin)
    const ind3Jumlah = data.ind_3_jumlah || 0;
    let ind3Score = 0;
    if (ind3Jumlah > 15) ind3Score = 3;
    else if (ind3Jumlah >= 11) ind3Score = 2.5;
    else if (ind3Jumlah >= 6) ind3Score = 2;
    else if (ind3Jumlah >= 1) ind3Score = 1;
    else ind3Score = 0;
    score += ind3Score;
    details.ind_3 = { score: ind3Score, max: 3, value: ind3Jumlah };

    // Indikator 4: Prestasi (4 poin)
    const ind4Total = (data.ind_4a_nasional || 0) + (data.ind_4a_provinsi || 0) + 
                      (data.ind_4a_kabupaten || 0) + (data.ind_4b_nasional || 0) + 
                      (data.ind_4b_provinsi || 0);
    const ind4Score = Math.min(ind4Total * 0.8, 4);
    score += ind4Score;
    details.ind_4 = { score: ind4Score, max: 4 };

    return {
      aspect: 'D',
      name: 'Inovasi Kecamatan',
      totalScore: Math.round(score * 100) / 100,
      maxScore: 15,
      percentage: Math.round((score / 15) * 100 * 100) / 100,
      details
    };
  }

  // ============================================
  // ASPEK E: SDM (Maks: 12.5 poin)
  // ============================================
  static calculateAspectE(data) {
    let score = 0;
    const details = {};

    // Indikator 1: Kualifikasi Pendidikan (5 poin)
    const totalSDM = (data.ind_1a_sd || 0) + (data.ind_1b_smp || 0) + (data.ind_1c_sma || 0) + 
                     (data.ind_1d_d3 || 0) + (data.ind_1e_s1 || 0) + (data.ind_1f_s2 || 0) + 
                     (data.ind_1g_s3 || 0);
    
    const educationScores = {
      'a': 0.5, // SD dan SMP terbanyak
      'b': 0.75, // SMA dan D3 terbanyak
      'c': 1, // Sarjana terbanyak
      'd': 2 // S2 dan S3 terbanyak
    };
    
    const ind1BaseScore = educationScores[data.ind_1_persen_tertinggi] || 0;
    const ind1Percentage = totalSDM > 0 ? ((data.ind_1e_s1 + data.ind_1f_s2 + data.ind_1g_s3) / totalSDM) * 100 : 0;
    const ind1Score = ind1BaseScore + (ind1Percentage / 100 * 4);
    score += ind1Score;
    details.ind_1 = { score: ind1Score, max: 5, percentage: ind1Percentage };

    // Indikator 2: Jumlah Pejabat (2.5 poin)
    const ind2Score = Math.min(data.ind_2_jumlah || 0, 5) * 0.5;
    score += ind2Score;
    details.ind_2 = { score: ind2Score, max: 2.5 };

    // Indikator 3: Diklat PIM (2 poin)
    const ind3Score = Math.min(data.ind_3_jumlah || 0, 4) * 0.5;
    score += ind3Score;
    details.ind_3 = { score: ind3Score, max: 2 };

    // Indikator 4: Diklat Teknis (2 poin)
    const ind4Score = Math.min(data.ind_4_jumlah || 0, 10) * 0.2;
    score += ind4Score;
    details.ind_4 = { score: ind4Score, max: 2 };

    // Indikator 5: Sosialisasi BerAKHLAK (1 poin)
    if (data.ind_5_status === 'ada') {
      score += 1;
      details.ind_5 = { score: 1, max: 1 };
    } else {
      details.ind_5 = { score: 0, max: 1 };
    }

    return {
      aspect: 'E',
      name: 'Kompetensi SDM',
      totalScore: Math.round(score * 100) / 100,
      maxScore: 12.5,
      percentage: Math.round((score / 12.5) * 100 * 100) / 100,
      details
    };
  }

  // ============================================
  // ASPEK F: DATA DUKUNG (Maks: 15 poin)
  // ============================================
  static calculateAspectF(data) {
    let score = 0;
    const details = {};

    // 40 indikator, masing-masing 0.375 poin
    const maxPerIndicator = 15 / 40; // 0.375 poin per indikator
    
    for (let i = 1; i <= 40; i++) {
      const key = `ind_${i}_status`;
      if (data[key] === 'ada') {
        score += maxPerIndicator;
      }
      details[`ind_${i}`] = { 
        score: data[key] === 'ada' ? maxPerIndicator : 0, 
        max: maxPerIndicator,
        status: data[key] || 'tidak'
      };
    }

    return {
      aspect: 'F',
      name: 'Data Dukung Lainnya',
      totalScore: Math.round(score * 100) / 100,
      maxScore: 15,
      percentage: Math.round((score / 15) * 100 * 100) / 100,
      details
    };
  }

  // ============================================
  // HITUNG TOTAL SKOR
  // ============================================
  static calculateTotalScore(aspectA, aspectB, aspectC, aspectD, aspectE, aspectF) {
    const totalScore = aspectA.totalScore + aspectB.totalScore + aspectC.totalScore + 
                       aspectD.totalScore + aspectE.totalScore + aspectF.totalScore;
    const maxTotal = 25 + 50 + 20 + 15 + 12.5 + 15; // 137.5
    
    // Kategori penilaian
    let category = '';
    let categoryColor = '';
    const percentage = (totalScore / maxTotal) * 100;
    
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
      totalScore: Math.round(totalScore * 100) / 100,
      maxScore: maxTotal,
      percentage: Math.round(percentage * 100) / 100,
      category,
      categoryColor,
      aspects: {
        A: aspectA,
        B: aspectB,
        C: aspectC,
        D: aspectD,
        E: aspectE,
        F: aspectF
      }
    };
  }

  // ============================================
  // HITUNG PERINGKAT
  // ============================================
  static calculateRanking(allScores) {
    // Sort berdasarkan total score descending
    const sorted = allScores.sort((a, b) => b.totalScore - a.totalScore);
    
    // Assign ranking
    sorted.forEach((item, index) => {
      item.ranking = index + 1;
    });
    
    return sorted;
  }
}

module.exports = ScoringSystem;
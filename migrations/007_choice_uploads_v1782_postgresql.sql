BEGIN;

ALTER TABLE aspect_b ADD COLUMN IF NOT EXISTS ind_3_pilihan TEXT;
ALTER TABLE aspect_b ADD COLUMN IF NOT EXISTS ind_27_pilihan TEXT;
ALTER TABLE aspect_b ADD COLUMN IF NOT EXISTS ind_41_pilihan TEXT;
ALTER TABLE aspect_d ADD COLUMN IF NOT EXISTS ind_3_pilihan TEXT;

UPDATE aspect_b AS ab
SET ind_3_pilihan = CASE
  WHEN ab.ind_3_jumlah >= 1 AND ab.ind_3_jumlah < 5 THEN 'a'
  WHEN ab.ind_3_jumlah BETWEEN 6 AND 11 THEN 'b'
  WHEN ab.ind_3_jumlah BETWEEN 12 AND 35 THEN 'c'
  WHEN ab.ind_3_jumlah BETWEEN 36 AND 48 THEN 'd'
  ELSE ab.ind_3_pilihan
END
WHERE NULLIF(TRIM(COALESCE(ab.ind_3_pilihan, '')), '') IS NULL
  AND EXISTS (
    SELECT 1 FROM assessment_files af
    WHERE af.kecamatan_id = ab.kecamatan_id AND UPPER(af.instrument) = 'B' AND af.indicator_key = 'ind_3'
  );

UPDATE aspect_b AS ab
SET ind_27_pilihan = CASE
  WHEN ab.ind_27_jumlah BETWEEN 1 AND 4 THEN 'b'
  WHEN ab.ind_27_jumlah BETWEEN 5 AND 8 THEN 'c'
  WHEN ab.ind_27_jumlah >= 9 THEN 'd'
  ELSE ab.ind_27_pilihan
END
WHERE NULLIF(TRIM(COALESCE(ab.ind_27_pilihan, '')), '') IS NULL
  AND EXISTS (
    SELECT 1 FROM assessment_files af
    WHERE af.kecamatan_id = ab.kecamatan_id AND UPPER(af.instrument) = 'B' AND af.indicator_key = 'ind_27'
  );

UPDATE aspect_b AS ab
SET ind_41_pilihan = CASE
  WHEN UPPER(TRIM(COALESCE(ab.ind_41_nilai, ''))) IN ('A', 'AA', 'A-AA') THEN 'a'
  WHEN UPPER(TRIM(COALESCE(ab.ind_41_nilai, ''))) IN ('B', 'BB', 'B-BB') THEN 'b'
  WHEN UPPER(TRIM(COALESCE(ab.ind_41_nilai, ''))) IN ('C', 'CC', 'C-CC') THEN 'c'
  WHEN UPPER(TRIM(COALESCE(ab.ind_41_nilai, ''))) IN ('D', 'DD', 'D-DD') THEN 'd'
  ELSE ab.ind_41_pilihan
END
WHERE NULLIF(TRIM(COALESCE(ab.ind_41_pilihan, '')), '') IS NULL
  AND EXISTS (
    SELECT 1 FROM assessment_files af
    WHERE af.kecamatan_id = ab.kecamatan_id AND UPPER(af.instrument) = 'B' AND af.indicator_key = 'ind_41'
  );

UPDATE assessment_files AS af
SET indicator_key = mapping.parent_key || mapping.selected_choice
FROM (
  SELECT kecamatan_id, 'ind_3' AS parent_key, ind_3_pilihan AS selected_choice FROM aspect_b
  UNION ALL
  SELECT kecamatan_id, 'ind_27', ind_27_pilihan FROM aspect_b
  UNION ALL
  SELECT kecamatan_id, 'ind_41', ind_41_pilihan FROM aspect_b
) AS mapping
WHERE af.kecamatan_id = mapping.kecamatan_id
  AND UPPER(af.instrument) = 'B'
  AND af.indicator_key = mapping.parent_key
  AND mapping.selected_choice IN ('a', 'b', 'c', 'd')
  AND NOT EXISTS (
    SELECT 1 FROM assessment_files AS existing
    WHERE existing.kecamatan_id = af.kecamatan_id
      AND UPPER(existing.instrument) = 'B'
      AND existing.indicator_key = mapping.parent_key || mapping.selected_choice
  );


UPDATE aspect_d AS ad
SET ind_3_pilihan = CASE
  WHEN ad.ind_3_jumlah BETWEEN 1 AND 5 THEN 'a'
  WHEN ad.ind_3_jumlah BETWEEN 6 AND 10 THEN 'b'
  WHEN ad.ind_3_jumlah BETWEEN 11 AND 15 THEN 'c'
  WHEN ad.ind_3_jumlah > 15 THEN 'd'
  ELSE ad.ind_3_pilihan
END
WHERE NULLIF(TRIM(COALESCE(ad.ind_3_pilihan, '')), '') IS NULL
  AND EXISTS (
    SELECT 1 FROM assessment_files af
    WHERE af.kecamatan_id = ad.kecamatan_id AND UPPER(af.instrument) = 'D' AND af.indicator_key = 'ind_3'
  );

UPDATE assessment_files AS af
SET indicator_key = 'ind_3' || ad.ind_3_pilihan
FROM aspect_d AS ad
WHERE af.kecamatan_id = ad.kecamatan_id
  AND UPPER(af.instrument) = 'D'
  AND af.indicator_key = 'ind_3'
  AND ad.ind_3_pilihan IN ('a', 'b', 'c', 'd')
  AND NOT EXISTS (
    SELECT 1 FROM assessment_files AS existing
    WHERE existing.kecamatan_id = af.kecamatan_id
      AND UPPER(existing.instrument) = 'D'
      AND existing.indicator_key = 'ind_3' || ad.ind_3_pilihan
  );

COMMIT;

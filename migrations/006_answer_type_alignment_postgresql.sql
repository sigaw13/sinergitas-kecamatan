BEGIN;

ALTER TABLE aspect_b ADD COLUMN IF NOT EXISTS ind_3_komentar TEXT;
ALTER TABLE aspect_b ADD COLUMN IF NOT EXISTS ind_5_jumlah INTEGER DEFAULT 0;
ALTER TABLE aspect_b ADD COLUMN IF NOT EXISTS ind_43a_jumlah INTEGER DEFAULT 0;
ALTER TABLE aspect_b ADD COLUMN IF NOT EXISTS ind_43b_jumlah INTEGER DEFAULT 0;
ALTER TABLE aspect_b ADD COLUMN IF NOT EXISTS ind_43c_komentar TEXT;
ALTER TABLE aspect_b ADD COLUMN IF NOT EXISTS ind_43d_jumlah INTEGER DEFAULT 0;

ALTER TABLE aspect_d ADD COLUMN IF NOT EXISTS ind_2_jumlah INTEGER DEFAULT 0;
ALTER TABLE aspect_d ADD COLUMN IF NOT EXISTS ind_4_detail TEXT;

-- Menyalin data lama secara aman tanpa menghapus kolom lama.
UPDATE aspect_d
SET ind_2_jumlah = GREATEST(COALESCE(ind_2a_jumlah, 0), COALESCE(ind_2b_jumlah, 0))
WHERE COALESCE(ind_2_jumlah, 0) = 0;

COMMIT;

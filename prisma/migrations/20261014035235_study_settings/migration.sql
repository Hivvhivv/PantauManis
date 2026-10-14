-- CreateTable
CREATE TABLE "study_settings" (
    "key" VARCHAR(64) NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_settings_pkey" PRIMARY KEY ("key")
);

-- Nilai default (PRD FR-S-04). Teks disclaimer/persetujuan diisi lewat Pengaturan Penelitian.
INSERT INTO "study_settings" ("key", "value") VALUES
  ('study_duration_days', '14'),
  ('posttest_grace_days', '3'),
  ('backfill_limit_days', '2'),
  ('timezone', 'Asia/Jakarta');

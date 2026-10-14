-- AlterTable
ALTER TABLE "respondents" ADD COLUMN     "day_one_date" DATE;

-- CreateTable
CREATE TABLE "beverage_types" (
    "id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "icon" VARCHAR(16) NOT NULL DEFAULT '🥤',
    "default_volume_ml" INTEGER NOT NULL,
    "sugar_g_per_serving" DOUBLE PRECISION NOT NULL,
    "sugar_level_applicable" BOOLEAN NOT NULL DEFAULT true,
    "source" VARCHAR(300),
    "needs_verification" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "beverage_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beverage_types_name_key" ON "beverage_types"("name");

-- Data awal 8 jenis minuman (PRD FR-R-02). NILAI CONTOH: wajib diganti peneliti dengan nilai
-- bersumber jelas sebelum pilot. Ditandai needs_verification = true.
INSERT INTO "beverage_types"
  ("id", "name", "icon", "default_volume_ml", "sugar_g_per_serving", "sugar_level_applicable", "source", "needs_verification", "sort_order", "updated_at")
VALUES
  (gen_random_uuid(), 'Teh manis',            '🍵', 250, 20, true,  'CONTOH – belum diverifikasi', true, 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Kopi susu',            '☕', 250, 25, true,  'CONTOH – belum diverifikasi', true, 2, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Boba / milk tea',      '🧋', 500, 40, true,  'CONTOH – belum diverifikasi', true, 3, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Minuman bersoda',      '🥤', 330, 35, false, 'CONTOH – belum diverifikasi', true, 4, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Jus kemasan',          '🧃', 250, 25, false, 'CONTOH – belum diverifikasi', true, 5, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Minuman energi',       '⚡', 250, 27, false, 'CONTOH – belum diverifikasi', true, 6, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Susu berperisa',       '🥛', 200, 18, false, 'CONTOH – belum diverifikasi', true, 7, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Lainnya',              '🍹', 250, 20, true,  'CONTOH – belum diverifikasi', true, 8, CURRENT_TIMESTAMP);
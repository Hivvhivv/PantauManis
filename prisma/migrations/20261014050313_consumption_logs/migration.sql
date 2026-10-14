-- CreateEnum
CREATE TYPE "sugar_level" AS ENUM ('normal', 'less', 'none');

-- CreateEnum
CREATE TYPE "day_status" AS ENUM ('filled', 'zero');

-- CreateTable
CREATE TABLE "consumption_logs" (
    "id" UUID NOT NULL,
    "respondent_id" UUID NOT NULL,
    "beverage_type_id" UUID NOT NULL,
    "volume_ml" INTEGER NOT NULL,
    "servings" INTEGER NOT NULL,
    "sugar_level" "sugar_level",
    "sugar_g_snapshot" DOUBLE PRECISION NOT NULL,
    "consumed_at" TIMESTAMPTZ(3) NOT NULL,
    "local_date" DATE NOT NULL,
    "study_day" INTEGER NOT NULL,
    "is_backfill" BOOLEAN NOT NULL DEFAULT false,
    "is_out_of_period" BOOLEAN NOT NULL DEFAULT false,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "consumption_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_status" (
    "id" UUID NOT NULL,
    "respondent_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "study_day" INTEGER NOT NULL,
    "status" "day_status" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "daily_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consumption_logs_respondent_id_local_date_idx" ON "consumption_logs"("respondent_id", "local_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_status_respondent_id_date_key" ON "daily_status"("respondent_id", "date");

-- AddForeignKey
ALTER TABLE "consumption_logs" ADD CONSTRAINT "consumption_logs_respondent_id_fkey" FOREIGN KEY ("respondent_id") REFERENCES "respondents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_logs" ADD CONSTRAINT "consumption_logs_beverage_type_id_fkey" FOREIGN KEY ("beverage_type_id") REFERENCES "beverage_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_status" ADD CONSTRAINT "daily_status_respondent_id_fkey" FOREIGN KEY ("respondent_id") REFERENCES "respondents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

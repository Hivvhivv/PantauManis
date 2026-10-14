-- CreateEnum
CREATE TYPE "goal_metric" AS ENUM ('drinks', 'sugar');

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "respondent_id" UUID NOT NULL,
    "metric" "goal_metric" NOT NULL,
    "target_value" DOUBLE PRECISION NOT NULL,
    "valid_from" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMPTZ(3),

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_respondent_id_valid_from_idx" ON "goals"("respondent_id", "valid_from");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_respondent_id_fkey" FOREIGN KEY ("respondent_id") REFERENCES "respondents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

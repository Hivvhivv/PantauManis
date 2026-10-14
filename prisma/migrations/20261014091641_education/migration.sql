-- CreateEnum
CREATE TYPE "material_status" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "education_materials" (
    "id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "summary" VARCHAR(300) NOT NULL,
    "body" TEXT NOT NULL,
    "icon" VARCHAR(16) NOT NULL DEFAULT '📘',
    "image_key" VARCHAR(200),
    "image_alt" VARCHAR(200),
    "video_url" VARCHAR(300),
    "source" VARCHAR(500),
    "unlock_day" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "material_status" NOT NULL DEFAULT 'draft',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "education_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_quiz_questions" (
    "id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "text" VARCHAR(500) NOT NULL,
    "options" JSONB NOT NULL,
    "correct_index" INTEGER NOT NULL,

    CONSTRAINT "education_quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_progress" (
    "id" UUID NOT NULL,
    "respondent_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "read_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "first_quiz_score" DOUBLE PRECISION,
    "last_quiz_score" DOUBLE PRECISION,
    "quiz_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_answers" JSONB,
    "last_quiz_at" TIMESTAMPTZ(3),

    CONSTRAINT "education_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "education_materials_status_sort_order_idx" ON "education_materials"("status", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "education_quiz_questions_material_id_order_key" ON "education_quiz_questions"("material_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "education_progress_respondent_id_material_id_key" ON "education_progress"("respondent_id", "material_id");

-- AddForeignKey
ALTER TABLE "education_quiz_questions" ADD CONSTRAINT "education_quiz_questions_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "education_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_progress" ADD CONSTRAINT "education_progress_respondent_id_fkey" FOREIGN KEY ("respondent_id") REFERENCES "respondents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_progress" ADD CONSTRAINT "education_progress_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "education_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

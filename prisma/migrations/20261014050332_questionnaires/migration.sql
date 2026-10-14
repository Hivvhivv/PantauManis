-- CreateEnum
CREATE TYPE "questionnaire_type" AS ENUM ('pretest', 'posttest');

-- CreateEnum
CREATE TYPE "question_type" AS ENUM ('likert', 'choice', 'text');

-- CreateEnum
CREATE TYPE "response_status" AS ENUM ('draft', 'submitted');

-- CreateTable
CREATE TABLE "questionnaires" (
    "id" UUID NOT NULL,
    "type" "questionnaire_type" NOT NULL,
    "version" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "intro" TEXT,
    "is_placeholder" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "questionnaire_id" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "type" "question_type" NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_responses" (
    "id" UUID NOT NULL,
    "respondent_id" UUID NOT NULL,
    "questionnaire_id" UUID NOT NULL,
    "status" "response_status" NOT NULL DEFAULT 'draft',
    "score" DOUBLE PRECISION,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "submitted_at" TIMESTAMPTZ(3),

    CONSTRAINT "questionnaire_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" UUID NOT NULL,
    "response_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "value" VARCHAR(2000) NOT NULL,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "questionnaires_type_version_key" ON "questionnaires"("type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "questions_questionnaire_id_order_key" ON "questions"("questionnaire_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_responses_respondent_id_questionnaire_id_key" ON "questionnaire_responses"("respondent_id", "questionnaire_id");

-- CreateIndex
CREATE UNIQUE INDEX "answers_response_id_question_id_key" ON "answers"("response_id", "question_id");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_respondent_id_fkey" FOREIGN KEY ("respondent_id") REFERENCES "respondents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "questionnaire_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Kuesioner CONTOH (is_placeholder = true). Instrumen final dimasukkan lewat migration baru
-- setelah disetujui peneliti/komite etik (PRD bagian 14, pertanyaan terbuka no. 3).
DO $$
DECLARE
  q_pre  uuid := gen_random_uuid();
  q_post uuid := gen_random_uuid();
  freq   jsonb := '[{"value":"0","label":"Tidak pernah","score":0},{"value":"1","label":"1–2 kali","score":1},{"value":"2","label":"3–4 kali","score":2},{"value":"3","label":"5–6 kali","score":3},{"value":"4","label":"Setiap hari","score":4}]';
  likert jsonb := '[{"value":"1","label":"Sangat tidak setuju","score":1},{"value":"2","label":"Tidak setuju","score":2},{"value":"3","label":"Netral","score":3},{"value":"4","label":"Setuju","score":4},{"value":"5","label":"Sangat setuju","score":5}]';
  qid uuid;
BEGIN
  INSERT INTO "questionnaires" ("id", "type", "version", "title", "intro", "is_placeholder")
  VALUES
    (q_pre,  'pretest',  1, 'Kuesioner Awal (CONTOH)',  'Tidak ada jawaban benar atau salah. Jawab sesuai kebiasaanmu.', true),
    (q_post, 'posttest', 1, 'Kuesioner Akhir (CONTOH)', 'Tidak ada jawaban benar atau salah. Jawab sesuai kebiasaanmu.', true);

  FOREACH qid IN ARRAY ARRAY[q_pre, q_post] LOOP
    INSERT INTO "questions" ("id", "questionnaire_id", "order", "text", "type", "options", "required") VALUES
      (gen_random_uuid(), qid, 1, 'CONTOH: Dalam 7 hari terakhir, berapa kali kamu minum minuman manis?', 'choice', freq, true),
      (gen_random_uuid(), qid, 2, 'CONTOH: Saya yakin bisa mengurangi minuman manis jika saya mau.', 'likert', likert, true),
      (gen_random_uuid(), qid, 3, 'CONTOH: Minuman manis apa yang paling sering kamu minum?', 'text', NULL, false);
  END LOOP;
END $$;
-- CreateEnum
CREATE TYPE "access_status" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "respondents" (
    "id" UUID NOT NULL,
    "respondent_code_label" VARCHAR(20) NOT NULL,
    "initials" VARCHAR(10),
    "access_code_hmac" CHAR(64) NOT NULL,
    "access_code_encrypted" TEXT NOT NULL,
    "access_status" "access_status" NOT NULL DEFAULT 'active',
    "consent_at" TIMESTAMPTZ(3),
    "start_date" DATE,
    "created_by" UUID,
    "notes" VARCHAR(2000),
    "last_active_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "respondents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respondent_sessions" (
    "id" UUID NOT NULL,
    "respondent_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "respondent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "respondents_respondent_code_label_key" ON "respondents"("respondent_code_label");

-- CreateIndex
CREATE UNIQUE INDEX "respondents_access_code_hmac_key" ON "respondents"("access_code_hmac");

-- CreateIndex
CREATE INDEX "respondents_deleted_at_access_status_idx" ON "respondents"("deleted_at", "access_status");

-- CreateIndex
CREATE UNIQUE INDEX "respondent_sessions_token_hash_key" ON "respondent_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "respondent_sessions_respondent_id_idx" ON "respondent_sessions"("respondent_id");

-- AddForeignKey
ALTER TABLE "respondents" ADD CONSTRAINT "respondents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respondent_sessions" ADD CONSTRAINT "respondent_sessions_respondent_id_fkey" FOREIGN KEY ("respondent_id") REFERENCES "respondents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

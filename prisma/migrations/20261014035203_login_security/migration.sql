-- CreateEnum
CREATE TYPE "login_kind" AS ENUM ('staff', 'code');

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "kind" "login_kind" NOT NULL,
    "ip" VARCHAR(64) NOT NULL,
    "email_hash" CHAR(64),
    "success" BOOLEAN NOT NULL,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_alerts" (
    "id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_by" UUID,
    "acknowledged_at" TIMESTAMPTZ(3),

    CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_attempts_kind_ip_created_at_idx" ON "login_attempts"("kind", "ip", "created_at");

-- CreateIndex
CREATE INDEX "login_attempts_kind_email_hash_created_at_idx" ON "login_attempts"("kind", "email_hash", "created_at");

-- CreateIndex
CREATE INDEX "login_attempts_kind_success_created_at_idx" ON "login_attempts"("kind", "success", "created_at");

-- CreateIndex
CREATE INDEX "security_alerts_type_created_at_idx" ON "security_alerts"("type", "created_at");

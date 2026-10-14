-- CreateEnum
CREATE TYPE "actor_type" AS ENUM ('staff', 'respondent', 'system');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_type" "actor_type" NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(64) NOT NULL,
    "target_type" VARCHAR(32),
    "target_id" UUID,
    "ip" VARCHAR(64),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_created_at_idx" ON "audit_logs"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- Log audit hanya bisa ditambah (PRD FR-S-03): tolak UPDATE dan DELETE di tingkat basis data.
CREATE FUNCTION "audit_logs_append_only"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs hanya bisa ditambah (append-only)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_logs_no_update_delete"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "audit_logs_append_only"();

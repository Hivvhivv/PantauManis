-- CreateEnum
CREATE TYPE "staff_role" AS ENUM ('superadmin', 'admin');

-- CreateTable
CREATE TABLE "staff_users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "staff_role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_sessions" (
    "id" UUID NOT NULL,
    "staff_user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "staff_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_email_key" ON "staff_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_sessions_token_hash_key" ON "staff_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "staff_sessions_staff_user_id_idx" ON "staff_sessions"("staff_user_id");

-- AddForeignKey
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

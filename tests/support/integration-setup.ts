import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/server/db";

// Kosongkan semua tabel kecuali study_settings sebelum setiap test.
// TRUNCATE tidak memicu trigger baris append-only pada audit_logs.
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "audit_logs", "login_attempts", "security_alerts", "respondent_sessions", "respondents", "staff_sessions", "staff_users" CASCADE',
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});

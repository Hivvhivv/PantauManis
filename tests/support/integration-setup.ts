import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/server/db";

// Kosongkan data uji sebelum setiap test. Data awal dari migration (study_settings, referensi
// minuman, kuesioner) dipertahankan; jenis minuman buatan test diberi awalan "UJI ".
// TRUNCATE tidak memicu trigger baris append-only pada audit_logs.
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "audit_logs", "login_attempts", "security_alerts", "respondent_sessions", "respondents", "staff_sessions", "staff_users", "education_materials" CASCADE',
  );
  await prisma.$executeRawUnsafe(`DELETE FROM "beverage_types" WHERE "name" LIKE 'UJI %'`);
});

afterAll(async () => {
  await prisma.$disconnect();
});

/**
 * Reset kata sandi Superadmin dari server (pengganti alur reset lewat email, ADR-003).
 *   npm run superadmin:reset-password -- --email email@contoh.id
 * Semua sesi akun dicabut; kata sandi sementara wajib diganti saat login berikutnya.
 */
import { hash } from "@node-rs/argon2";
import { temporaryPassword } from "../src/server/crypto/tokens";
import { arg, prismaFromEnv } from "./lib/cli";

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  if (!email) {
    console.error("Pemakaian: npm run superadmin:reset-password -- --email email@contoh.id");
    process.exit(1);
  }

  const prisma = prismaFromEnv();
  try {
    const user = await prisma.staffUser.findFirst({
      where: { email, role: "superadmin", deletedAt: null },
    });
    if (!user) {
      console.error("Superadmin dengan email tersebut tidak ditemukan.");
      process.exit(1);
    }
    const password = temporaryPassword();
    await prisma.$transaction([
      prisma.staffUser.update({
        where: { id: user.id },
        data: { passwordHash: await hash(password), mustChangePassword: true },
      }),
      prisma.staffSession.deleteMany({ where: { staffUserId: user.id } }),
      prisma.auditLog.create({
        data: {
          actorType: "system",
          action: "staff.password_reset",
          targetType: "staff_user",
          targetId: user.id,
          metadata: { via: "cli" },
        },
      }),
    ]);
    console.log(`Kata sandi ${email} di-reset.`);
    console.log(`Kata sandi sementara: ${password}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

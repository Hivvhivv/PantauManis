/**
 * Membuat akun Superadmin (dipakai untuk Superadmin pertama).
 *   npm run superadmin:create -- --name "Nama Lengkap" --email email@contoh.id
 * Kata sandi sementara dicetak sekali ke terminal dan wajib diganti saat login pertama.
 */
import { hash } from "@node-rs/argon2";
import { temporaryPassword } from "../src/server/crypto/tokens";
import { arg, prismaFromEnv } from "./lib/cli";

async function main() {
  const name = arg("name")?.trim();
  const email = arg("email")?.trim().toLowerCase();
  if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Pemakaian: npm run superadmin:create -- --name "Nama" --email email@contoh.id');
    process.exit(1);
  }

  const prisma = prismaFromEnv();
  try {
    if (await prisma.staffUser.findUnique({ where: { email } })) {
      console.error("Email sudah dipakai.");
      process.exit(1);
    }
    const password = temporaryPassword();
    const user = await prisma.staffUser.create({
      data: {
        name,
        email,
        role: "superadmin",
        passwordHash: await hash(password),
        mustChangePassword: true,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorType: "system",
        action: "staff.created",
        targetType: "staff_user",
        targetId: user.id,
        metadata: { role: "superadmin", via: "cli" },
      },
    });
    console.log(`Superadmin dibuat: ${email}`);
    console.log(`Kata sandi sementara: ${password}`);
    console.log("Simpan sekarang; kata sandi ini tidak akan ditampilkan lagi.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

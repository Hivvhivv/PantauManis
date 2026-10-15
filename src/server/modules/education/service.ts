import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import type { ReadyRespondent } from "@/server/auth/guards";
import { AppError, notFound, validationError } from "@/server/http/errors";
import { AuditAction, writeAudit, type Actor } from "@/server/modules/audit";
import { fromDbDate, localDateOf, studyDayOf } from "@/server/modules/study/days";
import { mediaStorage } from "@/server/storage";
import { detectImageType, MAX_IMAGE_BYTES } from "@/server/storage/media";
import { isUnlocked, quizMessage, scoreQuiz, youtubeEmbedUrl, youtubeId } from "./rules";
import type { MaterialInput } from "./schemas";

const imageUrl = (key: string | null) => (key ? mediaStorage().publicUrl(key) : null);

// ---------------- Admin ----------------

export async function listMaterialsAdmin() {
  const rows = await prisma.educationMaterial.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { questions: true, progress: true } } },
  });
  return rows.map((m) => ({
    id: m.id,
    title: m.title,
    icon: m.icon,
    status: m.status,
    unlockDay: m.unlockDay,
    sortOrder: m.sortOrder,
    questionCount: m._count.questions,
    readCount: m._count.progress,
    updatedAt: m.updatedAt,
  }));
}

export async function getMaterialAdmin(id: string) {
  const m = await prisma.educationMaterial.findFirst({
    where: { id, deletedAt: null },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!m) throw notFound("Materi tidak ditemukan.");
  return {
    ...m,
    imageUrl: imageUrl(m.imageKey),
    questions: m.questions.map((q) => ({
      text: q.text,
      options: q.options as string[],
      correctIndex: q.correctIndex,
    })),
  };
}

export async function createMaterial(input: MaterialInput, actor: Actor) {
  const last = await prisma.educationMaterial.aggregate({
    where: { deletedAt: null },
    _max: { sortOrder: true },
  });
  const { questions, ...data } = input;
  const m = await prisma.$transaction(async (tx) => {
    const created = await tx.educationMaterial.create({
      data: {
        ...data,
        sortOrder: (last._max.sortOrder ?? 0) + 1,
        createdById: actor.type === "staff" ? actor.id : null,
        questions: { create: questions.map((q, i) => ({ ...q, order: i + 1 })) },
      },
    });
    await writeAudit(
      {
        actor,
        action: AuditAction.MaterialCreated,
        targetType: "education_material",
        targetId: created.id,
        metadata: { status: created.status },
      },
      tx,
    );
    return created;
  });
  return { id: m.id };
}

export async function updateMaterial(id: string, input: MaterialInput, actor: Actor) {
  const before = await prisma.educationMaterial.findFirst({ where: { id, deletedAt: null } });
  if (!before) throw notFound("Materi tidak ditemukan.");
  const { questions, ...data } = input;
  await prisma.$transaction(async (tx) => {
    await tx.educationMaterial.update({ where: { id }, data });
    // Soal kuis diganti seluruhnya; jawaban lama responden tetap tersimpan di progres.
    await tx.educationQuizQuestion.deleteMany({ where: { materialId: id } });
    if (questions.length) {
      await tx.educationQuizQuestion.createMany({
        data: questions.map((q, i) => ({ ...q, order: i + 1, materialId: id })),
      });
    }
    await writeAudit(
      {
        actor,
        action: AuditAction.MaterialUpdated,
        targetType: "education_material",
        targetId: id,
        metadata: { statusBefore: before.status, statusAfter: input.status },
      },
      tx,
    );
  });
  // Gambar lama yang diganti/dihapus dibersihkan dari storage (gagal hapus tidak menggagalkan simpan).
  if (before.imageKey && before.imageKey !== input.imageKey) {
    await mediaStorage()
      .remove(before.imageKey)
      .catch(() => {});
  }
}

export async function deleteMaterial(id: string, actor: Actor) {
  const m = await prisma.educationMaterial.findFirst({ where: { id, deletedAt: null } });
  if (!m) throw notFound("Materi tidak ditemukan.");
  await prisma.$transaction(async (tx) => {
    await tx.educationMaterial.update({
      where: { id },
      data: { deletedAt: new Date(), status: "draft" },
    });
    await writeAudit(
      {
        actor,
        action: AuditAction.MaterialDeleted,
        targetType: "education_material",
        targetId: id,
      },
      tx,
    );
  });
}

/** Simpan urutan baru (hasil drag-and-drop). */
export async function reorderMaterials(ids: string[], actor: Actor) {
  const existing = await prisma.educationMaterial.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });
  const known = new Set(existing.map((e) => e.id));
  if (
    ids.length !== known.size ||
    ids.some((i) => !known.has(i)) ||
    new Set(ids).size !== ids.length
  ) {
    throw validationError({}, "Daftar urutan tidak lengkap. Muat ulang halaman lalu coba lagi.");
  }
  await prisma.$transaction(async (tx) => {
    for (const [i, id] of ids.entries()) {
      await tx.educationMaterial.update({ where: { id }, data: { sortOrder: i + 1 } });
    }
    await writeAudit(
      { actor, action: AuditAction.MaterialsReordered, metadata: { count: ids.length } },
      tx,
    );
  });
}

/** Unggah gambar: tipe dicek dari isi file, maksimal 5 MB, nama file acak. */
export async function uploadImage(file: File) {
  if (file.size === 0) throw validationError({ file: "Pilih file gambar." });
  if (file.size > MAX_IMAGE_BYTES) throw validationError({ file: "Ukuran gambar maksimal 5 MB." });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) throw validationError({ file: "Format gambar harus JPG, PNG, atau WebP." });
  const key = `edukasi/${randomUUID()}.${type.ext}`;
  try {
    await mediaStorage().put(key, bytes, type.contentType);
  } catch (e) {
    console.error("Unggah media gagal:", e instanceof Error ? e.message : "unknown");
    throw new AppError(502, "UPLOAD_FAILED", "Gambar gagal diunggah. Coba lagi nanti.");
  }
  return { key, url: mediaStorage().publicUrl(key) };
}

// ---------------- Responden ----------------

async function studyDay(r: ReadyRespondent, now: Date) {
  return studyDayOf(fromDbDate(r.dayOneDate), localDateOf(now));
}

/** Daftar materi terbit untuk responden, dengan status terkunci dan progres. */
export async function listMaterialsForRespondent(r: ReadyRespondent, now = new Date()) {
  const day = await studyDay(r, now);
  const rows = await prisma.educationMaterial.findMany({
    where: { status: "published", deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { questions: true } },
      progress: { where: { respondentId: r.id } },
    },
  });
  return rows.map((m) => ({
    id: m.id,
    title: m.title,
    summary: m.summary,
    icon: m.icon,
    imageUrl: imageUrl(m.imageKey),
    imageAlt: m.imageAlt,
    hasVideo: !!m.videoUrl,
    unlockDay: m.unlockDay,
    unlocked: isUnlocked(m.unlockDay, day),
    questionCount: m._count.questions,
    read: m.progress.length > 0,
    lastQuizScore: m.progress[0]?.lastQuizScore ?? null,
  }));
}

async function openMaterial(r: ReadyRespondent, id: string, now: Date) {
  const m = await prisma.educationMaterial.findFirst({
    where: { id, status: "published", deletedAt: null },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!m) throw notFound("Materi tidak ditemukan.");
  if (!isUnlocked(m.unlockDay, await studyDay(r, now))) {
    throw new AppError(403, "MATERIAL_LOCKED", `Materi ini terbuka mulai hari ke-${m.unlockDay}.`);
  }
  return m;
}

/** Buka materi: dicatat sebagai sudah dibaca (sekali, waktu pertama dibuka). Jawaban benar tidak dikirim. */
export async function readMaterial(r: ReadyRespondent, id: string, now = new Date()) {
  const m = await openMaterial(r, id, now);
  const progress = await prisma.educationProgress.upsert({
    where: { respondentId_materialId: { respondentId: r.id, materialId: id } },
    create: { respondentId: r.id, materialId: id, readAt: now },
    update: {},
  });
  const vid = m.videoUrl ? youtubeId(m.videoUrl) : null;
  return {
    id: m.id,
    title: m.title,
    summary: m.summary,
    body: m.body,
    icon: m.icon,
    imageUrl: imageUrl(m.imageKey),
    imageAlt: m.imageAlt,
    videoEmbedUrl: vid ? youtubeEmbedUrl(vid) : null,
    source: m.source,
    questions: m.questions.map((q) => ({ text: q.text, options: q.options as string[] })),
    progress: {
      quizAttempts: progress.quizAttempts,
      lastQuizScore: progress.lastQuizScore,
    },
  };
}

/** Kirim jawaban kuis; boleh diulang. Simpan skor pertama dan terakhir. */
export async function submitQuiz(
  r: ReadyRespondent,
  id: string,
  answers: number[],
  now = new Date(),
) {
  const m = await openMaterial(r, id, now);
  if (m.questions.length === 0) throw validationError({}, "Materi ini tidak memiliki kuis.");
  if (answers.length !== m.questions.length) {
    throw validationError({ answers: "Jawab semua pertanyaan terlebih dahulu." });
  }
  m.questions.forEach((q, i) => {
    if (answers[i]! >= (q.options as string[]).length)
      throw validationError({ answers: "Pilihan tidak valid." });
  });
  const { score, results } = scoreQuiz(
    m.questions.map((q) => q.correctIndex),
    answers,
  );
  const existing = await prisma.educationProgress.findUnique({
    where: { respondentId_materialId: { respondentId: r.id, materialId: id } },
  });
  await prisma.educationProgress.upsert({
    where: { respondentId_materialId: { respondentId: r.id, materialId: id } },
    create: {
      respondentId: r.id,
      materialId: id,
      readAt: now,
      firstQuizScore: score,
      lastQuizScore: score,
      quizAttempts: 1,
      lastAnswers: answers,
      lastQuizAt: now,
    },
    update: {
      firstQuizScore: existing?.firstQuizScore ?? score,
      lastQuizScore: score,
      quizAttempts: { increment: 1 },
      lastAnswers: answers,
      lastQuizAt: now,
    },
  });
  return {
    score,
    message: quizMessage(score),
    results: m.questions.map((q, i) => ({
      correct: results[i]!,
      correctIndex: q.correctIndex,
    })),
  };
}

/** Aktivitas edukasi satu responden (untuk "Lihat Hasil Responden"). */
export async function educationActivity(respondentId: string) {
  const rows = await prisma.educationProgress.findMany({
    where: { respondentId },
    include: { material: { select: { title: true } } },
    orderBy: { readAt: "asc" },
  });
  return rows.map((p) => ({
    title: p.material.title,
    readAt: p.readAt,
    quizAttempts: p.quizAttempts,
    firstQuizScore: p.firstQuizScore,
    lastQuizScore: p.lastQuizScore,
  }));
}

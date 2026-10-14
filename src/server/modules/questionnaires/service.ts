import "server-only";
import { prisma } from "@/server/db";
import { AppError, businessRule, validationError } from "@/server/http/errors";
import { fromDbDate, localDateOf, toDbDate } from "@/server/modules/study/days";
import { posttestState, posttestWindow } from "@/server/modules/study/posttest";
import { getStudySettings } from "@/server/modules/study/settings";
import type { QuestionnaireType, Respondent } from "@/generated/prisma/client";
import { scoreAnswers, validateAnswers, type QuestionDef, type QuestionOption } from "./scoring";

async function activeQuestionnaire(type: QuestionnaireType) {
  const q = await prisma.questionnaire.findFirst({
    where: { type, isActive: true },
    orderBy: { version: "desc" },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!q) throw new AppError(503, "QUESTIONNAIRE_UNAVAILABLE", "Kuesioner belum tersedia.");
  return q;
}

function toDefs(
  questions: { id: string; type: string; required: boolean; options: unknown }[],
): QuestionDef[] {
  return questions.map((q) => ({
    id: q.id,
    type: q.type as QuestionDef["type"],
    required: q.required,
    options: (q.options as QuestionOption[] | null) ?? null,
  }));
}

/** Kuesioner + jawaban milik responden ini (draf atau terkirim). */
export async function getQuestionnaireForRespondent(respondentId: string, type: QuestionnaireType) {
  const q = await activeQuestionnaire(type);
  const response = await prisma.questionnaireResponse.findUnique({
    where: { respondentId_questionnaireId: { respondentId, questionnaireId: q.id } },
    include: { answers: true },
  });
  return {
    id: q.id,
    title: q.title,
    intro: q.intro,
    isPlaceholder: q.isPlaceholder,
    questions: q.questions.map((x) => ({
      id: x.id,
      order: x.order,
      text: x.text,
      type: x.type,
      required: x.required,
      options:
        (x.options as QuestionOption[] | null)?.map(({ value, label }) => ({ value, label })) ??
        null,
    })),
    status: response?.status ?? null,
    submittedAt: response?.submittedAt ?? null,
    answers: Object.fromEntries((response?.answers ?? []).map((a) => [a.questionId, a.value])),
  };
}

/** Status posttest responden: belum dibuka / terbuka / ditutup / sudah dikirim (FR-R-07). */
export async function posttestInfo(r: Respondent, now = new Date()) {
  const settings = await getStudySettings();
  const submitted = await prisma.questionnaireResponse.findFirst({
    where: { respondentId: r.id, status: "submitted", questionnaire: { type: "posttest" } },
    select: { submittedAt: true },
  });
  if (!r.dayOneDate) {
    return { state: "not_yet" as const, opens: null, closes: null, submittedAt: null };
  }
  const dayOne = fromDbDate(r.dayOneDate);
  const { opens, closes } = posttestWindow(
    dayOne,
    settings.durationDays,
    settings.posttestGraceDays,
  );
  return {
    state: posttestState({
      dayOne,
      today: localDateOf(now),
      durationDays: settings.durationDays,
      graceDays: settings.posttestGraceDays,
      submitted: !!submitted,
    }),
    opens,
    closes,
    submittedAt: submitted?.submittedAt ?? null,
  };
}

async function assertMayAnswer(r: Respondent, type: QuestionnaireType, now: Date) {
  if (!r.consentAt) throw businessRule("CONSENT_REQUIRED", "Berikan persetujuan terlebih dahulu.");
  if (type === "posttest") {
    // Sudah dikirim → biarkan pemeriksaan ALREADY_SUBMITTED di bawah yang menolak.
    const { state } = await posttestInfo(r, now);
    if (state === "not_yet")
      throw businessRule("POSTTEST_NOT_OPEN", "Kuesioner akhir belum dibuka.");
    if (state === "closed") throw businessRule("POSTTEST_CLOSED", "Kuesioner akhir sudah ditutup.");
  }
}

/** Simpan draf (boleh belum lengkap). Ditolak bila sudah dikirim (BR-07). */
export async function saveDraft(
  r: Respondent,
  type: QuestionnaireType,
  answers: Record<string, string>,
  now = new Date(),
) {
  await assertMayAnswer(r, type, now);
  const q = await activeQuestionnaire(type);
  const errors = validateAnswers(toDefs(q.questions), answers, false);
  if (Object.keys(errors).length) throw validationError(errors);

  await prisma.$transaction(async (tx) => {
    const resp = await tx.questionnaireResponse.upsert({
      where: { respondentId_questionnaireId: { respondentId: r.id, questionnaireId: q.id } },
      create: { respondentId: r.id, questionnaireId: q.id },
      update: {},
    });
    if (resp.status === "submitted") {
      throw businessRule("ALREADY_SUBMITTED", "Kuesioner sudah dikirim dan tidak dapat diubah.");
    }
    for (const [questionId, raw] of Object.entries(answers)) {
      const value = raw.trim();
      const key = { responseId_questionId: { responseId: resp.id, questionId } };
      if (!value) await tx.answer.deleteMany({ where: { responseId: resp.id, questionId } });
      else
        await tx.answer.upsert({
          where: key,
          create: { responseId: resp.id, questionId, value },
          update: { value },
        });
    }
    await tx.questionnaireResponse.update({
      where: { id: resp.id },
      data: { updatedAt: new Date() },
    });
  });
}

/**
 * Kirim kuesioner: wajib lengkap, lalu terkunci. Untuk pretest, tanggal kirim (WIB)
 * menjadi hari ke-1 penelitian (BR-01).
 */
export async function submit(
  r: Respondent,
  type: QuestionnaireType,
  answers: Record<string, string>,
  now = new Date(),
) {
  await saveDraft(r, type, answers, now);
  const q = await activeQuestionnaire(type);
  const resp = await prisma.questionnaireResponse.findUniqueOrThrow({
    where: { respondentId_questionnaireId: { respondentId: r.id, questionnaireId: q.id } },
    include: { answers: true },
  });
  const all = Object.fromEntries(resp.answers.map((a) => [a.questionId, a.value]));
  const defs = toDefs(q.questions);
  const errors = validateAnswers(defs, all, true);
  if (Object.keys(errors).length)
    throw validationError(errors, "Masih ada pertanyaan yang belum dijawab.");

  await prisma.$transaction(async (tx) => {
    const updated = await tx.questionnaireResponse.updateMany({
      where: { id: resp.id, status: "draft" },
      data: { status: "submitted", submittedAt: now, score: scoreAnswers(defs, all) },
    });
    if (updated.count === 0) throw businessRule("ALREADY_SUBMITTED", "Kuesioner sudah dikirim.");
    if (type === "pretest") {
      await tx.respondent.update({
        where: { id: r.id },
        data: { dayOneDate: toDbDate(localDateOf(now)) },
      });
    }
  });
}

/** Persetujuan (informed consent). Hanya dicatat sekali. */
export async function giveConsent(r: Respondent, now = new Date()) {
  if (r.consentAt) return;
  await prisma.respondent.update({ where: { id: r.id }, data: { consentAt: now } });
}

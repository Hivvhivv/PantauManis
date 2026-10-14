import "server-only";
import ExcelJS from "exceljs";
import { prisma } from "@/server/db";
import { AuditAction, writeAudit, type Actor } from "@/server/modules/audit";
import type { QuestionOption } from "@/server/modules/questionnaires/scoring";
import { classifyStatus } from "@/server/modules/study/aggregate";
import { addDays, fromDbDate, localDateOf } from "@/server/modules/study/days";
import { completeness } from "@/server/modules/study/series";
import { getStudySettings } from "@/server/modules/study/settings";
import {
  bit,
  dailySummaryRows,
  isoWib,
  tableToCsv,
  type Cell,
  type Column,
  type Table,
} from "./build";

export const DATASETS = [
  "responden",
  "log_konsumsi",
  "ringkasan_harian",
  "kuesioner",
  "target",
  "edukasi",
] as const;
export type DatasetName = (typeof DATASETS)[number];

export const DATASET_TITLES: Record<DatasetName, string> = {
  responden: "Daftar responden",
  log_konsumsi: "Log konsumsi (satu baris per catatan)",
  ringkasan_harian: "Ringkasan harian (satu baris per responden per hari)",
  kuesioner: "Jawaban pretest & posttest (satu baris per responden)",
  target: "Riwayat target",
  edukasi: "Aktivitas edukasi",
};

const col = (key: string, description: string): Column => ({ key, header: key, description });

type Scope = { respondentId?: string };

/** Responden yang ikut ekspor: tidak dihapus (BR-11). */
async function respondents(scope: Scope) {
  return prisma.respondent.findMany({
    where: { deletedAt: null, ...(scope.respondentId ? { id: scope.respondentId } : {}) },
    orderBy: { label: "asc" },
    include: {
      responses: { include: { questionnaire: { select: { type: true } } } },
      goals: { orderBy: { validFrom: "asc" } },
    },
  });
}

type Resp = Awaited<ReturnType<typeof respondents>>[number];

async function buildRespondents(rs: Resp[], today: string, durationDays: number): Promise<Table> {
  const statuses = await prisma.dailyStatus.findMany({
    where: { respondentId: { in: rs.map((r) => r.id) } },
    select: { respondentId: true, date: true, status: true },
  });
  const by = new Map<string, { date: string; status: string }[]>();
  for (const s of statuses) {
    const list = by.get(s.respondentId) ?? [];
    list.push({ date: fromDbDate(s.date), status: s.status });
    by.set(s.respondentId, list);
  }
  const submitted = (r: Resp, type: "pretest" | "posttest") =>
    r.responses.find((x) => x.questionnaire.type === type && x.status === "submitted")
      ?.submittedAt ?? null;

  return {
    name: "responden",
    title: DATASET_TITLES.responden,
    columns: [
      col("id_responden", "ID Responden (label penelitian). Kode akses tidak pernah diekspor."),
      col("status_akses", "aktif / nonaktif"),
      col("status_penelitian", "belum_mulai / aktif / selesai / nonaktif"),
      col("dibuat_pada", "Waktu akun dibuat (ISO 8601, WIB)"),
      col("persetujuan_pada", "Waktu persetujuan (informed consent)"),
      col("hari_ke_1", "Tanggal hari ke-1 = tanggal pretest dikirim (WIB)"),
      col("pretest_dikirim_pada", "Waktu pretest dikirim"),
      col("posttest_dikirim_pada", "Waktu posttest dikirim"),
      col("hari_berjalan", `Hari periode yang sudah berjalan (maks. ${durationDays})`),
      col("hari_tercatat", "Hari berstatus terisi atau nol dalam periode"),
      col("hari_nol", "Hari berstatus nol (tidak minum minuman manis) dalam periode"),
      col("kelengkapan_persen", "hari_tercatat / hari_berjalan × 100"),
      col("target_metrik", "Target aktif: minuman (per hari) / gula_g (per hari)"),
      col("target_nilai", "Nilai target aktif"),
    ],
    rows: rs.map((r) => {
      const dayOne = r.dayOneDate ? fromDbDate(r.dayOneDate) : null;
      const st = by.get(r.id) ?? [];
      const comp = dayOne
        ? completeness({ dayOne, today, durationDays, statusDates: st.map((s) => s.date) })
        : null;
      // Hanya hari ke-1 s.d. min(hari ini, hari terakhir periode).
      const lastDay = dayOne ? [addDays(dayOne, durationDays - 1), today].sort()[0]! : null;
      const inPeriod = (d: string) => !!dayOne && d >= dayOne && d <= lastDay!;
      const active = r.goals.find((g) => !g.validTo);
      return {
        id_responden: r.label,
        status_akses: r.accessStatus === "active" ? "aktif" : "nonaktif",
        status_penelitian: {
          not_started: "belum_mulai",
          active: "aktif",
          done: "selesai",
          inactive: "nonaktif",
        }[
          classifyStatus({
            accessStatus: r.accessStatus,
            dayOne,
            posttestSubmitted: !!submitted(r, "posttest"),
          })
        ],
        dibuat_pada: isoWib(r.createdAt),
        persetujuan_pada: isoWib(r.consentAt),
        hari_ke_1: dayOne,
        pretest_dikirim_pada: isoWib(submitted(r, "pretest")),
        posttest_dikirim_pada: isoWib(submitted(r, "posttest")),
        hari_berjalan: comp?.elapsed ?? null,
        hari_tercatat: comp?.filled ?? null,
        hari_nol: dayOne ? st.filter((s) => s.status === "zero" && inPeriod(s.date)).length : null,
        kelengkapan_persen:
          comp && comp.elapsed ? Math.round((comp.filled / comp.elapsed) * 100) : null,
        target_metrik: active ? (active.metric === "drinks" ? "minuman" : "gula_g") : null,
        target_nilai: active?.targetValue ?? null,
      };
    }),
  };
}

async function buildLogs(rs: Resp[]): Promise<Table> {
  const label = new Map(rs.map((r) => [r.id, r.label]));
  const logs = await prisma.consumptionLog.findMany({
    where: { respondentId: { in: rs.map((r) => r.id) }, deletedAt: null },
    include: { beverageType: { select: { name: true } } },
    orderBy: [{ consumedAt: "asc" }],
  });
  return {
    name: "log_konsumsi",
    title: DATASET_TITLES.log_konsumsi,
    columns: [
      col("id_responden", "ID Responden"),
      col("id_catatan", "ID unik catatan"),
      col("tanggal", "Tanggal minum (WIB)"),
      col("hari_ke", "Hari penelitian (1 = tanggal pretest)"),
      col("waktu_minum", "Waktu minum (ISO 8601, WIB)"),
      col("jenis_minuman", "Jenis minuman dari tabel referensi"),
      col("volume_ml", "Volume per porsi (ml)"),
      col("porsi", "Jumlah porsi"),
      col("tingkat_gula", "normal / less / none; kosong bila tidak relevan untuk jenis minuman"),
      col("perkiraan_gula_g", "Perkiraan gula (gram) saat dicatat (snapshot)"),
      col("susulan", "1 = dicatat setelah hari minum (pengisian susulan)"),
      col("di_luar_periode", "1 = setelah hari terakhir periode penelitian"),
      col("dicatat_pada", "Waktu catatan dibuat"),
      col("diubah_pada", "Waktu catatan terakhir diubah"),
      col("catatan", "Catatan bebas dari responden"),
    ],
    rows: logs.map((l) => ({
      id_responden: label.get(l.respondentId) ?? null,
      id_catatan: l.id,
      tanggal: fromDbDate(l.localDate),
      hari_ke: l.studyDay,
      waktu_minum: isoWib(l.consumedAt),
      jenis_minuman: l.beverageType.name,
      volume_ml: l.volumeMl,
      porsi: l.servings,
      tingkat_gula: l.sugarLevel,
      perkiraan_gula_g: l.sugarGSnapshot,
      susulan: bit(l.isBackfill),
      di_luar_periode: bit(l.isOutOfPeriod),
      dicatat_pada: isoWib(l.createdAt),
      diubah_pada: isoWib(l.updatedAt),
      catatan: l.note,
    })),
  };
}

async function buildDaily(rs: Resp[], today: string, durationDays: number): Promise<Table> {
  const started = rs.filter((r) => r.dayOneDate);
  const ids = started.map((r) => r.id);
  const [statuses, logs] = await Promise.all([
    prisma.dailyStatus.findMany({ where: { respondentId: { in: ids } } }),
    prisma.consumptionLog.groupBy({
      by: ["respondentId", "localDate"],
      where: { respondentId: { in: ids }, deletedAt: null },
      _sum: { servings: true, sugarGSnapshot: true },
    }),
  ]);
  return {
    name: "ringkasan_harian",
    title: DATASET_TITLES.ringkasan_harian,
    columns: [
      col("id_responden", "ID Responden (hanya yang sudah pretest)"),
      col("hari_ke", `Hari penelitian 1–${durationDays}`),
      col("tanggal", "Tanggal (WIB)"),
      col(
        "status",
        "terisi = ada catatan minuman; nol = menyatakan tidak minum; belum_diisi = tidak ada catatan; belum_berlangsung = tanggal belum tiba",
      ),
      col("jumlah_minuman", "Total porsi; KOSONG untuk belum_diisi/belum_berlangsung (bukan 0)"),
      col(
        "perkiraan_gula_g",
        "Total perkiraan gula; KOSONG untuk belum_diisi/belum_berlangsung (bukan 0)",
      ),
    ],
    rows: started.flatMap((r) => {
      const st = new Map(
        statuses
          .filter((s) => s.respondentId === r.id)
          .map((s) => [fromDbDate(s.date), s.status] as const),
      );
      const totals = new Map(
        logs
          .filter((l) => l.respondentId === r.id)
          .map((l) => [
            fromDbDate(l.localDate),
            { servings: l._sum.servings ?? 0, sugarG: l._sum.sugarGSnapshot ?? 0 },
          ]),
      );
      return dailySummaryRows({
        label: r.label,
        dayOne: fromDbDate(r.dayOneDate!),
        today,
        durationDays,
        statuses: st,
        totals,
      });
    }),
  };
}

async function instruments() {
  return prisma.questionnaire.findMany({
    where: { isActive: true },
    include: { questions: { orderBy: { order: "asc" } } },
    orderBy: { type: "asc" },
  });
}

async function buildQuestionnaires(rs: Resp[]): Promise<Table> {
  const qs = await instruments();
  const answers = await prisma.answer.findMany({
    where: { response: { respondentId: { in: rs.map((r) => r.id) } } },
    include: { response: { select: { respondentId: true, questionnaireId: true } } },
  });
  const prefix = (type: string) => (type === "pretest" ? "pre" : "post");
  const columns: Column[] = [col("id_responden", "ID Responden")];
  for (const q of qs) {
    const p = prefix(q.type);
    columns.push(col(`${p}_status`, `${q.type}: draft / submitted / kosong`));
    columns.push(col(`${p}_dikirim_pada`, `${q.type}: waktu dikirim`));
    for (const item of q.questions) {
      columns.push(
        col(`${p}_q${item.order}`, `${q.type} butir ${item.order}: ${item.text} (lihat Codebook)`),
      );
    }
    columns.push(col(`${p}_skor`, `${q.type}: total skor`));
  }
  return {
    name: "kuesioner",
    title: DATASET_TITLES.kuesioner,
    columns,
    rows: rs.map((r) => {
      const row: Record<string, Cell> = { id_responden: r.label };
      for (const q of qs) {
        const p = prefix(q.type);
        const resp = r.responses.find((x) => x.questionnaireId === q.id);
        row[`${p}_status`] = resp?.status ?? null;
        row[`${p}_dikirim_pada`] = isoWib(resp?.submittedAt ?? null);
        for (const item of q.questions) {
          const a = answers.find(
            (x) =>
              x.response.respondentId === r.id &&
              x.response.questionnaireId === q.id &&
              x.questionId === item.id,
          );
          // Nilai pilihan diekspor sebagai angka (kode); isian teks apa adanya.
          row[`${p}_q${item.order}`] =
            a === undefined
              ? null
              : item.type === "text" || Number.isNaN(Number(a.value))
                ? a.value
                : Number(a.value);
        }
        row[`${p}_skor`] = resp?.status === "submitted" ? (resp.score ?? null) : null;
      }
      return row;
    }),
  };
}

function buildGoals(rs: Resp[]): Table {
  return {
    name: "target",
    title: DATASET_TITLES.target,
    columns: [
      col("id_responden", "ID Responden"),
      col("metrik", "minuman (per hari) / gula_g (per hari)"),
      col("nilai", "Nilai maksimal per hari"),
      col("berlaku_mulai", "Waktu target mulai berlaku"),
      col("berlaku_sampai", "Waktu target diganti; kosong = masih aktif"),
    ],
    rows: rs.flatMap((r) =>
      r.goals.map((g) => ({
        id_responden: r.label,
        metrik: g.metric === "drinks" ? "minuman" : "gula_g",
        nilai: g.targetValue,
        berlaku_mulai: isoWib(g.validFrom),
        berlaku_sampai: isoWib(g.validTo),
      })),
    ),
  };
}

async function buildEducation(rs: Resp[]): Promise<Table> {
  const label = new Map(rs.map((r) => [r.id, r.label]));
  const rows = await prisma.educationProgress.findMany({
    where: { respondentId: { in: rs.map((r) => r.id) } },
    include: { material: { select: { id: true, title: true } } },
    orderBy: { readAt: "asc" },
  });
  return {
    name: "edukasi",
    title: DATASET_TITLES.edukasi,
    columns: [
      col("id_responden", "ID Responden"),
      col("id_materi", "ID materi"),
      col("judul_materi", "Judul materi"),
      col("dibaca_pada", "Waktu materi pertama kali dibuka"),
      col("skor_kuis_pertama", "Skor kuis percobaan pertama (0–100)"),
      col("skor_kuis_terakhir", "Skor kuis percobaan terakhir (0–100)"),
      col("jumlah_percobaan", "Berapa kali kuis dikirim"),
      col("kuis_terakhir_pada", "Waktu kuis terakhir dikirim"),
    ],
    rows: rows.map((p) => ({
      id_responden: label.get(p.respondentId) ?? null,
      id_materi: p.material.id,
      judul_materi: p.material.title,
      dibaca_pada: isoWib(p.readAt),
      skor_kuis_pertama: p.firstQuizScore,
      skor_kuis_terakhir: p.lastQuizScore,
      jumlah_percobaan: p.quizAttempts,
      kuis_terakhir_pada: isoWib(p.lastQuizAt),
    })),
  };
}

/** Semua dataset (opsional untuk satu responden). */
export async function buildTables(
  names: readonly DatasetName[],
  scope: Scope = {},
  now = new Date(),
) {
  const settings = await getStudySettings();
  const today = localDateOf(now);
  const rs = await respondents(scope);
  const out: Table[] = [];
  for (const n of names) {
    if (n === "responden") out.push(await buildRespondents(rs, today, settings.durationDays));
    if (n === "log_konsumsi") out.push(await buildLogs(rs));
    if (n === "ringkasan_harian") out.push(await buildDaily(rs, today, settings.durationDays));
    if (n === "kuesioner") out.push(await buildQuestionnaires(rs));
    if (n === "target") out.push(buildGoals(rs));
    if (n === "edukasi") out.push(await buildEducation(rs));
  }
  return out;
}

/** Sheet Codebook: arti setiap kolom, serta kode jawaban kuesioner. */
async function codebook(tables: Table[]) {
  const rows: Cell[][] = [];
  for (const t of tables) for (const c of t.columns) rows.push([t.name, c.key, c.description]);
  const qs = await instruments();
  const answers: Cell[][] = [];
  for (const q of qs) {
    const p = q.type === "pretest" ? "pre" : "post";
    for (const item of q.questions) {
      const opts = (item.options as QuestionOption[] | null) ?? [];
      if (opts.length === 0)
        answers.push([`${p}_q${item.order}`, item.text, "(isian teks)", "", ""]);
      for (const o of opts)
        answers.push([`${p}_q${item.order}`, item.text, Number(o.value), o.label, o.score]);
    }
  }
  return { rows, answers };
}

export async function tablesToXlsx(tables: Table[]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PantauManis";
  wb.created = new Date();
  for (const t of tables) {
    const ws = wb.addWorksheet(t.name.slice(0, 31));
    ws.columns = t.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: Math.max(12, c.header.length + 2),
    }));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (const r of t.rows) ws.addRow(r);
  }
  const cb = await codebook(tables);
  const ws = wb.addWorksheet("Codebook");
  ws.addRow(["dataset", "kolom", "keterangan"]).font = { bold: true };
  for (const r of cb.rows) ws.addRow(r);
  ws.addRow([]);
  ws.addRow(["kolom_kuesioner", "pertanyaan", "kode", "label", "skor"]).font = { bold: true };
  for (const r of cb.answers) ws.addRow(r);
  ws.columns.forEach((c, i) => (c.width = [22, 40, 70, 24, 8][i] ?? 16));
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

/** Catat setiap ekspor di audit log (FR-A-07). */
export async function auditExport(
  actor: Actor,
  meta: { dataset: string; format: "csv" | "xlsx"; rows: number },
  respondentId?: string,
) {
  await writeAudit({
    actor,
    action: AuditAction.ExportDownloaded,
    ...(respondentId ? { targetType: "respondent" as const, targetId: respondentId } : {}),
    metadata: meta,
  });
}

export { tableToCsv };

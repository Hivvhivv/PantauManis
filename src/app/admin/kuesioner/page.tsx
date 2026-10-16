import type { Metadata } from "next";
import Link from "next/link";
import { staffForPage } from "@/server/auth/page-guards";
import {
  getInstrument,
  LIKERT_DEFAULT,
  type QuestionnaireKind,
} from "@/server/modules/questionnaires/admin";
import { InstrumentEditor } from "./InstrumentEditor";

export const metadata: Metadata = { title: "Kuesioner" };

const TABS: { type: QuestionnaireKind; label: string; when: string }[] = [
  {
    type: "pretest",
    label: "Pretest",
    when: "Ditampilkan langsung setelah responden login dan memberi persetujuan.",
  },
  {
    type: "posttest",
    label: "Posttest",
    when: "Terbuka pada hari ke-14 sampai akhir masa tenggang (lihat Pengaturan).",
  },
];

/** Soal pretest dan posttest dikelola terpisah (ADR-010); terkunci setelah ada jawaban. */
export default async function QuestionnaireAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ jenis?: string }>;
}) {
  await staffForPage();
  const { jenis } = await searchParams;
  const tab = TABS.find((t) => t.type === jenis) ?? TABS[0]!;
  const inst = await getInstrument(tab.type);

  return (
    <>
      <h1 style={{ margin: 0 }}>Kuesioner</h1>
      <nav className="segmented" aria-label="Jenis kuesioner">
        {TABS.map((t) => (
          <Link
            key={t.type}
            href={`/admin/kuesioner?jenis=${t.type}`}
            aria-current={t.type === tab.type ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <p className="muted" style={{ margin: 0 }}>
        {tab.when} Skor total = jumlah skor soal skala dan pilihan ganda (isian tidak diskor).
      </p>
      {inst.locked ? (
        <p className="alert alert-info" role="status">
          Soal {tab.label} terkunci karena sudah ada {inst.responses} jawaban responden. Mengubah
          soal di tengah penelitian membuat jawaban lama tidak sebanding. Hubungi pengembang bila
          soal harus diganti.
        </p>
      ) : (
        inst.isPlaceholder && (
          <p className="alert alert-warning" role="status">
            Soal {tab.label} di bawah masih CONTOH. Ganti dengan instrumen final sebelum responden
            mulai mengisi; setelah ada jawaban, soal terkunci.
          </p>
        )
      )}
      <InstrumentEditor
        key={tab.type}
        type={tab.type}
        initial={inst.questions}
        locked={inst.locked}
        likertDefault={LIKERT_DEFAULT}
      />
    </>
  );
}

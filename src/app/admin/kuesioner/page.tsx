import type { Metadata } from "next";
import { staffForPage } from "@/server/auth/page-guards";
import { getInstrument, LIKERT_DEFAULT } from "@/server/modules/questionnaires/admin";
import { InstrumentEditor } from "./InstrumentEditor";

export const metadata: Metadata = { title: "Kuesioner" };

/** Soal pretest & posttest (ADR-010): satu set soal untuk keduanya; terkunci setelah ada jawaban. */
export default async function QuestionnaireAdminPage() {
  await staffForPage();
  const inst = await getInstrument();
  return (
    <>
      <h1 style={{ margin: 0 }}>Kuesioner Pretest &amp; Posttest</h1>
      <p className="muted" style={{ margin: 0 }}>
        Satu set soal dipakai untuk pretest dan posttest, sehingga skor sebelum dan sesudah bisa
        dibandingkan. Skor total = jumlah skor soal skala dan pilihan ganda (isian tidak diskor).
      </p>
      {inst.locked ? (
        <p className="alert alert-info" role="status">
          Soal terkunci karena sudah ada {inst.responses} jawaban responden. Mengubah soal di tengah
          penelitian membuat jawaban lama tidak sebanding. Hubungi pengembang bila soal harus
          diganti.
        </p>
      ) : (
        inst.isPlaceholder && (
          <p className="alert alert-warning" role="status">
            Soal di bawah masih CONTOH. Ganti dengan instrumen final sebelum responden mulai
            mengisi; setelah ada jawaban, soal terkunci.
          </p>
        )
      )}
      <InstrumentEditor
        initial={inst.questions}
        locked={inst.locked}
        likertDefault={LIKERT_DEFAULT}
      />
    </>
  );
}

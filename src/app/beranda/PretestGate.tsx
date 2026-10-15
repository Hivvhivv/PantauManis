import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { RespondentShell } from "@/components/RespondentShell";
import { StudySteps } from "@/components/StudySteps";
import { getQuestionnaireForRespondent } from "@/server/modules/questionnaires/service";

const LOCKED = [
  { emoji: "🥤", title: "Catat minuman", text: "Catat minuman manis harianmu." },
  { emoji: "📅", title: "Riwayat & grafik", text: "Lihat perkembanganmu dari hari ke hari." },
  { emoji: "🎯", title: "Target", text: "Buat target pribadimu sendiri." },
  { emoji: "📚", title: "Edukasi", text: "Materi singkat dan kuis seru." },
];

/** Beranda sebelum pretest (BR-06): tombol Isi Kuesioner Awal; fitur lain masih terkunci. */
export async function PretestGate({ id, label }: { id: string; label: string }) {
  const q = await getQuestionnaireForRespondent(id, "pretest");
  const answered = q.questions.filter((x) => q.answers[x.id]?.trim()).length;
  const started = answered > 0;

  return (
    <RespondentShell nav={false} label={label}>
      <StudySteps current={1} />
      <section className="hero-card stack pretest-gate">
        <h1>
          Selamat datang, {label}! <span aria-hidden="true">👋</span>
        </h1>
        <p style={{ margin: 0 }}>
          Sebelum mulai mencatat, isi dulu <strong>kuesioner awal</strong> ({q.questions.length}{" "}
          pertanyaan, sekitar 5 menit). Jawabanmu tersimpan otomatis, jadi bisa dilanjutkan kapan
          saja. Hari ke-1 penelitianmu dimulai saat kuesioner ini dikirim.
        </p>
        {started && (
          <div
            className="progress-line"
            aria-label={`${answered} dari ${q.questions.length} dijawab`}
          >
            <span style={{ width: `${(answered / q.questions.length) * 100}%` }} />
          </div>
        )}
        <Link className="btn btn-primary btn-lg" href="/pretest">
          {started
            ? `Lanjutkan Kuesioner Awal (${answered}/${q.questions.length})`
            : "Isi Kuesioner Awal"}
        </Link>
      </section>

      <section className="stack">
        <h2 style={{ margin: 0 }}>Terbuka setelah kuesioner awal dikirim</h2>
        <ul className="locked-grid">
          {LOCKED.map((f) => (
            <li key={f.title} className="card locked-card">
              <span className="locked-emoji" aria-hidden="true">
                {f.emoji}
              </span>
              <span>
                <strong>{f.title}</strong>
                <br />
                <span className="small muted">{f.text}</span>
              </span>
              <span className="locked-icon" aria-label="Terkunci">
                🔒
              </span>
            </li>
          ))}
        </ul>
      </section>
      <Disclaimer />
    </RespondentShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { Markdown } from "@/components/Markdown";
import { RespondentShell } from "@/components/RespondentShell";
import { respondentAtStage } from "@/server/auth/page-guards";
import { AppError } from "@/server/http/errors";
import { listMaterialsForRespondent, readMaterial } from "@/server/modules/education/service";
import { QuizForm } from "./QuizForm";

export const metadata: Metadata = { title: "Materi Edukasi" };

/** Halaman baca materi; membuka halaman ini tercatat sebagai "sudah dibaca" (FR-R-05). */
export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const r = await respondentAtStage("ready");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  let m: Awaited<ReturnType<typeof readMaterial>>;
  try {
    m = await readMaterial(r, id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    if (e instanceof AppError && e.code === "MATERIAL_LOCKED") {
      return (
        <RespondentShell wide label={r.label}>
          <section className="hero-card stack">
            <h1>Materi belum terbuka 🔒</h1>
            <p style={{ margin: 0 }}>{e.message}</p>
            <Link className="btn btn-primary" href="/edukasi">
              Kembali ke Edukasi
            </Link>
          </section>
        </RespondentShell>
      );
    }
    throw e;
  }

  const all = await listMaterialsForRespondent(r);
  const pos = all.findIndex((x) => x.id === m.id);
  const prev = all.slice(0, pos).findLast((x) => x.unlocked);
  const next = all.slice(pos + 1).find((x) => x.unlocked);
  const minutes = Math.max(1, Math.round(m.body.split(/\s+/).length / 200));

  return (
    <RespondentShell wide label={r.label}>
      <nav className="edu-crumbs small" aria-label="Navigasi materi">
        <Link href="/edukasi">← Semua materi</Link>
        {pos >= 0 && (
          <span className="muted">
            Materi {pos + 1} dari {all.length}
          </span>
        )}
      </nav>

      <article className="edu-article">
        <header className="edu-article-head">
          {m.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.imageUrl} alt={m.imageAlt ?? ""} className="edu-article-cover" />
          ) : (
            <span className="edu-article-cover icon" aria-hidden="true">
              {m.icon}
            </span>
          )}
          <div className="stack edu-article-title">
            <h1 style={{ margin: 0 }}>{m.title}</h1>
            <p className="lead-text muted" style={{ margin: 0 }}>
              {m.summary}
            </p>
            <p className="edu-chips" style={{ margin: 0 }}>
              <span className="edu-chip">⏱ {minutes} menit baca</span>
              {m.videoEmbedUrl && <span className="edu-chip">▶ Video</span>}
              {m.questions.length > 0 && (
                <span className="edu-chip">Kuis {m.questions.length} soal</span>
              )}
            </p>
          </div>
        </header>

        <div className="card stack reading">
          {m.videoEmbedUrl && (
            <div className="video">
              <iframe
                src={m.videoEmbedUrl}
                title={`Video: ${m.title}`}
                loading="lazy"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          )}
          <Markdown>{m.body}</Markdown>
          {m.source && (
            <p className="edu-source small">
              <strong>Sumber:</strong> {m.source}
            </p>
          )}
        </div>
      </article>

      {m.questions.length > 0 && (
        <QuizForm id={m.id} questions={m.questions} attempts={m.progress.quizAttempts} />
      )}

      {(prev || next) && (
        <nav className="edu-pager" aria-label="Materi lain">
          {prev ? (
            <Link href={`/edukasi/${prev.id}`} className="edu-pager-link">
              <span className="small muted">← Sebelumnya</span>
              <strong>{prev.title}</strong>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/edukasi/${next.id}`} className="edu-pager-link next">
              <span className="small muted">Berikutnya →</span>
              <strong>{next.title}</strong>
            </Link>
          )}
        </nav>
      )}
      <Disclaimer />
    </RespondentShell>
  );
}

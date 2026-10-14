import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { Markdown } from "@/components/Markdown";
import { RespondentShell } from "@/components/RespondentShell";
import { respondentAtStage } from "@/server/auth/page-guards";
import { AppError } from "@/server/http/errors";
import { readMaterial } from "@/server/modules/education/service";
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

  return (
    <RespondentShell wide label={r.label}>
      <p className="small" style={{ margin: 0 }}>
        <Link href="/edukasi">← Edukasi</Link>
      </p>
      <article className="card stack reading">
        <p className="eyebrow">
          <span aria-hidden="true">{m.icon}</span> Materi edukasi
        </p>
        <h1 style={{ margin: 0 }}>{m.title}</h1>
        <p className="lead-text muted" style={{ margin: 0 }}>
          {m.summary}
        </p>
        {m.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.imageUrl} alt={m.imageAlt ?? ""} className="reading-image" />
        )}
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
          <p className="small muted" style={{ margin: 0 }}>
            <strong>Sumber:</strong> {m.source}
          </p>
        )}
      </article>

      {m.questions.length > 0 && (
        <QuizForm id={m.id} questions={m.questions} attempts={m.progress.quizAttempts} />
      )}
      <Disclaimer />
    </RespondentShell>
  );
}

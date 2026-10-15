import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { RespondentShell } from "@/components/RespondentShell";
import { categoryColor } from "@/lib/palette";
import { respondentAtStage } from "@/server/auth/page-guards";
import { listMaterialsForRespondent } from "@/server/modules/education/service";

export const metadata: Metadata = { title: "Edukasi" };

type Item = Awaited<ReturnType<typeof listMaterialsForRespondent>>[number];

/** Daftar materi edukasi (FR-R-05): progres baca, materi berikutnya, kartu bergambar. */
export default async function EdukasiPage() {
  const r = await respondentAtStage("ready");
  const items = await listMaterialsForRespondent(r);
  const readCount = items.filter((i) => i.read).length;
  const pct = items.length ? Math.round((readCount / items.length) * 100) : 0;
  const next = items.find((i) => i.unlocked && !i.read);

  return (
    <RespondentShell wide label={r.label}>
      <section className="dash-hero page-hero edu-hero">
        <div className="stack">
          <p className="eyebrow">Edukasi</p>
          <h1>Kenali minuman manis</h1>
          <p className="lead-text muted" style={{ margin: 0 }}>
            Bacaan singkat 3–5 menit, sebagian dilengkapi video dan kuis.
          </p>
        </div>
        {items.length > 0 && (
          <div className="edu-progress" aria-label={`${readCount} dari ${items.length} dibaca`}>
            <strong>
              {readCount}/{items.length}
            </strong>
            <span className="small muted">materi dibaca</span>
            <div className="progress-line">
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </section>

      {items.length === 0 ? (
        <p className="card muted">Materi edukasi akan segera tersedia.</p>
      ) : (
        <>
          {next && (
            <Link href={`/edukasi/${next.id}`} className="edu-next">
              <Cover item={next} index={items.indexOf(next)} />
              <span className="stack edu-next-body">
                <span className="eyebrow">
                  {readCount === 0 ? "Mulai dari sini" : "Lanjutkan membaca"}
                </span>
                <strong className="edu-next-title">{next.title}</strong>
                <span className="muted">{next.summary}</span>
                <span className="btn btn-primary edu-next-btn">Baca sekarang →</span>
              </span>
            </Link>
          )}

          <h2 className="edu-section-title">Semua materi</h2>
          <ul className="edu-grid">
            {items.map((m, i) => (
              <li key={m.id}>
                {m.unlocked ? (
                  <Link href={`/edukasi/${m.id}`} className="edu-card">
                    <Cover item={m} index={i} />
                    <span className="edu-card-body">
                      <span className="small muted">Materi {i + 1}</span>
                      <strong>{m.title}</strong>
                      <span className="small muted edu-summary">{m.summary}</span>
                      <span className="edu-chips">
                        {m.read ? (
                          <span className="edu-chip done">✓ Sudah dibaca</span>
                        ) : (
                          <span className="edu-chip new">Baru</span>
                        )}
                        {m.hasVideo && <span className="edu-chip">▶ Video</span>}
                        {m.questionCount > 0 && (
                          <span className="edu-chip">
                            {m.lastQuizScore === null
                              ? `Kuis ${m.questionCount} soal`
                              : `Kuis ${m.lastQuizScore}/${m.questionCount}`}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                ) : (
                  <div
                    className="edu-card locked"
                    aria-label={`${m.title}, terbuka mulai hari ke-${m.unlockDay}`}
                  >
                    <span className="edu-cover locked" aria-hidden="true">
                      🔒
                    </span>
                    <span className="edu-card-body">
                      <span className="small muted">Materi {i + 1}</span>
                      <strong>{m.title}</strong>
                      <span className="edu-chips">
                        <span className="edu-chip">Terbuka hari ke-{m.unlockDay}</span>
                      </span>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <Disclaimer />
    </RespondentShell>
  );
}

/** Sampul kartu: gambar materi, atau warna + ikon bila tanpa gambar. */
function Cover({ item, index }: { item: Item; index: number }) {
  if (item.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="edu-cover" src={item.imageUrl} alt={item.imageAlt ?? ""} />;
  }
  return (
    <span className="edu-cover" style={{ background: categoryColor(index) }} aria-hidden="true">
      {item.icon}
    </span>
  );
}

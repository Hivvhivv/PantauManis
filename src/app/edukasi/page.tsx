import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { Icon } from "@/components/Icon";
import { RespondentShell } from "@/components/RespondentShell";
import { categoryColor } from "@/lib/palette";
import { respondentAtStage } from "@/server/auth/page-guards";
import { listMaterialsForRespondent } from "@/server/modules/education/service";

export const metadata: Metadata = { title: "Edukasi" };

/** Daftar materi edukasi (FR-R-05). */
export default async function EdukasiPage() {
  const r = await respondentAtStage("ready");
  const items = await listMaterialsForRespondent(r);
  const readCount = items.filter((i) => i.read).length;

  return (
    <RespondentShell wide label={r.label}>
      <section className="dash-hero page-hero">
        <div className="stack">
          <p className="eyebrow">Edukasi</p>
          <h1>Kenali minuman manis</h1>
          <p className="lead-text muted" style={{ margin: 0 }}>
            Bacaan singkat seputar minuman manis. Sudah dibaca {readCount} dari {items.length}{" "}
            materi.
          </p>
        </div>
      </section>

      {items.length === 0 ? (
        <p className="card muted">Materi edukasi akan segera tersedia.</p>
      ) : (
        <ul className="edu-list">
          {items.map((m, i) => (
            <li key={m.id}>
              {m.unlocked ? (
                <Link href={`/edukasi/${m.id}`} className="edu-item">
                  <span
                    className="edu-icon"
                    style={{ background: categoryColor(i) }}
                    aria-hidden="true"
                  >
                    {m.icon}
                  </span>
                  <span>
                    <strong>{m.title}</strong>
                    <br />
                    <span className="small muted">{m.summary}</span>
                    <br />
                    {m.read && (
                      <span className="status-badge st-zero small">✓ Sudah dibaca</span>
                    )}{" "}
                    {m.lastQuizScore !== null && (
                      <span className="status-badge st-filled small">Kuis {m.lastQuizScore}</span>
                    )}
                  </span>
                  <Icon name="chevron" />
                </Link>
              ) : (
                <div
                  className="edu-item locked"
                  aria-label={`${m.title}, terbuka mulai hari ke-${m.unlockDay}`}
                >
                  <span className="edu-icon" aria-hidden="true">
                    🔒
                  </span>
                  <span>
                    <strong>{m.title}</strong>
                    <br />
                    <span className="small muted">Terbuka mulai hari ke-{m.unlockDay}</span>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Disclaimer />
    </RespondentShell>
  );
}

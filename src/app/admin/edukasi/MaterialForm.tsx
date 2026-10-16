"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiError } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";
import { FieldError } from "@/components/FieldError";
import { Markdown } from "@/components/Markdown";

type Question = { text: string; options: string[]; correctIndex: number };

type MaterialDefaults = {
  id?: string;
  title: string;
  summary: string;
  body: string;
  icon: string;
  imageKey: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  videoUrl: string | null;
  source: string | null;
  unlockDay: number | null;
  status: "draft" | "published";
  questions: Question[];
};

const blankQuestion = (): Question => ({ text: "", options: ["", ""], correctIndex: 0 });

/** Form materi edukasi (FR-A-05). */
export function MaterialForm({ defaults }: { defaults: MaterialDefaults }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [m, setM] = useState(defaults);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof MaterialDefaults>(k: K, v: MaterialDefaults[K]) =>
    setM((x) => ({ ...x, [k]: v }));
  const setQ = (i: number, q: Partial<Question>) =>
    set(
      "questions",
      m.questions.map((x, j) => (j === i ? { ...x, ...q } : x)),
    );

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Cek di browser dulu: file > 4,5 MB sudah ditolak hosting sebelum sampai ke server.
    if (file.size > 4 * 1024 * 1024) {
      e.target.value = "";
      return setError({
        code: "FILE_TOO_LARGE",
        message: "Ukuran gambar maksimal 4 MB. Perkecil gambar lalu coba lagi.",
        fields: { file: "Ukuran gambar maksimal 4 MB." },
      });
    }
    const form = new FormData();
    form.set("file", file);
    setUploading(true);
    setError(null);
    const res = await api<{ key: string; url: string }>("/api/admin/education/media", { form });
    setUploading(false);
    e.target.value = "";
    if (!res.ok) return setError(res.error);
    setM((x) => ({ ...x, imageKey: res.data.key, imageUrl: res.data.url }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      title: m.title,
      summary: m.summary,
      body: m.body,
      icon: m.icon,
      imageKey: m.imageKey ?? "",
      imageAlt: m.imageAlt ?? "",
      videoUrl: m.videoUrl ?? "",
      source: m.source ?? "",
      unlockDay: m.unlockDay ?? "",
      status: m.status,
      questions: m.questions,
    };
    const res = m.id
      ? await api(`/api/admin/education/${m.id}`, { method: "PUT", body })
      : await api("/api/admin/education", { body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push("/admin/edukasi");
    router.refresh();
  }

  async function onDelete() {
    if (!m.id || !confirm(`Hapus materi "${m.title}"? Riwayat baca responden tetap tersimpan.`))
      return;
    setBusy(true);
    const res = await api(`/api/admin/education/${m.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push("/admin/edukasi");
    router.refresh();
  }

  const qErr = (i: number, field: string) => error?.fields[`questions.${i}.${field}`];

  return (
    <form onSubmit={onSubmit} method="post" noValidate>
      <fieldset
        disabled={!hydrated}
        className="dash-grid two-one"
        style={{ border: 0, padding: 0 }}
      >
        <section className="card stack">
          <div className="grid-2">
            <div>
              <label htmlFor="title">Judul</label>
              <input
                id="title"
                value={m.title}
                maxLength={150}
                onChange={(e) => set("title", e.target.value)}
              />
              <FieldError error={error} name="title" />
            </div>
            <div>
              <label htmlFor="icon">
                Ikon <span className="hint">emoji</span>
              </label>
              <input
                id="icon"
                value={m.icon}
                maxLength={16}
                onChange={(e) => set("icon", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="summary">
              Ringkasan <span className="hint">tampil di daftar materi, maks. 300 karakter</span>
            </label>
            <input
              id="summary"
              value={m.summary}
              maxLength={300}
              onChange={(e) => set("summary", e.target.value)}
            />
            <FieldError error={error} name="summary" />
          </div>

          <div>
            <div className="row spread">
              <label htmlFor="body" style={{ margin: 0 }}>
                Isi materi{" "}
                <span className="hint">
                  Markdown: ## judul, **tebal**, - daftar, [tautan](https://…)
                </span>
              </label>
              <div className="segmented" role="tablist" aria-label="Mode isi">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "write"}
                  className={tab === "write" ? "seg-on" : undefined}
                  onClick={() => setTab("write")}
                >
                  Tulis
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "preview"}
                  className={tab === "preview" ? "seg-on" : undefined}
                  onClick={() => setTab("preview")}
                >
                  Pratinjau
                </button>
              </div>
            </div>
            {tab === "write" ? (
              <textarea
                id="body"
                rows={16}
                value={m.body}
                maxLength={20000}
                onChange={(e) => set("body", e.target.value)}
                style={{ marginTop: "0.5rem" }}
              />
            ) : (
              <div className="preview-box">
                {m.body.trim() ? (
                  <Markdown>{m.body}</Markdown>
                ) : (
                  <p className="muted">Belum ada isi.</p>
                )}
              </div>
            )}
            <FieldError error={error} name="body" />
          </div>

          <div>
            <label htmlFor="source">
              Sumber referensi <span className="hint">opsional</span>
            </label>
            <input
              id="source"
              value={m.source ?? ""}
              maxLength={500}
              onChange={(e) => set("source", e.target.value)}
            />
          </div>
        </section>

        <div className="stack" style={{ marginTop: 0 }}>
          <section className="card stack">
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Publikasi</h2>
            <div>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={m.status}
                onChange={(e) => set("status", e.target.value as MaterialDefaults["status"])}
              >
                <option value="draft">Draf (tidak terlihat responden)</option>
                <option value="published">Terbit</option>
              </select>
            </div>
            <div>
              <label htmlFor="unlockDay">
                Jadwal tampil <span className="hint">kosongkan = langsung terbuka</span>
              </label>
              <input
                id="unlockDay"
                type="number"
                min={1}
                max={60}
                placeholder="Hari ke-…"
                value={m.unlockDay ?? ""}
                onChange={(e) =>
                  set("unlockDay", e.target.value === "" ? null : Number(e.target.value))
                }
              />
              <FieldError error={error} name="unlockDay" />
            </div>
          </section>

          <section className="card stack">
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Media</h2>
            <div>
              <label htmlFor="image">
                Gambar/infografis <span className="hint">JPG, PNG, atau WebP, maks. 4 MB</span>
              </label>
              {m.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.imageUrl} alt={m.imageAlt ?? ""} className="media-preview" />
              )}
              <input
                id="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onUpload}
              />
              {uploading && <p className="small muted">Mengunggah…</p>}
              <FieldError error={error} name="file" />
              {m.imageKey && (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ marginTop: "0.5rem" }}
                  onClick={() => setM((x) => ({ ...x, imageKey: null, imageUrl: null }))}
                >
                  Hapus gambar
                </button>
              )}
            </div>
            {m.imageKey && (
              <div>
                <label htmlFor="imageAlt">Deskripsi gambar (untuk pembaca layar)</label>
                <input
                  id="imageAlt"
                  value={m.imageAlt ?? ""}
                  maxLength={200}
                  onChange={(e) => set("imageAlt", e.target.value)}
                />
                <FieldError error={error} name="imageAlt" />
              </div>
            )}
            <div>
              <label htmlFor="videoUrl">
                Video YouTube <span className="hint">opsional, tautan unlisted juga bisa</span>
              </label>
              <input
                id="videoUrl"
                value={m.videoUrl ?? ""}
                placeholder="https://youtu.be/…"
                onChange={(e) => set("videoUrl", e.target.value)}
              />
              <FieldError error={error} name="videoUrl" />
            </div>
          </section>

          <section className="card stack">
            <div className="row spread">
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Kuis ({m.questions.length}/3)</h2>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => set("questions", [...m.questions, blankQuestion()])}
                disabled={m.questions.length >= 3}
              >
                + Soal
              </button>
            </div>
            {m.questions.length === 0 && <p className="small muted">Tanpa kuis.</p>}
            {m.questions.map((q, i) => (
              <fieldset key={i} className="quiz-edit">
                <legend>Soal {i + 1}</legend>
                <label htmlFor={`q${i}`} className="sr-only">
                  Pertanyaan {i + 1}
                </label>
                <input
                  id={`q${i}`}
                  value={q.text}
                  placeholder="Pertanyaan"
                  maxLength={500}
                  onChange={(e) => setQ(i, { text: e.target.value })}
                />
                {qErr(i, "text") && <p className="field-error">{qErr(i, "text")}</p>}
                {q.options.map((o, j) => (
                  <div key={j} className="row" style={{ flexWrap: "nowrap" }}>
                    <input
                      type="radio"
                      name={`correct-${i}`}
                      checked={q.correctIndex === j}
                      onChange={() => setQ(i, { correctIndex: j })}
                      aria-label={`Opsi ${j + 1} jawaban benar`}
                      style={{ width: 20, minHeight: 20 }}
                    />
                    <input
                      value={o}
                      placeholder={`Opsi ${j + 1}`}
                      maxLength={200}
                      aria-label={`Soal ${i + 1}, opsi ${j + 1}`}
                      onChange={(e) =>
                        setQ(i, {
                          options: q.options.map((x, k) => (k === j ? e.target.value : x)),
                        })
                      }
                    />
                    {q.options.length > 2 && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        aria-label={`Hapus opsi ${j + 1}`}
                        onClick={() =>
                          setQ(i, {
                            options: q.options.filter((_, k) => k !== j),
                            correctIndex:
                              q.correctIndex >= j && q.correctIndex > 0
                                ? q.correctIndex - 1
                                : q.correctIndex,
                          })
                        }
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {(qErr(i, "options") || qErr(i, "correctIndex")) && (
                  <p className="field-error">{qErr(i, "options") ?? qErr(i, "correctIndex")}</p>
                )}
                <div className="row">
                  {q.options.length < 4 && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setQ(i, { options: [...q.options, ""] })}
                    >
                      + Opsi
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() =>
                      set(
                        "questions",
                        m.questions.filter((_, k) => k !== i),
                      )
                    }
                  >
                    Hapus soal
                  </button>
                </div>
                <p className="hint" style={{ margin: 0 }}>
                  Pilih bulatan di samping jawaban yang benar.
                </p>
              </fieldset>
            ))}
          </section>

          {error && (
            <p className="alert alert-error" role="alert">
              {error.message}
            </p>
          )}
          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={!hydrated || busy || uploading}
          >
            Simpan materi
          </button>
          {m.id && (
            <button
              type="button"
              className="btn btn-danger btn-block"
              onClick={onDelete}
              disabled={busy}
            >
              Hapus materi
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}

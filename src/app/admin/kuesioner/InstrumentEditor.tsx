"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiError } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";
import type { InstrumentItem } from "@/server/modules/questionnaires/admin";

type Item = InstrumentItem & { key: number };

const TYPE_LABEL = { likert: "Skala 1–5", choice: "Pilihan ganda", text: "Isian singkat" };
let nextKey = 1;

/** Editor soal kuesioner (ADR-010). Disimpan sekaligus untuk pretest dan posttest. */
export function InstrumentEditor({
  initial,
  locked,
  likertDefault,
}: {
  initial: InstrumentItem[];
  locked: boolean;
  likertDefault: string[];
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(() => initial.map((q) => ({ ...q, key: nextKey++ })));
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (i: number, patch: Partial<InstrumentItem>) => {
    setSaved(false);
    setItems((all) => all.map((q, j) => (j === i ? ({ ...q, ...patch } as Item) : q)));
  };
  const move = (i: number, d: -1 | 1) =>
    setItems((all) => {
      const next = [...all];
      [next[i], next[i + d]] = [next[i + d]!, next[i]!];
      return next;
    });
  const add = (type: InstrumentItem["type"]) => {
    setSaved(false);
    const base = { text: "", required: true, key: nextKey++ };
    const item: Item =
      type === "likert"
        ? { ...base, type, labels: [...likertDefault], reverse: false }
        : type === "choice"
          ? {
              ...base,
              type,
              choices: [
                { label: "", score: 1 },
                { label: "", score: 2 },
              ],
            }
          : { ...base, type };
    setItems((all) => [...all, item]);
  };

  async function save() {
    setBusy(true);
    setError(null);
    const res = await api("/api/admin/questionnaire", {
      method: "PUT",
      // `key` hanya untuk React; skema zod di server membuang kolom yang tidak dikenal.
      body: { questions: items },
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSaved(true);
    router.refresh();
  }

  const errorFor = (i: number) =>
    Object.entries(error?.fields ?? {}).find(([k]) => k.startsWith(`questions.${i}.`))?.[1];

  return (
    <fieldset disabled={locked || !hydrated} className="stack q-editor">
      <ol className="q-list">
        {items.map((q, i) => (
          <li key={q.key} className="card stack q-item">
            <div className="row spread">
              <strong>
                Soal {i + 1} · <span className="muted">{TYPE_LABEL[q.type]}</span>
              </strong>
              <span className="row">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Naikkan soal ${i + 1}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  aria-label={`Turunkan soal ${i + 1}`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => setItems((all) => all.filter((_, j) => j !== i))}
                  aria-label={`Hapus soal ${i + 1}`}
                >
                  Hapus
                </button>
              </span>
            </div>

            <div>
              <label htmlFor={`q-${q.key}`}>Pertanyaan</label>
              <textarea
                id={`q-${q.key}`}
                value={q.text}
                maxLength={500}
                onChange={(e) => update(i, { text: e.target.value })}
                placeholder="mis. Seberapa sering kamu minum minuman manis dalam seminggu terakhir?"
              />
            </div>

            {q.type === "likert" && (
              <div className="stack">
                <span className="small muted">
                  Label tiap tingkat (responden memilih salah satu dari 1–5):
                </span>
                <div className="likert-edit">
                  {q.labels.map((l, j) => (
                    <label key={j} className="likert-edit-cell">
                      <span className="likert-num">{j + 1}</span>
                      <input
                        value={l}
                        maxLength={60}
                        aria-label={`Label tingkat ${j + 1}`}
                        onChange={(e) =>
                          update(i, {
                            labels: q.labels.map((x, k) => (k === j ? e.target.value : x)),
                          })
                        }
                      />
                      <span className="small muted">skor {q.reverse ? 5 - j : j + 1}</span>
                    </label>
                  ))}
                </div>
                <label className="check-inline">
                  <input
                    type="checkbox"
                    checked={q.reverse}
                    onChange={(e) => update(i, { reverse: e.target.checked })}
                  />
                  Skor terbalik (tingkat 1 = skor 5), untuk pernyataan bernada negatif
                </label>
              </div>
            )}

            {q.type === "choice" && (
              <div className="stack">
                <span className="small muted">Pilihan jawaban · skor</span>
                {q.choices.map((c, j) => (
                  <div key={j} className="choice-edit">
                    <input
                      value={c.label}
                      maxLength={60}
                      placeholder={`Pilihan ${j + 1}`}
                      aria-label={`Pilihan ${j + 1}`}
                      onChange={(e) =>
                        update(i, {
                          choices: q.choices.map((x, k) =>
                            k === j ? { ...x, label: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <input
                      type="number"
                      value={c.score}
                      aria-label={`Skor pilihan ${j + 1}`}
                      onChange={(e) =>
                        update(i, {
                          choices: q.choices.map((x, k) =>
                            k === j ? { ...x, score: Number(e.target.value) } : x,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={q.choices.length <= 2}
                      onClick={() => update(i, { choices: q.choices.filter((_, k) => k !== j) })}
                      aria-label={`Hapus pilihan ${j + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {q.choices.length < 10 && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() =>
                      update(i, {
                        choices: [...q.choices, { label: "", score: q.choices.length + 1 }],
                      })
                    }
                  >
                    + Tambah pilihan
                  </button>
                )}
              </div>
            )}

            <label className="check-inline">
              <input
                type="checkbox"
                checked={q.required}
                onChange={(e) => update(i, { required: e.target.checked })}
              />
              Wajib dijawab
            </label>
            {errorFor(i) && (
              <p className="field-error" role="alert">
                {errorFor(i)}
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="card row q-add">
        <span className="small muted">Tambah soal:</span>
        <button type="button" className="btn btn-sm" onClick={() => add("likert")}>
          + Skala 1–5
        </button>
        <button type="button" className="btn btn-sm" onClick={() => add("choice")}>
          + Pilihan ganda
        </button>
        <button type="button" className="btn btn-sm" onClick={() => add("text")}>
          + Isian singkat
        </button>
      </div>

      {error && (
        <p className="alert alert-error" role="alert">
          {error.fields.questions ?? error.message}
        </p>
      )}
      {saved && (
        <p className="alert alert-info" role="status">
          Soal tersimpan untuk pretest dan posttest.
        </p>
      )}
      {!locked && (
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan soal"}
        </button>
      )}
    </fieldset>
  );
}

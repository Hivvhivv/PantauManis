"use client";

import { useEffect, useRef, useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";

type Question = {
  id: string;
  order: number;
  text: string;
  type: "likert" | "choice" | "text";
  required: boolean;
  options: { value: string; label: string }[] | null;
};

export function QuestionnaireForm({
  endpoint = "/api/respondent/pretest",
  questions,
  initialAnswers,
}: {
  /** Endpoint API kuesioner (pretest atau posttest). */
  endpoint?: string;
  questions: Question[];
  initialAnswers: Record<string, string>;
}) {
  const hydrated = useHydrated();
  const [answers, setAnswers] = useState(initialAnswers);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = useRef(false);

  // Simpan draf otomatis 800 ms setelah perubahan terakhir.
  useEffect(() => {
    if (!dirty.current) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      const res = await api(endpoint, { method: "PUT", body: { answers } });
      setSaveState(res.ok ? "saved" : "error");
    }, 800);
    return () => clearTimeout(t);
  }, [answers, endpoint]);

  const set = (id: string, value: string) => {
    dirty.current = true;
    setAnswers((a) => ({ ...a, [id]: value }));
  };

  const answered = questions.filter((q) => answers[q.id]?.trim()).length;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("Kirim jawaban? Setelah dikirim, jawaban tidak bisa diubah.")) return;
    setBusy(true);
    setError(null);
    const res = await api<{ redirectTo: string }>(endpoint, { body: { answers } });
    if (res.ok) return window.location.assign(res.data.redirectTo);
    setError(res.error);
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} method="post" className="card" noValidate>
      {/* Isian nonaktif sampai hidrasi selesai, agar pilihan sebelum itu tidak hilang. */}
      <fieldset disabled={!hydrated} className="stack">
        <p className="small muted" style={{ margin: 0 }} aria-live="polite">
          {answered} dari {questions.length} pertanyaan dijawab
          {saveState === "saving" && " · menyimpan…"}
          {saveState === "saved" && " · tersimpan otomatis"}
          {saveState === "error" && " · gagal menyimpan, periksa koneksi"}
        </p>

        {questions.map((q) => {
          const err = error?.fields[q.id];
          const title = (
            <>
              {q.order}. {q.text} {!q.required && <span className="hint">(opsional)</span>}
            </>
          );
          return (
            <div key={q.id} className="question">
              {q.type === "text" ? (
                <>
                  <label htmlFor={`q-${q.id}`}>{title}</label>
                  <textarea
                    id={`q-${q.id}`}
                    value={answers[q.id] ?? ""}
                    maxLength={2000}
                    onChange={(e) => set(q.id, e.target.value)}
                    aria-invalid={err ? true : undefined}
                  />
                </>
              ) : (
                <fieldset aria-invalid={err ? true : undefined}>
                  <legend>{title}</legend>
                  <div className={q.type === "likert" ? "options likert" : "options"}>
                    {q.options?.map((o) => (
                      <label key={o.value} className="option">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={o.value}
                          checked={answers[q.id] === o.value}
                          onChange={() => set(q.id, o.value)}
                        />
                        {q.type === "likert" && (
                          <span className="likert-num" aria-hidden="true">
                            {o.value}
                          </span>
                        )}
                        <span>{o.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {err && (
                <p className="field-error" role="alert">
                  {err}
                </p>
              )}
            </div>
          );
        })}

        {error && (
          <p className="alert alert-error" role="alert">
            {error.message}
          </p>
        )}
        <button className="btn btn-primary btn-block" type="submit" disabled={!hydrated || busy}>
          Kirim jawaban
        </button>
      </fieldset>
    </form>
  );
}

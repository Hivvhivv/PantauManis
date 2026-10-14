"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";

type Result = {
  score: number;
  message: string;
  results: { correct: boolean; correctIndex: number }[];
};

/** Kuis singkat di akhir materi; boleh diulang (skor pertama & terakhir disimpan). */
export function QuizForm({
  id,
  questions,
  attempts,
}: {
  id: string;
  questions: { text: string; options: string[] }[];
  attempts: number;
}) {
  const hydrated = useHydrated();
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null));
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const complete = answers.every((a) => a !== null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<Result>(`/api/respondent/education/${id}/quiz`, { body: { answers } });
    setBusy(false);
    if (res.ok) setResult(res.data);
    else setError(res.error.message);
  }

  function retry() {
    setResult(null);
    setAnswers(questions.map(() => null));
  }

  return (
    <form onSubmit={onSubmit} method="post" className="card" noValidate>
      <fieldset disabled={!hydrated} className="stack">
        <div>
          <h2 style={{ margin: 0 }}>Kuis singkat</h2>
          <p className="small muted" style={{ margin: "0.2rem 0 0" }}>
            {questions.length} pertanyaan · boleh diulang
            {attempts > 0 && ` · sudah dicoba ${attempts} kali`}
          </p>
        </div>
        {questions.map((q, i) => {
          const r = result?.results[i];
          return (
            <fieldset key={i} className="question">
              <legend>
                {i + 1}. {q.text}
              </legend>
              <div className="options">
                {q.options.map((o, j) => (
                  <label
                    key={j}
                    className={`option${r && j === r.correctIndex ? " is-correct" : ""}${
                      r && !r.correct && answers[i] === j ? " is-wrong" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name={`quiz-${i}`}
                      checked={answers[i] === j}
                      disabled={!!result}
                      onChange={() => setAnswers((a) => a.map((x, k) => (k === i ? j : x)))}
                    />
                    {o}
                    {r && j === r.correctIndex && <span className="sr-only"> (jawaban benar)</span>}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        {result ? (
          <div className="stack" role="status" aria-live="polite">
            <p className="feedback" style={{ margin: 0 }}>
              Skor kamu: {result.score}. {result.message}
            </p>
            <button type="button" className="btn" onClick={retry}>
              Coba lagi
            </button>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            type="submit"
            disabled={!hydrated || busy || !complete}
          >
            Kirim jawaban
          </button>
        )}
      </fieldset>
    </form>
  );
}

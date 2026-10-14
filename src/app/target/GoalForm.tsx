"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiError } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";
import { FieldError } from "@/components/FieldError";

type Metric = "drinks" | "sugar";

const SUGGESTIONS: Record<Metric, number[]> = { drinks: [0, 1, 2, 3], sugar: [15, 25, 35, 50] };

export function GoalForm({
  initialMetric,
  initialValue,
}: {
  initialMetric: Metric;
  initialValue: number | null;
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [metric, setMetric] = useState<Metric>(initialMetric);
  const [value, setValue] = useState<number | "">(initialValue ?? "");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("Simpan target ini? Target bisa diubah lagi setelah 7 hari.")) return;
    setBusy(true);
    setError(null);
    const res = await api("/api/respondent/goal", { body: { metric, targetValue: value } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} method="post" noValidate>
      <fieldset disabled={!hydrated} className="stack">
        <fieldset>
          <legend>Jenis target</legend>
          <div className="options">
            <label className="option">
              <input
                type="radio"
                name="metric"
                checked={metric === "drinks"}
                onChange={() => {
                  setMetric("drinks");
                  setValue("");
                }}
              />
              Jumlah minuman manis per hari
            </label>
            <label className="option">
              <input
                type="radio"
                name="metric"
                checked={metric === "sugar"}
                onChange={() => {
                  setMetric("sugar");
                  setValue("");
                }}
              />
              Perkiraan gula dari minuman per hari (gram)
            </label>
          </div>
        </fieldset>

        <div>
          <label htmlFor="targetValue">
            Maksimal per hari{" "}
            <span className="hint">({metric === "drinks" ? "minuman" : "gram gula"})</span>
          </label>
          <div className="chips" style={{ marginBottom: "0.5rem" }}>
            {SUGGESTIONS[metric].map((s) => (
              <button
                key={s}
                type="button"
                className="chip"
                aria-pressed={value === s}
                onClick={() => setValue(s)}
              >
                {s} {metric === "drinks" ? "minuman" : "g"}
              </button>
            ))}
          </div>
          <input
            id="targetValue"
            type="number"
            inputMode="numeric"
            min={0}
            max={metric === "drinks" ? 20 : 500}
            step={metric === "drinks" ? 1 : "any"}
            value={value}
            onChange={(e) => setValue(e.target.value === "" ? "" : Number(e.target.value))}
            aria-invalid={error?.fields.targetValue ? true : undefined}
          />
          <FieldError error={error} name="targetValue" />
        </div>

        {error && Object.keys(error.fields).length === 0 && (
          <p className="alert alert-error" role="alert">
            {error.message}
          </p>
        )}
        <button
          className="btn btn-primary btn-block"
          type="submit"
          disabled={!hydrated || busy || value === ""}
        >
          Simpan target
        </button>
      </fieldset>
    </form>
  );
}

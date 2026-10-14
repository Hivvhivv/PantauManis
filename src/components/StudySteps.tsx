const STEPS = ["Persetujuan", "Kuesioner awal", "Mulai mencatat"];

/** Penanda langkah awal (seperti mockup "Pengukuran Awal"). */
export function StudySteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="study-steps" aria-label="Langkah awal">
      {STEPS.map((s, i) => (
        <li key={s} className={i < current ? "done" : i === current ? "current" : undefined}>
          <span className="dot" aria-hidden="true">
            {i < current ? "✓" : i + 1}
          </span>
          <span>{s}</span>
          {i === current && <span className="sr-only"> (langkah saat ini)</span>}
        </li>
      ))}
    </ol>
  );
}

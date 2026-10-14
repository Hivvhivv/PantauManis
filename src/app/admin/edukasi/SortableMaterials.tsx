"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";

type Item = {
  id: string;
  title: string;
  icon: string;
  status: "draft" | "published";
  unlockDay: number | null;
  questionCount: number;
  readCount: number;
};

/** Daftar materi dengan drag-and-drop (mouse/sentuh) dan tombol ↑/↓ (keyboard). */
export function SortableMaterials({ items: initial }: { items: Item[] }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    setItems(next);
    setDirty(true);
    setStatus(`${x!.title} dipindah ke posisi ${to + 1}.`);
  };

  async function save() {
    const res = await api("/api/admin/education/reorder", {
      body: { ids: items.map((i) => i.id) },
    });
    if (!res.ok) return setStatus(res.error.message);
    setDirty(false);
    setStatus("Urutan disimpan.");
    router.refresh();
  }

  return (
    <section className="card stack">
      <ol className="sortable" aria-label="Urutan materi">
        {items.map((m, i) => (
          <li
            key={m.id}
            draggable={hydrated}
            onDragStart={() => setDragId(m.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              const from = items.findIndex((x) => x.id === dragId);
              if (from >= 0) move(from, i);
              setDragId(null);
            }}
            className={dragId === m.id ? "dragging" : undefined}
          >
            <span className="handle" aria-hidden="true">
              ⋮⋮
            </span>
            <span className="num">{i + 1}</span>
            <span className="emoji" aria-hidden="true">
              {m.icon}
            </span>
            <span>
              <strong>{m.title}</strong>
              <br />
              <span className="small muted">
                {m.unlockDay ? `Terbuka hari ke-${m.unlockDay}` : "Langsung terbuka"} ·{" "}
                {m.questionCount} soal kuis · dibaca {m.readCount} responden
              </span>
            </span>
            <span className={`badge ${m.status === "published" ? "badge-active" : ""}`}>
              {m.status === "published" ? "Terbit" : "Draf"}
            </span>
            <span className="row" style={{ flexWrap: "nowrap" }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => move(i, i - 1)}
                disabled={!hydrated || i === 0}
                aria-label={`Naikkan ${m.title}`}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => move(i, i + 1)}
                disabled={!hydrated || i === items.length - 1}
                aria-label={`Turunkan ${m.title}`}
              >
                ↓
              </button>
              <Link className="btn btn-sm" href={`/admin/edukasi/${m.id}`}>
                Edit
              </Link>
            </span>
          </li>
        ))}
      </ol>
      <div className="row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={save}
          disabled={!hydrated || !dirty}
        >
          Simpan urutan
        </button>
        <span className="small muted" role="status" aria-live="polite">
          {status}
        </span>
      </div>
    </section>
  );
}

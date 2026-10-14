"use client";

import { useEffect, useRef } from "react";
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";
import { categoryColor } from "@/lib/palette";

Chart.register(
  LineController,
  BarController,
  DoughnutController,
  LineElement,
  BarElement,
  ArcElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
);

const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function useChart(make: () => ChartConfiguration, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    Chart.defaults.font.family = css("--font-nunito") || "system-ui";
    Chart.defaults.color = css("--muted");
    Chart.defaults.borderColor = css("--border");
    const chart = new Chart(ref.current, make());
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- grafik dibuat ulang hanya bila data berubah
  }, deps);
  return ref;
}

const grid = { color: () => css("--border") };

/** Grafik garis: perkiraan gula. Nilai null = Belum diisi (celah, tidak digambar sebagai 0). */
export function SugarLineChart({
  labels,
  values,
}: {
  labels: string[];
  values: (number | null)[];
}) {
  const ref = useChart(
    () => ({
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Perkiraan gula (g)",
            data: values,
            borderColor: css("--primary"),
            backgroundColor: "rgba(201, 111, 59, 0.12)",
            fill: true,
            tension: 0.35,
            spanGaps: false,
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: css("--surface"),
            pointBorderColor: css("--primary"),
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ±${c.parsed.y} g (perkiraan)` } },
        },
        scales: {
          y: { beginAtZero: true, grid },
          x: { grid: { display: false } },
        },
      },
    }),
    [labels.join(), values.join()],
  );
  return (
    <div className="chart-box">
      <canvas ref={ref} aria-hidden="true" />
    </div>
  );
}

export function DrinksBarChart({
  labels,
  values,
}: {
  labels: string[];
  values: (number | null)[];
}) {
  const ref = useChart(
    () => ({
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Jumlah minuman",
            data: values,
            backgroundColor: css("--accent"),
            borderRadius: 6,
            maxBarThickness: 36,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 }, grid },
          x: { grid: { display: false } },
        },
      },
    }),
    [labels.join(), values.join()],
  );
  return (
    <div className="chart-box small">
      <canvas ref={ref} aria-hidden="true" />
    </div>
  );
}

/** Donat komposisi jenis minuman; total ditampilkan di tengah, legenda di HTML. */
export function CompositionChart({
  items,
  total,
}: {
  items: { beverage: string; servings: number }[];
  total: number;
}) {
  const ref = useChart(
    () => ({
      type: "doughnut",
      data: {
        labels: items.map((i) => i.beverage),
        datasets: [
          {
            data: items.map((i) => i.servings),
            backgroundColor: items.map((_, i) => categoryColor(i)),
            borderColor: css("--surface"),
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "64%",
        plugins: { legend: { display: false } },
      },
    }),
    [items.map((i) => `${i.beverage}:${i.servings}`).join()],
  );
  return (
    <div className="donut">
      <canvas ref={ref} aria-hidden="true" />
      <div className="donut-center" aria-hidden="true">
        <span className="small muted">Total</span>
        <strong>{total}</strong>
        <span className="small muted">minuman</span>
      </div>
    </div>
  );
}

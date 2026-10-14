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
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";

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
  Legend,
  Filler,
);

const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const PALETTE = [
  "#9c5b2e",
  "#8a9a5b",
  "#d39a5f",
  "#c7b299",
  "#6e5c4e",
  "#e3b98f",
  "#b5c28a",
  "#7e4722",
];

function useChart(make: () => ChartConfiguration) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    Chart.defaults.font.family = css("--font-nunito") || "system-ui";
    Chart.defaults.color = css("--muted");
    const chart = new Chart(ref.current, make());
    return () => chart.destroy();
  }, [make]);
  return ref;
}

/** Grafik garis: perkiraan gula per hari/minggu. Nilai null = Belum diisi (tidak digambar). */
export function SugarLineChart({
  labels,
  values,
  label,
}: {
  labels: string[];
  values: (number | null)[];
  label: string;
}) {
  const ref = useChart(() => ({
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          borderColor: css("--primary"),
          backgroundColor: css("--primary-soft"),
          fill: true,
          tension: 0.3,
          spanGaps: false,
          // Titik terisi dan cukup besar: di awal periode sering hanya ada satu titik.
          pointRadius: 5,
          pointBackgroundColor: css("--primary"),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, title: { display: true, text: "gram (perkiraan)" } } },
    },
  }));
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
  const ref = useChart(() => ({
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Jumlah minuman", data: values, backgroundColor: css("--drink"), borderRadius: 6 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  }));
  return (
    <div className="chart-box">
      <canvas ref={ref} aria-hidden="true" />
    </div>
  );
}

export function CompositionChart({ items }: { items: { beverage: string; servings: number }[] }) {
  const ref = useChart(() => ({
    type: "doughnut",
    data: {
      labels: items.map((i) => i.beverage),
      datasets: [{ data: items.map((i) => i.servings), backgroundColor: PALETTE, borderWidth: 0 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: { legend: { position: "right", labels: { boxWidth: 12 } } },
    },
  }));
  return (
    <div className="chart-box">
      <canvas ref={ref} aria-hidden="true" />
    </div>
  );
}

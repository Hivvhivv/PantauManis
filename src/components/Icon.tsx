/** Ikon garis sederhana (gaya seragam, mengikuti warna teks). Dekoratif: aria-hidden. */
const PATHS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  cup: "M6 8h12l-1.2 12.1a1 1 0 0 1-1 .9H8.2a1 1 0 0 1-1-.9zM5 8h14M10 4l1 4m4-4-1 4",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v4l3 2",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4m8-4v4",
  sugar: "M5 8l7-4 7 4v8l-7 4-7-4zM5 8l7 4 7-4M12 12v8",
  check: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm-4-9 3 3 5-6",
  plus: "M12 5v14M5 12h14",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-10v6m0-9h.01",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  chevron: "M9 6l6 6-6 6",
  target:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zm0 0v16M8 7h7",
  filter: "M4 5h16l-6 7v6l-4 2v-8z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4.3-4.3",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="icon"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

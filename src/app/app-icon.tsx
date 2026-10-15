/** Ikon aplikasi (PWA, ikon layar utama HP): logo tetesan karamel di atas latar krem. */
export function AppIcon({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fbf6ee",
      }}
    >
      {/* Logo memakai 62% lebar agar tetap utuh saat dipotong bulat (maskable). */}
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 32 32">
        <path d="M16 3c4.5 6 9 10.4 9 16a9 9 0 0 1-18 0c0-5.6 4.5-10 9-16z" fill="#9c5b2e" />
        <path
          d="M12.5 20.5a4 4 0 0 0 4 4"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
        <path d="M19 6.5c2.8-2.8 6.5-3 8.5-2.5-.4 2.6-2.4 5.8-6.4 6.2" fill="#8a9a5b" />
      </svg>
    </div>
  );
}

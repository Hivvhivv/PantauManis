/** Logo PantauManis: tetesan karamel dengan daun. */
export function Logo({ size = 28, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 3c4.5 6 9 10.4 9 16a9 9 0 0 1-18 0c0-5.6 4.5-10 9-16z" fill="var(--primary)" />
        <path
          d="M12.5 20.5a4 4 0 0 0 4 4"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity=".8"
        />
        <path d="M19 6.5c2.8-2.8 6.5-3 8.5-2.5-.4 2.6-2.4 5.8-6.4 6.2" fill="var(--accent)" />
      </svg>
      {withText && <span className="logo-text">PantauManis</span>}
    </span>
  );
}

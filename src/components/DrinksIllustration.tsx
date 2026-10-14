/** Ilustrasi dekoratif (gelas es teh, botol air, daun). Tidak membawa informasi. */
export function DrinksIllustration() {
  return (
    <svg viewBox="0 0 320 240" role="presentation" aria-hidden="true" className="illustration">
      <ellipse cx="160" cy="214" rx="120" ry="14" fill="var(--primary-soft)" />
      <circle cx="160" cy="120" r="96" fill="var(--bg-soft)" />
      {/* daun */}
      <path d="M58 150c-6-34 14-58 40-62-2 30-16 52-40 62z" fill="var(--accent)" opacity=".85" />
      <path d="M262 140c6-30-10-54-36-60 0 28 12 50 36 60z" fill="var(--accent)" opacity=".7" />
      <path d="M70 176c14-22 36-30 58-26-14 18-34 28-58 26z" fill="var(--accent)" opacity=".55" />
      {/* gelas */}
      <path d="M110 92h70l-8 116a10 10 0 0 1-10 9h-34a10 10 0 0 1-10-9z" fill="#fff" opacity=".9" />
      <path d="M114 124h62l-5.5 82a8 8 0 0 1-8 7.5h-35a8 8 0 0 1-8-7.5z" fill="var(--drink)" />
      <rect x="124" y="132" width="16" height="16" rx="3" fill="#fff" opacity=".55" />
      <rect x="146" y="146" width="15" height="15" rx="3" fill="#fff" opacity=".45" />
      <path d="M150 40l14 112" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" />
      {/* irisan lemon */}
      <circle cx="178" cy="96" r="16" fill="#F2C65B" />
      <circle cx="178" cy="96" r="11" fill="#F8DE8E" />
      {/* botol */}
      <rect x="196" y="78" width="44" height="138" rx="14" fill="#fff" opacity=".9" />
      <rect x="206" y="62" width="24" height="20" rx="5" fill="var(--primary)" opacity=".85" />
      <rect x="200" y="132" width="36" height="78" rx="10" fill="var(--water)" />
      <rect x="203" y="104" width="30" height="18" rx="5" fill="var(--primary-soft)" />
    </svg>
  );
}

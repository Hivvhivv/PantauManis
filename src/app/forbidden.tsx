import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="narrow stack">
      <h1>Akses ditolak</h1>
      <p>Anda tidak memiliki akses ke halaman ini.</p>
      <Link className="btn" href="/admin">
        Kembali ke Dashboard
      </Link>
    </main>
  );
}

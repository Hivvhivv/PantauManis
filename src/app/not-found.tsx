import Link from "next/link";

export default function NotFound() {
  return (
    <main className="narrow stack">
      <h1>Halaman tidak ditemukan</h1>
      <p>Halaman yang Anda cari tidak ada atau sudah dipindahkan.</p>
      <Link className="btn" href="/">
        Ke halaman utama
      </Link>
    </main>
  );
}

/** Aturan materi edukasi (FR-A-05, FR-R-05). Modul murni. */

/**
 * ID video YouTube dari tautan umum (watch, youtu.be, shorts, embed), atau null.
 * Hanya domain YouTube yang diterima agar tidak bisa menyematkan situs lain.
 */
export function youtubeId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = /^\/(?:shorts|embed|live)\/([^/?#]+)/.exec(u.pathname);
      id = m?.[1] ?? null;
    }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

/** URL embed privasi-tinggi (tanpa cookie pelacakan sebelum diputar). */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

/** Materi terbuka bila tanpa jadwal, atau hari penelitian sudah mencapai hari ke-N. */
export function isUnlocked(unlockDay: number | null, studyDay: number): boolean {
  return unlockDay === null || studyDay >= unlockDay;
}

/** Skor kuis 0–100 dan benar/salah per soal. */
export function scoreQuiz(
  correct: number[],
  answers: number[],
): { score: number; results: boolean[] } {
  const results = correct.map((c, i) => answers[i] === c);
  const score = correct.length
    ? Math.round((results.filter(Boolean).length / correct.length) * 100)
    : 0;
  return { score, results };
}

/** Pesan positif setelah kuis (tanpa label risiko, BR-10). */
export function quizMessage(score: number): string {
  if (score === 100) return "Luar biasa, semua jawabanmu benar! 🎉";
  if (score >= 50) return "Bagus! Sebagian besar sudah tepat. Lihat pembahasan di bawah ya. 💪";
  return "Terima kasih sudah mencoba! Baca lagi materinya dan coba kuisnya sekali lagi. 🌱";
}

import { describe, expect, it } from "vitest";
import { isUnlocked, quizMessage, scoreQuiz, youtubeId } from "@/server/modules/education/rules";
import { detectImageType, isMediaKey } from "@/server/storage/media";
import { FORBIDDEN_FEEDBACK_WORDS } from "@/server/modules/goals/feedback";

describe("tautan YouTube", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=10", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("%s → %s", (url, id) => expect(youtubeId(url)).toBe(id));

  it.each([
    "https://vimeo.com/123",
    "https://evil.example/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "https://www.youtube.com/watch?v=pendek",
    "bukan url",
  ])("menolak %s", (url) => expect(youtubeId(url)).toBeNull());
});

describe("jadwal materi", () => {
  it("tanpa jadwal selalu terbuka; hari ke-N terbuka mulai hari itu", () => {
    expect(isUnlocked(null, 1)).toBe(true);
    expect(isUnlocked(3, 2)).toBe(false);
    expect(isUnlocked(3, 3)).toBe(true);
  });
});

describe("kuis", () => {
  it("skor 0–100 dan hasil per soal", () => {
    expect(scoreQuiz([0, 2, 1], [0, 2, 3])).toEqual({ score: 67, results: [true, true, false] });
    expect(scoreQuiz([1, 1], [1, 1]).score).toBe(100);
  });

  it("pesan positif tanpa label risiko", () => {
    for (const s of [0, 33, 67, 100]) {
      const m = quizMessage(s).toLowerCase();
      for (const w of FORBIDDEN_FEEDBACK_WORDS) expect(m).not.toContain(w);
    }
  });
});

describe("validasi gambar", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");

  it("mengenali dari isi file", () => {
    expect(detectImageType(png)?.ext).toBe("png");
    expect(detectImageType(jpg)?.ext).toBe("jpg");
    expect(detectImageType(webp)?.ext).toBe("webp");
  });

  it("menolak file lain walau berekstensi gambar", () => {
    expect(detectImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
  });

  it("kunci media hanya edukasi/<uuid>.<ext>", () => {
    expect(isMediaKey("edukasi/0b3c2c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f.png")).toBe(true);
    expect(isMediaKey("edukasi/../../.env")).toBe(false);
    expect(isMediaKey("lain/0b3c2c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f.png")).toBe(false);
    expect(isMediaKey("edukasi/0b3c2c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f.svg")).toBe(false);
  });
});

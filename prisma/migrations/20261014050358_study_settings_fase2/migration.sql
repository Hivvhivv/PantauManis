-- Pengaturan Fase 2 (ADR-005). Nilai dapat diubah lewat Pengaturan Penelitian (Fase berikutnya).
-- Faktor tingkat gula untuk estimasi: normal = 1, less = 0.5, no sugar = 0.
INSERT INTO "study_settings" ("key", "value") VALUES
  ('sugar_factor_less', '0.5'),
  ('sugar_factor_none', '0'),
  ('consent_text', 'CONTOH – ganti dengan lembar informasi penelitian yang disetujui komite etik.

Penelitian ini mengajak kamu mencatat konsumsi minuman manis setiap hari selama 14 hari. Datamu diidentifikasi dengan ID Responden, bukan nama. Kamu boleh berhenti kapan saja tanpa konsekuensi. Website ini bukan alat diagnosis dan tidak menggantikan konsultasi dengan tenaga kesehatan.')
ON CONFLICT ("key") DO NOTHING;
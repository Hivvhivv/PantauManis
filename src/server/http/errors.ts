/**
 * Error aplikasi dengan format respons seragam (PRD bagian 10):
 * { error: { code, message, fields } }. Pesan untuk pengguna dalam Bahasa Indonesia
 * dan tidak pernah memuat kode akses, kata sandi, token, atau jawaban kuesioner.
 */
export type FieldErrors = Record<string, string>;

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: FieldErrors,
  ) {
    super(message);
  }
}

export const unauthenticated = () =>
  new AppError(401, "UNAUTHENTICATED", "Sesi Anda telah berakhir. Silakan masuk kembali.");
export const forbidden = (message = "Anda tidak memiliki akses ke fitur ini.") =>
  new AppError(403, "FORBIDDEN", message);
export const notFound = (message = "Data tidak ditemukan.") =>
  new AppError(404, "NOT_FOUND", message);
export const conflict = (message: string, fields?: FieldErrors) =>
  new AppError(409, "CONFLICT", message, fields);
export const validationError = (fields: FieldErrors, message = "Periksa kembali isian Anda.") =>
  new AppError(422, "VALIDATION_ERROR", message, fields);
export const businessRule = (code: string, message: string) => new AppError(422, code, message);
export const tooManyRequests = (message: string) => new AppError(429, "TOO_MANY_REQUESTS", message);

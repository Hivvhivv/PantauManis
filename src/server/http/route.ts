import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AppError, forbidden, notFound, validationError, type FieldErrors } from "./errors";

type Ctx<P> = { params: Promise<P> };
type Handler<P> = (req: NextRequest, ctx: Ctx<P>) => Promise<Response>;

/**
 * Pembungkus semua Route Handler:
 * - pemeriksaan Origin untuk request yang mengubah data (CSRF, ADR-003);
 * - format error seragam;
 * - error tak terduga dicatat tanpa isi request (bisa memuat rahasia).
 */
export function route<P = Record<string, never>>(handler: Handler<P>): Handler<P> {
  return async (req, ctx) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

function errorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, fields: err.fields ?? {} } },
      { status: err.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (err instanceof z.ZodError) return errorResponse(validationError(zodFieldErrors(err)));
  if ((err as { code?: unknown })?.code === "P2002") {
    return errorResponse(
      new AppError(409, "CONFLICT", "Data bentrok dengan data lain. Silakan coba lagi."),
    );
  }
  // Hanya nama dan kode error yang dicatat. Pesan error (mis. dari Prisma) bisa memuat isi
  // query/request yang mengandung data sensitif.
  const name = err instanceof Error ? err.name : "unknown";
  const code = (err as { code?: unknown })?.code;
  console.error("Kesalahan server tak terduga:", name, typeof code === "string" ? code : "");
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Terjadi kesalahan pada server. Coba lagi nanti.",
        fields: {},
      },
    },
    { status: 500 },
  );
}

function zodFieldErrors(err: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return; // Klien non-browser; cookie SameSite=Lax tetap berlaku.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden("Permintaan ditolak.");
  }
  if (!host || originHost !== host) throw forbidden("Permintaan ditolak.");
}

/** Membaca body JSON lalu memvalidasinya dengan skema zod. */
export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw validationError({}, "Format permintaan tidak valid.");
  }
  return schema.parse(body);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return ip.slice(0, 64);
}

export function userAgent(req: Request): string | null {
  return req.headers.get("user-agent")?.slice(0, 255) ?? null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parameter [id] dari URL; ID yang tidak valid diperlakukan sebagai tidak ditemukan. */
export async function idParam(ctx: { params: Promise<{ id: string }> }): Promise<string> {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) throw notFound();
  return id;
}

export function json(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

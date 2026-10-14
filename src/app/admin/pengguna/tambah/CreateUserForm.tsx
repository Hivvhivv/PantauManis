"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";
import { FieldError } from "@/components/FieldError";
import { IssuedCodes, type IssuedCodeView } from "@/components/IssuedCodes";
import { RespondentFields, respondentFormValues } from "@/components/RespondentFields";

type Role = "" | "superadmin" | "admin" | "respondent";
type Result =
  | { kind: "staff"; id: string; temporaryPassword: string | null }
  | { kind: "respondent"; issued: IssuedCodeView };

/** Form Tambah Pengguna dengan dropdown Peran; kolom menyesuaikan peran (FR-S-01, AC-08). */
export function CreateUserForm({ nextLabel }: { nextLabel: string }) {
  const hydrated = useHydrated();
  const [role, setRole] = useState<Role>("");
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body =
      role === "respondent"
        ? { role, ...respondentFormValues(form) }
        : {
            role,
            name: form.get("name"),
            email: form.get("email"),
            password: form.get("password"),
          };
    setBusy(true);
    setError(null);
    const res = await api<Result>("/api/superadmin/users", { body });
    setBusy(false);
    if (res.ok) setResult(res.data);
    else setError(res.error);
  }

  if (result?.kind === "respondent") {
    return (
      <IssuedCodes title={`Responden ${result.issued.label} dibuat`} items={[result.issued]} />
    );
  }
  if (result?.kind === "staff") {
    return (
      <section className="card stack" style={{ maxWidth: 560 }}>
        <h2 style={{ margin: 0 }}>Akun staf dibuat</h2>
        {result.temporaryPassword ? (
          <>
            <p>
              Kata sandi sementara (hanya ditampilkan sekali, wajib diganti saat login pertama):
            </p>
            <p className="mono" style={{ fontSize: "1.3rem" }}>
              {result.temporaryPassword}
            </p>
          </>
        ) : (
          <p>Pengguna wajib mengganti kata sandi saat login pertama.</p>
        )}
        <Link className="btn" href="/admin/pengguna">
          Kembali ke Manajemen Pengguna
        </Link>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} method="post" className="card stack" style={{ maxWidth: 560 }}>
      <div>
        <label htmlFor="role">Peran</label>
        <select
          id="role"
          name="role"
          value={role}
          disabled={!hydrated}
          onChange={(e) => {
            setRole(e.target.value as Role);
            setError(null);
          }}
          required
        >
          <option value="" disabled>
            Pilih peran…
          </option>
          <option value="superadmin">Superadmin</option>
          <option value="admin">Admin</option>
          <option value="respondent">Responden</option>
        </select>
        <FieldError error={error} name="role" />
      </div>

      {(role === "admin" || role === "superadmin") && (
        <>
          <div>
            <label htmlFor="name">Nama</label>
            <input id="name" name="name" maxLength={100} required />
            <FieldError error={error} name="name" />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required />
            <FieldError error={error} name="email" />
          </div>
          <div>
            <label htmlFor="password">
              Kata sandi awal{" "}
              <span className="hint">kosongkan agar dibuat sistem; min. 8 karakter</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
            />
            <FieldError error={error} name="password" />
          </div>
          <p className="small muted">
            Status awal: aktif. Pengguna wajib mengganti kata sandi saat login pertama.
          </p>
        </>
      )}

      {role === "respondent" && (
        <>
          <RespondentFields error={error} labelPlaceholder={nextLabel} />
          <p className="small muted">Kode akses dibuat otomatis setelah disimpan.</p>
        </>
      )}

      {error && (
        <p className="alert alert-error" role="alert">
          {error.message}
        </p>
      )}
      <button className="btn btn-primary" type="submit" disabled={!hydrated || busy || !role}>
        Simpan
      </button>
    </form>
  );
}

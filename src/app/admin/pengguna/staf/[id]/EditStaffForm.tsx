"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiError } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";
import { FieldError } from "@/components/FieldError";
import { ROLE_LABELS } from "@/lib/format";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin";
  isActive: boolean;
};

export function EditStaffForm({ staff, isSelf }: { staff: Staff; isSelf: boolean }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const role = form.get("role") as Staff["role"];
    const roleChanged = role !== staff.role;
    if (
      roleChanged &&
      !confirm(
        `Ubah peran ${staff.name} dari ${ROLE_LABELS[staff.role]} menjadi ${ROLE_LABELS[role]}?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await api(`/api/superadmin/staff/${staff.id}`, {
      method: "PATCH",
      body: {
        name: form.get("name"),
        email: form.get("email"),
        role,
        isActive: form.get("isActive") === "on",
        confirmRoleChange: roleChanged,
      },
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setNotice("Perubahan disimpan.");
    router.refresh();
  }

  async function resetPassword() {
    if (!confirm(`Reset kata sandi ${staff.name}? Semua sesi aktifnya akan diakhiri.`)) return;
    setBusy(true);
    setError(null);
    const res = await api<{ temporaryPassword: string }>(
      `/api/superadmin/staff/${staff.id}/reset-password`,
      {
        method: "POST",
      },
    );
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setTempPassword(res.data.temporaryPassword);
  }

  async function remove() {
    if (!confirm(`Hapus akun ${staff.name}? Akun dinonaktifkan dan disembunyikan (hapus lunak).`))
      return;
    setBusy(true);
    const res = await api(`/api/superadmin/staff/${staff.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push("/admin/pengguna");
    router.refresh();
  }

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <form onSubmit={onSubmit} method="post" className="card stack">
        <div>
          <label htmlFor="name">Nama</label>
          <input id="name" name="name" defaultValue={staff.name} maxLength={100} required />
          <FieldError error={error} name="name" />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" defaultValue={staff.email} required />
          <FieldError error={error} name="email" />
        </div>
        <div>
          <label htmlFor="role">Peran</label>
          <select
            id="role"
            name="role"
            defaultValue={staff.role}
            disabled={isSelf && staff.role === "superadmin"}
          >
            <option value="superadmin">Superadmin</option>
            <option value="admin">Admin</option>
          </select>
          {isSelf && staff.role === "superadmin" && (
            <input type="hidden" name="role" value="superadmin" />
          )}
          <p className="hint">
            {isSelf
              ? "Anda tidak dapat menurunkan peran akun Anda sendiri."
              : "Akun staf tidak dapat diubah menjadi Responden; buat akun Responden baru sebagai gantinya."}
          </p>
          <FieldError error={error} name="role" />
        </div>
        <div className="row">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            defaultChecked={staff.isActive}
            disabled={isSelf}
            style={{ width: 24, minHeight: 24 }}
          />
          {isSelf && <input type="hidden" name="isActive" value="on" />}
          <label htmlFor="isActive" style={{ margin: 0 }}>
            Akun aktif
          </label>
        </div>
        {error && Object.keys(error.fields).length === 0 && (
          <p className="alert alert-error" role="alert">
            {error.message}
          </p>
        )}
        {notice && (
          <p className="alert alert-info" role="status">
            {notice}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={!hydrated || busy}>
          Simpan perubahan
        </button>
      </form>

      {!isSelf && (
        <section className="card stack">
          <h2 style={{ margin: 0 }}>Tindakan lain</h2>
          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={resetPassword}
              disabled={!hydrated || busy}
            >
              Reset kata sandi
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={remove}
              disabled={!hydrated || busy}
            >
              Hapus akun
            </button>
          </div>
          {tempPassword && (
            <div className="alert alert-info" role="status">
              <p style={{ margin: 0 }}>Kata sandi sementara (hanya ditampilkan sekali):</p>
              <p className="mono" style={{ fontSize: "1.2rem", margin: 0 }}>
                {tempPassword}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

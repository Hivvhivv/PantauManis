import type { ApiError } from "@/lib/api-client";
import { FieldError } from "./FieldError";

export type RespondentDefaults = {
  label?: string;
  initials?: string | null;
  startDate?: string;
  notes?: string | null;
};

/** Kolom form Responden (dipakai di Tambah/Edit Responden dan Tambah Pengguna peran Responden). */
export function RespondentFields({
  error,
  defaults = {},
  labelPlaceholder,
  labelRequired = false,
}: {
  error: ApiError | null;
  defaults?: RespondentDefaults;
  labelPlaceholder?: string;
  labelRequired?: boolean;
}) {
  return (
    <>
      <div>
        <label htmlFor="label">
          ID Responden{" "}
          {!labelRequired && (
            <span className="hint">kosongkan untuk dibuat otomatis ({labelPlaceholder})</span>
          )}
        </label>
        <input
          id="label"
          name="label"
          defaultValue={defaults.label ?? ""}
          placeholder={labelPlaceholder}
          maxLength={20}
          required={labelRequired}
          aria-invalid={error?.fields.label ? true : undefined}
        />
        <FieldError error={error} name="label" />
      </div>
      <div>
        <label htmlFor="initials">
          Label/inisial <span className="hint">opsional, bukan nama lengkap</span>
        </label>
        <input
          id="initials"
          name="initials"
          defaultValue={defaults.initials ?? ""}
          maxLength={10}
        />
        <FieldError error={error} name="initials" />
      </div>
      <div>
        <label htmlFor="startDate">
          Tanggal mulai <span className="hint">opsional</span>
        </label>
        <input
          id="startDate"
          name="startDate"
          type="date"
          defaultValue={defaults.startDate ?? ""}
        />
        <FieldError error={error} name="startDate" />
      </div>
      <div>
        <label htmlFor="notes">
          Catatan admin <span className="hint">opsional</span>
        </label>
        <textarea id="notes" name="notes" defaultValue={defaults.notes ?? ""} maxLength={2000} />
        <FieldError error={error} name="notes" />
      </div>
    </>
  );
}

export function respondentFormValues(form: FormData) {
  return {
    label: String(form.get("label") ?? ""),
    initials: String(form.get("initials") ?? ""),
    startDate: String(form.get("startDate") ?? ""),
    notes: String(form.get("notes") ?? ""),
  };
}

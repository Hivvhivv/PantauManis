/**
 * Aturan perubahan akun staf (PRD FR-S-02). Modul murni agar mudah diuji.
 * Perubahan Responden ↔ Admin/Superadmin tidak mungkin di sini karena tabelnya terpisah (ADR-003).
 */
import type { StaffRole } from "@/generated/prisma/client";

type StaffTarget = { id: string; role: StaffRole; isActive: boolean };
export type StaffChange = { role?: StaffRole; isActive?: boolean; delete?: boolean };

type RuleViolation = { code: string; message: string } | null;

export function checkStaffChange(params: {
  actorId: string;
  target: StaffTarget;
  change: StaffChange;
  /** Jumlah Superadmin aktif saat ini (termasuk target bila ia Superadmin aktif). */
  activeSuperadmins: number;
}): RuleViolation {
  const { actorId, target, change, activeSuperadmins } = params;
  const isSelf = actorId === target.id;

  if (isSelf && change.delete) {
    return { code: "SELF_DELETE", message: "Anda tidak dapat menghapus akun Anda sendiri." };
  }
  if (isSelf && change.isActive === false) {
    return {
      code: "SELF_DEACTIVATE",
      message: "Anda tidak dapat menonaktifkan akun Anda sendiri.",
    };
  }
  if (isSelf && target.role === "superadmin" && change.role && change.role !== "superadmin") {
    return { code: "SELF_DEMOTE", message: "Anda tidak dapat menurunkan peran akun Anda sendiri." };
  }

  const losesSuperadmin =
    target.role === "superadmin" &&
    target.isActive &&
    (change.delete ||
      change.isActive === false ||
      (change.role !== undefined && change.role !== "superadmin"));
  if (losesSuperadmin && activeSuperadmins <= 1) {
    return {
      code: "LAST_SUPERADMIN",
      message: "Sistem harus memiliki minimal satu Superadmin aktif.",
    };
  }
  return null;
}

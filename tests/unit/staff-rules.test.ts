import { describe, expect, it } from "vitest";
import { checkStaffChange } from "@/server/modules/staff-users/rules";

const SUPER = { id: "s1", role: "superadmin" as const, isActive: true };
const ADMIN = { id: "a1", role: "admin" as const, isActive: true };

describe("aturan perubahan staf (FR-S-02)", () => {
  it("Superadmin tidak dapat menurunkan perannya sendiri (AC-09)", () => {
    const v = checkStaffChange({
      actorId: "s1",
      target: SUPER,
      change: { role: "admin" },
      activeSuperadmins: 3,
    });
    expect(v?.code).toBe("SELF_DEMOTE");
  });

  it("tidak dapat menonaktifkan atau menghapus diri sendiri", () => {
    expect(
      checkStaffChange({
        actorId: "s1",
        target: SUPER,
        change: { isActive: false },
        activeSuperadmins: 3,
      })?.code,
    ).toBe("SELF_DEACTIVATE");
    expect(
      checkStaffChange({
        actorId: "s1",
        target: SUPER,
        change: { delete: true },
        activeSuperadmins: 3,
      })?.code,
    ).toBe("SELF_DELETE");
  });

  it("menolak jika Superadmin aktif menjadi nol", () => {
    const target = { id: "s2", role: "superadmin" as const, isActive: true };
    for (const change of [{ role: "admin" as const }, { isActive: false }, { delete: true }]) {
      expect(checkStaffChange({ actorId: "s1", target, change, activeSuperadmins: 1 })?.code).toBe(
        "LAST_SUPERADMIN",
      );
    }
  });

  it("mengizinkan Admin ↔ Superadmin bila masih ada Superadmin lain", () => {
    expect(
      checkStaffChange({
        actorId: "s1",
        target: ADMIN,
        change: { role: "superadmin" },
        activeSuperadmins: 1,
      }),
    ).toBeNull();
    const s2 = { id: "s2", role: "superadmin" as const, isActive: true };
    expect(
      checkStaffChange({
        actorId: "s1",
        target: s2,
        change: { role: "admin" },
        activeSuperadmins: 2,
      }),
    ).toBeNull();
  });

  it("mengubah Superadmin nonaktif tidak mengurangi jumlah aktif", () => {
    const inactive = { id: "s3", role: "superadmin" as const, isActive: false };
    expect(
      checkStaffChange({
        actorId: "s1",
        target: inactive,
        change: { delete: true },
        activeSuperadmins: 1,
      }),
    ).toBeNull();
  });
});

import type { Metadata } from "next";
import { RespondentShell } from "@/components/RespondentShell";
import { ZeroDayButton } from "@/components/ZeroDayButton";
import { respondentAtStage } from "@/server/auth/page-guards";
import { logFormData } from "@/server/modules/consumption/form-data";
import { LogForm } from "./LogForm";

export const metadata: Metadata = { title: "Catat Minuman" };

export default async function CatatPage() {
  const r = await respondentAtStage("ready");
  const { nowLocal, today, ...data } = await logFormData(r);

  return (
    <RespondentShell>
      <div>
        <h1 style={{ margin: 0 }}>Catat Minuman</h1>
        <p className="muted" style={{ margin: "0.25rem 0 0" }}>
          Pilih minuman manis yang kamu minum. Cukup kurang dari satu menit!
        </p>
      </div>
      <LogForm
        {...data}
        initial={{
          beverageTypeId: "",
          volumeMl: "",
          servings: 1,
          sugarLevel: null,
          consumedAt: nowLocal,
          note: "",
        }}
      />
      <section className="card stack">
        <p style={{ margin: 0 }}>Tidak minum minuman manis hari ini?</p>
        <ZeroDayButton date={today} />
      </section>
    </RespondentShell>
  );
}

import type { Metadata } from "next";
import { Disclaimer } from "@/components/Disclaimer";
import { DrinksIllustration } from "@/components/DrinksIllustration";
import { RespondentShell } from "@/components/RespondentShell";
import { ZeroDayButton } from "@/components/ZeroDayButton";
import { respondentAtStage } from "@/server/auth/page-guards";
import { logFormData } from "@/server/modules/consumption/form-data";
import { LogForm } from "./LogForm";

export const metadata: Metadata = { title: "Catat Minuman" };

export default async function CatatPage() {
  const r = await respondentAtStage("ready");
  const { today, todayRecorded, ...data } = await logFormData(r);

  return (
    <RespondentShell wide label={r.label}>
      <section className="dash-hero page-hero">
        <div className="stack">
          <p className="eyebrow">Catat minuman</p>
          <h1>Yuk, catat minumanmu!</h1>
          <p className="lead-text muted">
            Pilih jenis minuman, lalu isi ukuran dan waktunya. Cukup kurang dari satu menit.
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <DrinksIllustration />
          <p className="hero-quote">
            Catat hari ini,
            <br />
            kenali kebiasaanmu ♡
          </p>
        </div>
      </section>

      <LogForm
        {...data}
        initial={{
          beverageTypeId: "",
          volumeMl: "",
          servings: 1,
          sugarLevel: null,
          consumedAt: data.nowLocal,
          note: "",
        }}
      />

      {!todayRecorded && (
        <section className="card zero-card">
          <div>
            <strong>Tidak minum minuman manis hari ini?</strong>
            <div className="small muted">
              Tandai hari ini sebagai Nol. Ini berbeda dari hari yang belum diisi.
            </div>
          </div>
          <ZeroDayButton date={today} />
        </section>
      )}

      <Disclaimer />
    </RespondentShell>
  );
}

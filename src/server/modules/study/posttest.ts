/**
 * Jendela posttest (FR-R-07, BR-06): terbuka pada hari terakhir periode dan tetap terbuka
 * selama masa tenggang. Dengan default 14 + 3: hari ke-14 sampai ke-17. Modul murni.
 */
import { addDays, studyDayOf } from "./days";

export type PosttestState = "not_yet" | "open" | "closed" | "submitted";

export function posttestWindow(dayOne: string, durationDays: number, graceDays: number) {
  return {
    opens: addDays(dayOne, durationDays - 1),
    closes: addDays(dayOne, durationDays - 1 + graceDays),
  };
}

export function posttestState(params: {
  dayOne: string;
  today: string;
  durationDays: number;
  graceDays: number;
  submitted: boolean;
}): PosttestState {
  if (params.submitted) return "submitted";
  const day = studyDayOf(params.dayOne, params.today);
  if (day < params.durationDays) return "not_yet";
  if (day <= params.durationDays + params.graceDays) return "open";
  return "closed";
}

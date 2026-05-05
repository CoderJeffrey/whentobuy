import { DateTime } from "luxon";

export function nowEt(): DateTime {
  return DateTime.now().setZone("America/New_York");
}

export function isNinePmEt(now: DateTime = nowEt()): boolean {
  return now.hour === 21;
}

export function formatLongDateEt(now: DateTime = nowEt()): string {
  return now.toLocaleString({
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

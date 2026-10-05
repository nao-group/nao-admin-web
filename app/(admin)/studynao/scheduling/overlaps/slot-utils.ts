import type { Slot } from "./types";

export const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
export const minuteText = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
export const slotKey = (slot: Slot) => `${slot.weekday}:${slot.start_minute}:${slot.end_minute}`;
export const slotLabel = (slot: Slot) => `${DAYS[slot.weekday]} ${minuteText(slot.start_minute)}–${minuteText(slot.end_minute)} WIB`;

export function overlapsForDay(student: Slot[], teacher: Slot[], weekday: number): Slot[] {
  const intersections: Slot[] = [];
  for (const a of student.filter((slot) => slot.weekday === weekday)) {
    for (const b of teacher.filter((slot) => slot.weekday === weekday)) {
      const start_minute = Math.max(a.start_minute, b.start_minute);
      const end_minute = Math.min(a.end_minute, b.end_minute);
      if (end_minute > start_minute) intersections.push({ weekday, start_minute, end_minute });
    }
  }
  intersections.sort((a, b) => a.start_minute - b.start_minute);
  return intersections.reduce<Slot[]>((result, slot) => {
    const last = result.at(-1);
    if (last && slot.start_minute <= last.end_minute) last.end_minute = Math.max(last.end_minute, slot.end_minute);
    else result.push({ ...slot });
    return result;
  }, []);
}

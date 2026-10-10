type Slot = { weekday: number; start_minute: number; end_minute: number };
type Session = { starts_at: string; ends_at: string; status: string };
// Monday=0; construct dates explicitly in Jakarta, independent of browser timezone.
export function weeklyTeacherConflict(slot: Slot, firstDate: string, weeks: number, sessions: Session[]): boolean {
  if (!firstDate) return false;
  const first = Date.parse(`${firstDate}T00:00:00+07:00`);
  if (!Number.isFinite(first)) return false;
  const weekday = (new Date(`${firstDate}T00:00:00Z`).getUTCDay() + 6) % 7;
  for (let offset = (slot.weekday - weekday + 7) % 7; offset < weeks * 7; offset += 7) {
    const start = first + (offset * 1440 + slot.start_minute) * 60000;
    const end = first + (offset * 1440 + slot.end_minute) * 60000;
    if (sessions.some(session => session.status !== "cancelled" && Date.parse(session.starts_at) < end && Date.parse(session.ends_at) > start)) return true;
  }
  return false;
}

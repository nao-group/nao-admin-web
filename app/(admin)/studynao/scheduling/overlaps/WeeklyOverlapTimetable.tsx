"use client";

import { useState } from "react";
import { Text } from "@mantine/core";
import type { Slot, TeacherMatch } from "./types";
import { DAYS, minuteText, overlapsForDay, slotKey, slotLabel } from "./slot-utils";
import styles from "./overlaps.module.css";

const START = 7 * 60;
const PIXELS_PER_MINUTE = 1.1;
const position = (slot: Slot) => ({ top: (slot.start_minute - START) * PIXELS_PER_MINUTE, height: (slot.end_minute - slot.start_minute) * PIXELS_PER_MINUTE });

export function WeeklyOverlapTimetable({ student, teacher, selected, duration, detailedAvailability, onToggle }: {
  student: Slot[];
  teacher: TeacherMatch | undefined;
  selected: Slot[];
  duration: number;
  detailedAvailability: boolean;
  onToggle: (slot: Slot) => void;
}) {
  const [preview, setPreview] = useState<Slot | null>(null);
  return <div className={styles.timetableScroll}><div className={styles.timetable}>
    <div className={styles.timeAxis}><div className={styles.timeHeader} />{Array.from({ length: 16 }, (_, hour) => <span key={hour} style={{ top: 40 + hour * 60 * PIXELS_PER_MINUTE }}>{String(hour + 7).padStart(2, "0")}:00</span>)}</div>
    {DAYS.map((day, weekday) => {
      const studentDay = student.filter((slot) => slot.weekday === weekday);
      const teacherDay = (teacher?.teacher_availability ?? []).filter((slot) => slot.weekday === weekday);
      const candidates = (teacher?.slots ?? []).filter((slot) => slot.weekday === weekday);
      const overlapDay = teacher ? detailedAvailability
        ? overlapsForDay(student, teacherDay, weekday)
        : overlapsForDay(candidates, candidates, weekday) : [];
      return <div className={styles.dayColumn} key={day}><Text className={styles.dayHeader} fw={700} size="sm">{day}</Text><div className={styles.dayBody}>
        {studentDay.map((slot, index) => <div key={`student-${index}`} className={styles.studentBlock} style={position(slot)} title={`Murid: ${slotLabel(slot)}`} />)}
        {teacherDay.map((slot, index) => <div key={`teacher-${index}`} className={styles.teacherBlock} style={position(slot)} title={`${teacher?.teacher_name}: ${slotLabel(slot)}`} />)}
        {overlapDay.map((slot, index) => <div key={`overlap-${index}`} className={styles.overlapBlock} style={position(slot)} title={`${detailedAvailability ? "Irisan jadwal" : "Rentang kelas valid"}: ${slotLabel(slot)} (${slot.end_minute - slot.start_minute} menit)`}><span>{slot.end_minute - slot.start_minute} mnt {detailedAvailability ? "irisan" : "rentang"}</span></div>)}
        {(teacher?.busy_slots ?? []).filter(slot => slot.weekday === weekday).map((slot, index) => <div key={`busy-${index}`} className={styles.busyBlock} style={position(slot)} title={`Guru sudah mengajar ${slot.code} · ${slot.date} · ${slotLabel(slot)} WIB`}><span>Terisi · {slot.code}</span></div>)}
        {selected.filter((slot) => slot.weekday === weekday).map((slot) => <div key={`selected-${slotKey(slot)}`} className={styles.selectedBlock} style={position(slot)}><span>{minuteText(slot.start_minute)}–{minuteText(slot.end_minute)}</span></div>)}
        {preview?.weekday === weekday && !selected.some((slot) => slotKey(slot) === slotKey(preview)) && <div className={styles.previewBlock} style={position(preview)}><span>{duration} mnt</span></div>}
        {candidates.map((slot) => <button key={slotKey(slot)} type="button" className={styles.candidate} data-selected={selected.some((item) => slotKey(item) === slotKey(slot)) || undefined} style={{ top: (slot.start_minute - START) * PIXELS_PER_MINUTE }} onMouseEnter={() => setPreview(slot)} onMouseLeave={() => setPreview(null)} onFocus={() => setPreview(slot)} onBlur={() => setPreview(null)} onClick={() => onToggle(slot)} aria-label={`${selected.some((item) => slotKey(item) === slotKey(slot)) ? "Hapus" : "Pilih"} ${slotLabel(slot)} untuk kelas ${duration} menit.`} title={`${slotLabel(slot)} · kelas ${duration} menit` }><span className={styles.candidateDot} /></button>)}
      </div></div>;
    })}
  </div></div>;
}

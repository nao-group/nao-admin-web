import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/(admin)/studynao/classes/data.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { classStatus, sessionStatus, classSessions, sessionRange } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const course = { id: 1, status: "active", first_date: "2026-10-07" };
const session = { id: 1, class_id: 1, session_number: 1, status: "scheduled", starts_at: "2026-10-07T09:00:00+07:00", ends_at: "2026-10-07T10:15:00+07:00" };

test("class period uses exact WIB session boundaries independently of missing logs", () => {
  assert.equal(classStatus(course, [session], Date.parse("2026-10-07T08:59:59+07:00")), "not_started");
  assert.equal(classStatus(course, [session], Date.parse(session.starts_at)), "ongoing");
  assert.equal(classStatus(course, [session], Date.parse(session.ends_at)), "completed");
  assert.equal(sessionStatus(session, Date.parse(session.ends_at)), "awaiting_log");
});
test("cancelled sessions do not extend the active class period", () => {
  const cancelled = { ...session, id: 2, status: "cancelled", ends_at: "2026-11-01T10:15:00+07:00" };
  assert.equal(classStatus(course, [session, cancelled], Date.parse("2026-10-08T00:00:00+07:00")), "completed");
  assert.equal(classStatus({ ...course, status: "cancelled" }, [session], Date.now()), "cancelled");
});
test("only recorded completion or submitted logs count as completed sessions", () => {
  const now = Date.parse("2026-10-07T09:30:00+07:00");
  assert.equal(sessionStatus(session, now), "in_progress");
  assert.equal(sessionStatus({ ...session, status: "completed" }, now), "completed");
  assert.equal(sessionStatus({ ...session, operations: { submitted_at: "2026-10-07T10:16:00+07:00" } }, now), "completed");
  assert.equal(sessionStatus({ ...session, status: "cancelled", operations: { submitted_at: "2026-10-07T10:16:00+07:00" } }, now), "cancelled");
});
test("session links only select sessions belonging to the class, in session order", () => {
  const other = { ...session, id: 3, class_id: 2 };
  const second = { ...session, id: 2, session_number: 2 };
  assert.deepEqual(classSessions([second, other, session], 1).map((item) => item.id), [1, 2]);
  assert.equal(sessionRange(session), "09:00–10:15 WIB");
});

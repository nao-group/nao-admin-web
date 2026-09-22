"use client";

import { useCallback, useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { notifications } from "@mantine/notifications";
import { Alert, Badge, Box, Button, Card, Center, Divider, Drawer, FileButton, Group, Image, Loader, Menu, Modal, Pagination, ScrollArea, Select, SimpleGrid, Stack, Table, Tabs, Text, Textarea, TextInput, ThemeIcon, UnstyledButton } from "@mantine/core";
import { IconAlertCircle, IconAlertTriangle, IconCheck, IconChevronDown, IconClock, IconEdit, IconFlag, IconMessageReport, IconPhoto, IconSearch, IconTrash, IconUpload, IconUser } from "@tabler/icons-react";
import { MarkdownLatexText } from "@/components/markdown-latex-text";
import { DetailItem, PageHeader } from "@/components/ui/admin";
import { getReportFilters, getReports, removeReportedImage, replaceReportedImage, saveReportedQuestion, setReportStatus } from "./api";
import type { QuestionReport, ReportFilters, ReportPage, ReportQuestion, ReportStatus } from "./data";

const STATUS_OPTIONS: ReportStatus[] = ["Open", "In review", "Resolved", "Dismissed"];
const EMPTY_PAGE: ReportPage = { items: [], total: 0, page: 1, pageSize: 20 };
const EMPTY_FILTERS: ReportFilters = { subjects: [], reasons: [] };
type ReportColumnKey = "report" | "question" | "subject" | "reason" | "reporter" | "reportedAt" | "status";
const DEFAULT_REPORT_COLUMN_WIDTHS: Record<ReportColumnKey, number> = {
  report: 140, question: 210, subject: 150, reason: 230, reporter: 230, reportedAt: 180, status: 140,
};
const MIN_REPORT_COLUMN_WIDTHS: Record<ReportColumnKey, number> = {
  report: 110, question: 150, subject: 110, reason: 150, reporter: 160, reportedAt: 140, status: 110,
};

function statusColor(status: ReportStatus): string {
  if (status === "Resolved") return "teal";
  if (status === "In review") return "blue";
  if (status === "Open") return "orange";
  return "gray";
}

function reasonColor(reason: string): string {
  const normalized = reason.toLowerCase();
  if (normalized.includes("answer key")) return "red";
  if (normalized.includes("formula")) return "orange";
  if (normalized.includes("typo") || normalized.includes("language")) return "violet";
  if (normalized.includes("unclear") || normalized.includes("ambiguous")) return "yellow";
  return "gray";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Shanghai" }).format(new Date(value));
}

function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <Badge color={statusColor(status)} variant="light" leftSection={<span className="status-dot" />}>{status}</Badge>;
}

function QuestionContent({ question, language }: { question: ReportQuestion; language: "en" | "zh" }) {
  const prompt = language === "en" ? question.promptEn : question.promptZh;
  const choices = language === "en" ? question.choicesEn : question.choicesZh;
  return <Stack gap="md"><MarkdownLatexText>{prompt || "Question text is unavailable."}</MarkdownLatexText>{Object.keys(choices).length > 0 && <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">{Object.entries(choices).map(([key, value]) => <Card key={key} withBorder radius="md" padding="sm" className={key === question.answer ? "report-correct-choice" : undefined}><Group align="flex-start" wrap="nowrap"><Badge circle color={key === question.answer ? "teal" : "gray"} variant="light">{key}</Badge><Text size="sm">{value}</Text></Group></Card>)}</SimpleGrid>}</Stack>;
}

export default function QuestionReportsPage() {
  const [reports, setReports] = useState<ReportPage>(EMPTY_PAGE);
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All status");
  const [reasonFilter, setReasonFilter] = useState("All reasons");
  const [subjectFilter, setSubjectFilter] = useState("All subjects");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ReportQuestion | null>(null);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reportColumnWidths, setReportColumnWidths] = useState(DEFAULT_REPORT_COLUMN_WIDTHS);

  const selected = reports.items.find((report) => report.id === selectedId) ?? null;
  const totalPages = Math.max(1, Math.ceil(reports.total / reports.pageSize));
  const pageCounts = useMemo(() => ({
    open: reports.items.filter((item) => item.status === "Open").length,
    review: reports.items.filter((item) => item.status === "In review").length,
    resolved: reports.items.filter((item) => item.status === "Resolved").length,
  }), [reports.items]);

  const loadReports = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await getReports({ page, search: query, status: statusFilter, reason: reasonFilter, subject: subjectFilter }, signal);
      if (signal?.aborted) return;
      setReports(data); setLoadError("");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLoadError(error instanceof Error ? error.message : "Laporan soal tidak dapat dimuat.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [page, query, reasonFilter, statusFilter, subjectFilter]);

  useEffect(() => { void getReportFilters().then(setFilters).catch(() => undefined); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadReports(controller.signal), 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [loadReports]);

  const applyUpdatedReport = (updated: QuestionReport) => setReports((current) => ({ ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) }));
  const updateStatus = async (status: ReportStatus) => {
    if (!selected) return;
    setBusy(true);
    try { const updated = await setReportStatus(selected.id, status); applyUpdatedReport(updated); notifications.show({ color: statusColor(status), title: "Status laporan diperbarui", message: `Laporan dipindahkan ke ${status}.` }); }
    catch (error) { notifications.show({ color: "red", title: "Gagal memperbarui status", message: error instanceof Error ? error.message : "Coba lagi." }); }
    finally { setBusy(false); }
  };
  const updateStatusFromList = async (report: QuestionReport, status: ReportStatus) => {
    if (report.status === status) return;
    setUpdatingStatusId(report.id);
    try {
      const updated = await setReportStatus(report.id, status);
      applyUpdatedReport(updated);
      notifications.show({ color: statusColor(status), message: `${report.question?.code ?? "Laporan"} dipindahkan ke ${status}.` });
    } catch (error) {
      notifications.show({ color: "red", title: "Gagal memperbarui status", message: error instanceof Error ? error.message : "Coba lagi." });
    } finally { setUpdatingStatusId(null); }
  };
  const saveQuestion = async () => {
    if (!selected || !editDraft) return;
    setBusy(true);
    try { const updated = await saveReportedQuestion(selected.id, editDraft); applyUpdatedReport(updated); setEditDraft(null); notifications.show({ color: "teal", title: "Soal diperbarui", message: "Konten, kunci jawaban, dan penjelasan berhasil disimpan." }); }
    catch (error) { notifications.show({ color: "red", title: "Gagal memperbarui soal", message: error instanceof Error ? error.message : "Coba lagi." }); }
    finally { setBusy(false); }
  };
  const replaceImage = async (file: File) => {
    if (!selected) return;
    setBusy(true);
    try { const updated = await replaceReportedImage(selected.id, file); applyUpdatedReport(updated); notifications.show({ color: "teal", message: "Gambar soal diperbarui." }); }
    catch (error) { notifications.show({ color: "red", title: "Gagal memperbarui gambar", message: error instanceof Error ? error.message : "Coba lagi." }); }
    finally { setBusy(false); }
  };
  const removeImage = async () => {
    if (!selected) return;
    setBusy(true);
    try { const updated = await removeReportedImage(selected.id); applyUpdatedReport(updated); notifications.show({ color: "teal", message: "Gambar soal dihapus." }); }
    catch (error) { notifications.show({ color: "red", title: "Gambar tidak dapat dihapus", message: error instanceof Error ? error.message : "Coba lagi." }); }
    finally { setBusy(false); }
  };
  const startReportColumnResize = (column: ReportColumnKey, event: ReactPointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = reportColumnWidths[column];
    const move = (moveEvent: PointerEvent) => setReportColumnWidths((current) => ({
      ...current, [column]: Math.max(MIN_REPORT_COLUMN_WIDTHS[column], startWidth + moveEvent.clientX - startX),
    }));
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };
  const resizeReportColumnBy = (column: ReportColumnKey, delta: number) => setReportColumnWidths((current) => ({
    ...current, [column]: Math.max(MIN_REPORT_COLUMN_WIDTHS[column], current[column] + delta),
  }));
  const reportTableWidth = Object.values(reportColumnWidths).reduce((total, width) => total + width, 0);
  const resizableReportHeader = (column: ReportColumnKey, label: string) => <Table.Th key={column} className="resizable-question-header">
    <span>{label}</span><span role="separator" aria-label={`Resize ${label} column`} aria-orientation="vertical" tabIndex={0} className="question-column-resizer"
      onPointerDown={(event) => startReportColumnResize(column, event)}
      onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); resizeReportColumnBy(column, event.key === "ArrowLeft" ? -16 : 16); } }}/>
  </Table.Th>;

  return <>
    <PageHeader eyebrow="Kualitas pembelajaran" title="Laporan soal" description="Tinjau laporan dan feedback pengguna, lalu perbaiki konten soal dari satu halaman." />

    <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} mb="lg">
      <Card className="surface-card report-metric-card" p="lg"><Group justify="space-between"><Box><Text size="xs" c="dimmed" fw={700} tt="uppercase" lts=".06em">Total laporan</Text><Text className="metric-value">{reports.total}</Text></Box><ThemeIcon color="dark" variant="light" size={32} radius="xl"><IconFlag size={16}/></ThemeIcon></Group><Text size="xs" c="dimmed" mt="md">Sesuai filter saat ini</Text></Card>
      <Card className="surface-card report-metric-card" p="lg"><Group justify="space-between"><Box><Text size="xs" c="dimmed" fw={700} tt="uppercase" lts=".06em">Open di halaman</Text><Text className="metric-value">{pageCounts.open}</Text></Box><ThemeIcon color="orange" variant="light" size={32} radius="xl"><IconAlertTriangle size={16}/></ThemeIcon></Group><Text size="xs" c="dimmed" mt="md">Menunggu respons admin</Text></Card>
      <Card className="surface-card report-metric-card" p="lg"><Group justify="space-between"><Box><Text size="xs" c="dimmed" fw={700} tt="uppercase" lts=".06em">In review di halaman</Text><Text className="metric-value">{pageCounts.review}</Text></Box><ThemeIcon color="blue" variant="light" size={32} radius="xl"><IconClock size={16}/></ThemeIcon></Group><Text size="xs" c="dimmed" mt="md">Sedang diperiksa</Text></Card>
      <Card className="surface-card report-metric-card" p="lg"><Group justify="space-between"><Box><Text size="xs" c="dimmed" fw={700} tt="uppercase" lts=".06em">Resolved di halaman</Text><Text className="metric-value">{pageCounts.resolved}</Text></Box><ThemeIcon color="teal" variant="light" size={32} radius="xl"><IconCheck size={16}/></ThemeIcon></Group><Text size="xs" c="dimmed" mt="md">Peninjauan selesai</Text></Card>
    </SimpleGrid>

    <Card className="surface-card table-card" p={0}>
      <Group className="table-toolbar" justify="space-between" align="flex-end" p="lg"><Box><Text className="section-title">Soal yang dilaporkan</Text><Text size="xs" c="dimmed" mt={3}>{reports.total} laporan sesuai filter</Text></Box><Group gap="sm" align="flex-end"><TextInput label="Cari" placeholder="Laporan, kode, pelapor…" leftSection={<IconSearch size={16}/>} value={query} onChange={(event) => { setQuery(event.currentTarget.value); setPage(1); }} w={230}/><Select label="Subjek" value={subjectFilter} onChange={(value) => { setSubjectFilter(value ?? "All subjects"); setPage(1); }} data={[{ value: "All subjects", label: "Semua subjek" }, ...filters.subjects.map((item) => ({ value: item.code, label: item.name }))]} w={160}/><Select label="Status" value={statusFilter} onChange={(value) => { setStatusFilter(value ?? "All status"); setPage(1); }} data={[{ value: "All status", label: "Semua status" }, ...STATUS_OPTIONS.map((item) => ({ value: item, label: item }))]} w={145}/><Select label="Alasan" value={reasonFilter} onChange={(value) => { setReasonFilter(value ?? "All reasons"); setPage(1); }} data={[{ value: "All reasons", label: "Semua alasan" }, ...filters.reasons.map((item) => ({ value: item, label: item }))]} w={210}/></Group></Group>
      {loadError && <Alert m="lg" color="red" icon={<IconAlertCircle size={18}/>} title="Laporan tidak dapat dimuat">{loadError}<Button variant="subtle" color="red" size="compact-sm" ml="sm" onClick={() => void loadReports()}>Coba lagi</Button></Alert>}
      {loading ? <Center mih={270}><Loader color="yellow"/></Center> : reports.items.length ? <><ScrollArea><Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover className="resizable-question-table" style={{ minWidth: reportTableWidth, tableLayout: "fixed" }}><colgroup>{(Object.keys(reportColumnWidths) as ReportColumnKey[]).map((column) => <col key={column} style={{ width: reportColumnWidths[column] }}/>)}</colgroup><Table.Thead><Table.Tr>{resizableReportHeader("report", "Laporan")}{resizableReportHeader("question", "Soal")}{resizableReportHeader("subject", "Subjek")}{resizableReportHeader("reason", "Alasan")}{resizableReportHeader("reporter", "Dilaporkan oleh")}{resizableReportHeader("reportedAt", "Tanggal laporan")}{resizableReportHeader("status", "Status")}</Table.Tr></Table.Thead><Table.Tbody>{reports.items.map((report) => <Table.Tr key={report.id} className="clickable-row" tabIndex={0} onClick={() => setSelectedId(report.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedId(report.id); }}><Table.Td><Text ff="monospace" size="xs" fw={700}>{report.id.slice(0, 8).toUpperCase()}</Text></Table.Td><Table.Td><Text ff="monospace" size="sm" fw={700}>{report.question?.code ?? "Soal telah dihapus"}</Text><Text size="xs" c="dimmed" truncate>{report.topic}</Text></Table.Td><Table.Td><Badge variant="outline" color="dark">{report.subject}</Badge></Table.Td><Table.Td><Badge color={reasonColor(report.reason)} variant="light">{report.reason}</Badge></Table.Td><Table.Td><Text size="sm" fw={600} truncate>{report.reportedBy}</Text><Text size="xs" c="dimmed" truncate>{report.reporterEmail}</Text></Table.Td><Table.Td><Text size="sm">{formatDateTime(report.reportedAt)}</Text></Table.Td><Table.Td onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><Menu position="bottom-end" withinPortal><Menu.Target><UnstyledButton className="report-status-trigger" disabled={updatingStatusId === report.id} aria-label={`Ubah status ${report.question?.code ?? report.id}`}><Badge color={statusColor(report.status)} variant="light" leftSection={updatingStatusId === report.id ? <Loader size={10} color={statusColor(report.status)}/> : <span className="status-dot" />} rightSection={<IconChevronDown size={12}/>} className="report-status-badge">{report.status}</Badge></UnstyledButton></Menu.Target><Menu.Dropdown>{STATUS_OPTIONS.map((status) => <Menu.Item key={status} disabled={status === report.status} leftSection={<span className="status-option-dot" style={{ background: `var(--mantine-color-${statusColor(status)}-6)` }}/>} onClick={() => void updateStatusFromList(report, status)}>{status}</Menu.Item>)}</Menu.Dropdown></Menu></Table.Td></Table.Tr>)}</Table.Tbody></Table></ScrollArea><Group className="pagination-bar" justify="space-between" p="md"><Text size="xs" c="dimmed">Menampilkan {(page - 1) * reports.pageSize + 1}–{Math.min(page * reports.pageSize, reports.total)} dari {reports.total}</Text><Pagination total={totalPages} value={page} onChange={setPage} size="sm"/></Group></> : !loadError && <Center mih={270}><Stack align="center" gap="xs"><IconMessageReport size={32} color="#8b94a0"/><Text fw={700}>Tidak ada laporan yang sesuai filter</Text><Text size="sm" c="dimmed">Coba subjek, status, alasan, atau kata pencarian lain.</Text></Stack></Center>}
    </Card>

    <Drawer opened={Boolean(selected)} onClose={() => { setSelectedId(null); setImageEditorOpen(false); }} position="right" size="xl" title={<Text className="section-title">Detail laporan</Text>} padding="xl">
      {selected && <Stack gap="xl"><Card className="detail-hero" p="lg"><Group justify="space-between" align="flex-start" gap="md"><Box><Group gap="xs"><Badge color="dark">{selected.id.slice(0, 8).toUpperCase()}</Badge><Badge color={reasonColor(selected.reason)} variant="light">{selected.reason}</Badge></Group><Text fw={700} mt="md">Reported {formatDateTime(selected.reportedAt)}</Text><Text size="sm" c="dimmed" mt={3}>Last updated {formatDateTime(selected.updatedAt)}</Text></Box><ReportStatusBadge status={selected.status}/></Group></Card>
        <Box><Text className="eyebrow">Alur peninjauan</Text><Group align="flex-end" gap="sm"><Select label="Status laporan" value={selected.status} disabled={busy} onChange={(value) => value && void updateStatus(value as ReportStatus)} data={STATUS_OPTIONS} flex={1}/>{selected.status !== "Resolved" && <Button color="teal" variant="light" loading={busy} leftSection={<IconCheck size={17}/>} onClick={() => void updateStatus("Resolved")}>Selesaikan</Button>}</Group></Box>
        <Box><Text className="eyebrow">Alasan laporan</Text><Card withBorder radius="lg" padding="md" className="report-reason-card"><Group align="flex-start" wrap="nowrap"><ThemeIcon color={reasonColor(selected.reason)} variant="light" radius="xl"><IconMessageReport size={18}/></ThemeIcon><Box><Text fw={700}>{selected.reason}</Text><Text size="sm" c="dimmed" mt={6} style={{ lineHeight: 1.7 }}>{selected.detail}</Text></Box></Group></Card></Box>
        <SimpleGrid cols={{ base: 1, sm: 2 }}><DetailItem label="Pelapor" value={<Group gap="xs" wrap="nowrap"><ThemeIcon size={28} radius="xl" color="gray" variant="light"><IconUser size={15}/></ThemeIcon><Box><Text size="sm" fw={600}>{selected.reportedBy}</Text><Text size="xs" c="dimmed">{selected.reporterEmail}</Text></Box></Group>}/><DetailItem label="Konteks soal" value={`${selected.subject} · ${selected.topic}`}/></SimpleGrid><Divider/>
        {selected.question ? <><Group justify="space-between" align="flex-end"><Box><Text className="eyebrow">Question under review</Text><Group gap="xs"><Badge color="dark">{selected.question.code}</Badge><Badge color="yellow" variant="light">{selected.question.difficulty}</Badge><Badge color="gray" variant="light">{selected.question.type}</Badge></Group></Box><Group gap="xs"><Button variant="light" color="dark" leftSection={<IconEdit size={17}/>} onClick={() => setEditDraft(structuredClone(selected.question!))}>Edit question</Button><Button variant="light" color="yellow" leftSection={<IconPhoto size={17}/>} onClick={() => setImageEditorOpen(true)}>Edit image</Button></Group></Group>{selected.question.imageUrl && <Image src={selected.question.imageUrl} alt={`Figure for ${selected.question.code}`} fit="contain" mah={340} radius="md" className="report-question-figure"/>}<Tabs defaultValue="en"><Tabs.List><Tabs.Tab value="en">English</Tabs.Tab><Tabs.Tab value="zh">中文</Tabs.Tab></Tabs.List><Tabs.Panel value="en" pt="lg"><QuestionContent question={selected.question} language="en"/></Tabs.Panel><Tabs.Panel value="zh" pt="lg"><QuestionContent question={selected.question} language="zh"/></Tabs.Panel></Tabs><Card withBorder radius="lg" padding="md"><Group justify="space-between"><Box><Text size="xs" c="dimmed">Correct answer</Text><Text size="xl" fw={800} mt={3}>{selected.question.answer}</Text></Box><ThemeIcon color="teal" variant="light" size={42} radius="xl"><IconCheck size={20}/></ThemeIcon></Group><Divider my="md"/><Tabs defaultValue="en"><Tabs.List><Tabs.Tab value="en">Explanation EN</Tabs.Tab><Tabs.Tab value="zh">解析中文</Tabs.Tab></Tabs.List><Tabs.Panel value="en" pt="md"><MarkdownLatexText>{selected.question.explanationEn || "No English explanation."}</MarkdownLatexText></Tabs.Panel><Tabs.Panel value="zh" pt="md"><MarkdownLatexText>{selected.question.explanationZh || "暂无中文解析。"}</MarkdownLatexText></Tabs.Panel></Tabs></Card></> : <Alert color="orange" icon={<IconAlertTriangle size={18}/>} title="Question is no longer available">The report remains available for audit, but its linked question has been deleted.</Alert>}
      </Stack>}
    </Drawer>

    <Modal opened={Boolean(editDraft)} onClose={() => !busy && setEditDraft(null)} closeOnClickOutside={!busy} size="xl" centered title="Edit reported question">{editDraft && <Stack gap="lg"><Tabs defaultValue="en"><Tabs.List><Tabs.Tab value="en">English content</Tabs.Tab><Tabs.Tab value="zh">中文内容</Tabs.Tab></Tabs.List><Tabs.Panel value="en" pt="md"><Stack><Textarea label="Question" autosize minRows={3} value={editDraft.promptEn} onChange={(event) => setEditDraft({ ...editDraft, promptEn: event.currentTarget.value })}/><SimpleGrid cols={{ base: 1, sm: 2 }}>{Object.entries(editDraft.choicesEn).map(([key, value]) => <TextInput key={key} label={`Choice ${key}`} value={value} onChange={(event) => setEditDraft({ ...editDraft, choicesEn: { ...editDraft.choicesEn, [key]: event.currentTarget.value } })}/>)}</SimpleGrid><Textarea label="Explanation" autosize minRows={4} value={editDraft.explanationEn} onChange={(event) => setEditDraft({ ...editDraft, explanationEn: event.currentTarget.value })}/></Stack></Tabs.Panel><Tabs.Panel value="zh" pt="md"><Stack><Textarea label="题目" autosize minRows={3} value={editDraft.promptZh} onChange={(event) => setEditDraft({ ...editDraft, promptZh: event.currentTarget.value })}/><SimpleGrid cols={{ base: 1, sm: 2 }}>{Object.entries(editDraft.choicesZh).map(([key, value]) => <TextInput key={key} label={`选项 ${key}`} value={value} onChange={(event) => setEditDraft({ ...editDraft, choicesZh: { ...editDraft.choicesZh, [key]: event.currentTarget.value } })}/>)}</SimpleGrid><Textarea label="答案解析" autosize minRows={4} value={editDraft.explanationZh} onChange={(event) => setEditDraft({ ...editDraft, explanationZh: event.currentTarget.value })}/></Stack></Tabs.Panel></Tabs><Select label="Correct answer" value={editDraft.answer} onChange={(value) => value && setEditDraft({ ...editDraft, answer: value })} data={Object.keys(editDraft.choicesEn)} w={220}/><Group justify="flex-end"><Button variant="default" disabled={busy} onClick={() => setEditDraft(null)}>Cancel</Button><Button className="primary-action" loading={busy} leftSection={<IconCheck size={17}/>} onClick={() => void saveQuestion()}>Save question</Button></Group></Stack>}</Modal>

    <Modal opened={imageEditorOpen && Boolean(selected?.question)} onClose={() => !busy && setImageEditorOpen(false)} closeOnClickOutside={!busy} size="lg" centered title={`Edit image · ${selected?.question?.code ?? ""}`}>{selected?.question && <Stack gap="lg"><Box className="report-image-editor">{selected.question.imageUrl ? <Image src={selected.question.imageUrl} alt={`Figure for ${selected.question.code}`} fit="contain" mah={360}/> : <Stack align="center" gap="xs"><ThemeIcon color="yellow" variant="light" radius="xl" size={48}><IconPhoto size={24}/></ThemeIcon><Text fw={700}>No image attached</Text><Text size="sm" c="dimmed">Upload a diagram or question image.</Text></Stack>}</Box><Group justify="space-between"><FileButton onChange={(file) => file && void replaceImage(file)} accept="image/png,image/jpeg,image/webp">{(props) => <Button {...props} loading={busy} variant="light" leftSection={<IconUpload size={17}/>}>Replace / upload</Button>}</FileButton>{selected.question.imageUrl && <Button variant="light" color="red" loading={busy} leftSection={<IconTrash size={17}/>} onClick={() => void removeImage()}>Remove image</Button>}</Group></Stack>}</Modal>
  </>;
}

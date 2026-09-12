"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type InputHTMLAttributes } from "react";
import { ActionIcon, Alert, Badge, Box, Button, Card, Center, Checkbox, Divider, Drawer, FileButton, Group, Image, Loader, Modal, Pagination, Progress, Select, SimpleGrid, Stack, Table, Tabs, Text, TextInput, ThemeIcon, Title, UnstyledButton } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconBook2, IconCheck, IconClock, IconCloudUpload, IconFile, IconFolder, IconKey, IconPlayerPlay, IconPlayerStop, IconRefresh, IconReload, IconSearch, IconTrash, IconX } from "@tabler/icons-react";
import { MarkdownLatexText } from "@/components/markdown-latex-text";
import { PageHeader } from "@/components/ui/admin";
import { cancelJob, createExtraction, deleteQuestions, getExtractorReadiness, getJob, getJobs, getQuestion, getQuestions, reprocessQuestions, resumeJob } from "./api";
import type { ExtractionJob, ExtractionStatus, ExtractorReadiness, PageResult, QuestionContent, QuestionDetail, QuestionSummary } from "./types";
import { ProviderSettingsModal } from "./provider-settings-modal";

const SUBJECTS = [
  { value: "PH", label: "Physics" }, { value: "MT", label: "Mathematics" },
  { value: "CM", label: "Chemistry" }, { value: "LH", label: "STEM Chinese" },
  { value: "WH", label: "Humanities Chinese" },
];
const ACCEPT = ".png,.jpg,.jpeg,.pdf,.docx";
const MAX_FILES = 250;
const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * 1024;
const ACTIVE = new Set<ExtractionStatus>(["queued", "processing"]);
const statusColor: Record<ExtractionStatus, string> = {
  queued: "gray", processing: "yellow", completed: "teal",
  completed_with_errors: "orange", failed: "red", cancelled: "gray",
};
const stageLabel: Record<string, string> = {
  queued: "Waiting for worker", starting: "Preparing files", extracting: "Extracting & answering",
  aligning: "Generating translation alignment & vocab", done: "Finished", failed: "Failed", cancelled: "Cancelled",
  answering: "Generating answers", storing: "Saving questions to database",
  finalizing: "Generating alignment & embedding", cleaning_source: "Cleaning source storage",
  reprocessing: "Regenerating answers, alignment & embedding",
};

function formatFileSize(bytes: number): string {
  if (bytes < KILOBYTE) return `${bytes} B`;
  if (bytes < MEGABYTE) {
    const kilobytes = bytes / KILOBYTE;
    return `${kilobytes.toFixed(kilobytes < 10 ? 1 : 0)} KB`;
  }
  const megabytes = bytes / MEGABYTE;
  return `${megabytes.toFixed(megabytes < 10 ? 1 : 0)} MB`;
}

function questionText(content: QuestionContent): string {
  const value = content.question;
  return typeof value === "string" ? value : value ? Object.values(value).join(" · ") : "Question text unavailable";
}

function QuestionBlock({ content }: { content: QuestionContent }) {
  const questions = typeof content.question === "string" ? { "1": content.question } : content.question ?? {};
  const choices = content.answer ?? content.choices ?? {};
  return <Stack gap="sm">{Object.entries(questions).map(([key, text]) =>
    <Group key={key} align="flex-start" wrap="nowrap"><Box flex={1}><MarkdownLatexText>{text}</MarkdownLatexText></Box></Group>)}
    {Object.keys(choices).length > 0 && <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">{Object.entries(choices).map(([key, text]) =>
      <Card key={key} withBorder radius="md" padding="sm"><Group align="flex-start" wrap="nowrap"><Badge color="dark" variant="light" circle>{key}</Badge><Box flex={1}><MarkdownLatexText>{text}</MarkdownLatexText></Box></Group></Card>)}</SimpleGrid>}
  </Stack>;
}

function JobStatus({ job }: { job: ExtractionJob }) {
  const unitLabel = job.job_type === "question_reprocess" ? "questions" : "files";
  const progress = job.total_files ? Math.round((job.processed_files / job.total_files) * 100) : job.status === "queued" ? 2 : 0;
  const files = job.question_extraction_files ?? [];
  const pending = Math.max(0, job.total_files - (job.job_type === "question_reprocess" ? job.processed_files : files.filter((file) => ["completed", "failed"].includes(file.status)).length));
  const review = files.reduce((total, file) => total + (file.review_count || 0), 0);
  return <Card className="surface-card" p="lg"><Stack gap="md">
    <Group justify="space-between" align="flex-start"><Box><Group gap="xs"><Badge color={statusColor[job.status]} variant="light">{job.status.replaceAll("_", " ")}</Badge><Badge color="gray" variant="outline">{job.subject}</Badge>{job.job_type === "question_reprocess" && <Badge color="blue" variant="light">Re-extract</Badge>}</Group><Text fw={700} mt="sm">{stageLabel[job.stage] ?? job.stage}</Text><Text size="sm" c="dimmed">{job.current_file ?? `${job.processed_files} of ${job.total_files} ${unitLabel} processed`}</Text></Box><ThemeIcon color={job.status === "failed" ? "red" : "yellow"} variant="light" size={42} radius="xl">{job.status === "completed" ? <IconCheck /> : job.status === "failed" ? <IconX /> : <IconClock />}</ThemeIcon></Group>
    {ACTIVE.has(job.status) && <Progress value={progress} color="yellow" size="md" radius="xl" animated aria-label={`${progress}% complete`} />}
    <SimpleGrid cols={{ base: 2, sm: 4 }}><Box><Text size="xs" c="dimmed">PENDING {unitLabel.toUpperCase()}</Text><Text fw={700}>{pending}</Text></Box><Box><Text size="xs" c="dimmed">PROCESSED</Text><Text fw={700}>{job.processed_files}/{job.total_files}</Text></Box><Box><Text size="xs" c="dimmed">QUESTIONS</Text><Text fw={700}>{job.total_questions}</Text></Box><Box><Text size="xs" c="dimmed">NEEDS REVIEW</Text><Text fw={700}>{review}</Text></Box></SimpleGrid>
    {job.error_message && <Alert color="red" icon={<IconAlertCircle size={17} />}>{job.error_message}</Alert>}
  </Stack></Card>;
}

export default function QuestionExtractorPage() {
  const resetRef = useRef<() => void>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState<string | null>("PH");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState<PageResult<ExtractionJob>>({ items: [], total: 0, page: 1, page_size: 10 });
  const [jobPage, setJobPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<ExtractionJob | null>(null);
  const [questions, setQuestions] = useState<PageResult<QuestionSummary>>({ items: [], total: 0, page: 1, page_size: 20 });
  const [questionPage, setQuestionPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"delete" | "reprocess" | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [providerSettingsOpen, setProviderSettingsOpen] = useState(false);
  const [preview, setPreview] = useState<QuestionDetail | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [readiness, setReadiness] = useState<ExtractorReadiness | null>(null);
  const [manifestPage, setManifestPage] = useState(1);
  const [filePreview, setFilePreview] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const selectedJobId = selectedJob?.id;
  const selectedJobStatus = selectedJob?.status;

  const loadJobs = useCallback(async () => {
    try { const data = await getJobs(jobPage); setJobs(data); setSelectedJob((current) => current ?? data.items[0] ?? null); }
    catch (error) { notifications.show({ color: "red", title: "Could not load extraction jobs", message: error instanceof Error ? error.message : "Try again." }); }
    finally { setLoadingJobs(false); }
  }, [jobPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadJobs(), 0);
    return () => window.clearTimeout(timer);
  }, [loadJobs]);
  useEffect(() => { void getExtractorReadiness().then(setReadiness).catch(() => undefined); }, []);
  useEffect(() => () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
  }, [filePreviewUrl]);
  useEffect(() => {
    if (!selectedJobId) return;
    const jobId = selectedJobId;
    void getJob(jobId).then((latest) => setSelectedJob((current) => current?.id === jobId ? latest : current)).catch(() => undefined);
  }, [selectedJobId]);
  useEffect(() => {
    if (!selectedJobId || !selectedJobStatus || !ACTIVE.has(selectedJobStatus)) return;
    const timer = window.setInterval(async () => {
      try { const latest = await getJob(selectedJobId); setSelectedJob(latest); setJobs((current) => ({ ...current, items: current.items.map((j) => j.id === latest.id ? latest : j) })); }
      catch { /* retain last known state; manual retry remains available */ }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [selectedJobId, selectedJobStatus]);
  useEffect(() => {
    if (!selectedJobId) return;
    let active = true;
    const timer = window.setTimeout(() => { setLoadingQuestions(true); void getQuestions(selectedJobId, questionPage, search)
      .then((data) => { if (active) setQuestions(data); })
      .catch((error) => { if (active) notifications.show({ color: "red", title: "Could not load questions", message: error instanceof Error ? error.message : "Try again." }); })
      .finally(() => { if (active) setLoadingQuestions(false); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [selectedJobId, selectedJobStatus, questionPage, search]);

  const addFiles = (incoming: File[]) => setFiles((current) => {
    const supported = incoming.filter((file) => /\.(png|jpe?g|pdf|docx)$/i.test(file.name));
    const unique = supported.filter((file) => !current.some((item) =>
      (item.webkitRelativePath || item.name) === (file.webkitRelativePath || file.name) && item.size === file.size));
    const next = [...current, ...unique].slice(0, MAX_FILES);
    if (supported.length !== incoming.length) notifications.show({ color: "orange", title: "Some files were skipped", message: "Only PNG, JPG, PDF, and DOCX files are supported." });
    if (current.length + unique.length > MAX_FILES) notifications.show({ color: "orange", title: "Folder is too large", message: `Only the first ${MAX_FILES} supported files were added.` });
    return next;
  });
  const openFilePreview = (file: File) => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreview(file);
    setFilePreviewUrl(URL.createObjectURL(file));
  };
  const closeFilePreview = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreview(null);
    setFilePreviewUrl("");
  };
  const submit = async () => {
    if (!subject || !files.length) return;
    setUploading(true);
    try {
      const job = await createExtraction(subject, files); setSelectedJob(job); setSelectedQuestionIds(new Set()); setFiles([]); resetRef.current?.(); setJobPage(1); await loadJobs();
      notifications.show({ color: "teal", title: "Extraction queued", message: "You can safely close this page. The server will keep processing it." });
    } catch (error) { notifications.show({ color: "red", title: "Upload failed", message: error instanceof Error ? error.message : "Please try again." }); }
    finally { setUploading(false); }
  };
  const refreshQuestions = async () => {
    if (!selectedJobId) return;
    const data = await getQuestions(selectedJobId, questionPage, search);
    if (!data.items.length && data.total > 0 && questionPage > 1) setQuestionPage(questionPage - 1);
    else setQuestions(data);
  };
  const runBulkAction = async () => {
    if (!selectedJobId || !bulkAction || !selectedQuestionIds.size) return;
    const ids = Array.from(selectedQuestionIds);
    setBulkBusy(true);
    try {
      if (bulkAction === "delete") {
        const result = await deleteQuestions(selectedJobId, ids);
        notifications.show({ color: "teal", title: "Questions deleted", message: `${result.deleted} question${result.deleted === 1 ? "" : "s"} and related data were removed.` });
        setSelectedQuestionIds(new Set());
        await refreshQuestions();
        const latest = await getJob(selectedJobId); setSelectedJob(latest);
      } else {
        const job = await reprocessQuestions(selectedJobId, ids);
        notifications.show({ color: "teal", title: "Re-extraction queued", message: `${job.total_files} question${job.total_files === 1 ? "" : "s"} will be regenerated in the background.` });
        setSelectedQuestionIds(new Set()); setSelectedJob(job); setJobPage(1); await loadJobs();
      }
      setBulkAction(null);
    } catch (error) {
      notifications.show({ color: "red", title: bulkAction === "delete" ? "Delete failed" : "Could not queue re-extraction", message: error instanceof Error ? error.message : "Try again." });
    } finally { setBulkBusy(false); }
  };
  const jobPages = Math.max(1, Math.ceil(jobs.total / jobs.page_size));
  const questionPages = Math.max(1, Math.ceil(questions.total / questions.page_size));
  const sortedJobs = useMemo(() => jobs.items, [jobs.items]);
  const selectedFiles = useMemo(() => selectedJob?.question_extraction_files ?? [], [selectedJob]);
  const errors = useMemo(() => selectedFiles.filter((file) => file.error_message).slice().reverse().slice(0, 8), [selectedFiles]);
  const manifestPages = Math.max(1, Math.ceil(selectedFiles.length / 10));
  const manifestFiles = selectedFiles.slice((manifestPage - 1) * 10, manifestPage * 10);
  const previewIsImage = Boolean(filePreview && /\.(png|jpe?g)$/i.test(filePreview.name));
  const previewIsPdf = Boolean(filePreview && /\.pdf$/i.test(filePreview.name));
  const pageQuestionIds = questions.items.map((question) => question.id);
  const allPageSelected = pageQuestionIds.length > 0 && pageQuestionIds.every((id) => selectedQuestionIds.has(id));
  const somePageSelected = pageQuestionIds.some((id) => selectedQuestionIds.has(id));

  return <>
    <PageHeader eyebrow="Learning tools" title="Question extractor" description="Upload files or a complete folder, follow every processing stage, and review DB-ready questions with Markdown and LaTeX preview." />
    <Group justify="flex-end" mb="lg"><Button variant="light" color="dark" leftSection={<IconKey size={17}/>} onClick={() => setProviderSettingsOpen(true)}>API key settings</Button></Group>
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl" className="extractor-top-grid">
      <Card className="surface-card" p="xl"><Stack gap="lg"><Box><Title order={2} className="section-title">Start a new extraction</Title><Text size="sm" c="dimmed" mt={5}>PNG, JPG, PDF, or DOCX · up to 25 MB each · max {MAX_FILES} files</Text></Box><Select label="Subject" data={SUBJECTS} value={subject} onChange={setSubject} size="md" />
        <Box className="extractor-dropzone" data-dragging={dragging || undefined} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}>
          <ThemeIcon size={52} radius="xl" color="yellow" variant="light"><IconCloudUpload size={26} /></ThemeIcon><Text fw={700} mt="md">Drop question files here</Text><Text size="sm" c="dimmed" mb="md">or select individual files / one complete folder</Text><Group justify="center"><FileButton resetRef={resetRef} onChange={(value) => addFiles(value)} accept={ACCEPT} multiple>{(props) => <Button {...props} variant="light" color="dark" leftSection={<IconFile size={17}/>}>Choose files</Button>}</FileButton><Button variant="light" color="yellow" leftSection={<IconFolder size={17}/>} onClick={() => folderInputRef.current?.click()}>Choose folder</Button></Group>
          <input ref={folderInputRef} className="visually-hidden-file-input" type="file" multiple accept={ACCEPT} aria-label="Choose a folder containing question files" onChange={(event) => { addFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ""; }} {...({ webkitdirectory: "", directory: "" } as InputHTMLAttributes<HTMLInputElement>)} />
        </Box>
        {files.length > 0 && <Stack gap="xs"><Group justify="space-between"><Text size="sm" fw={700}>{files.length} file{files.length === 1 ? "" : "s"} ready · click to preview</Text><Button size="compact-sm" variant="subtle" color="red" onClick={() => setFiles([])}>Clear all</Button></Group><Stack gap="xs" className="queued-files-scroll" role="list" aria-label="Files ready to upload">{files.map((file, index) => <Group key={`${file.webkitRelativePath || file.name}-${file.size}`} className="queued-file" justify="space-between" wrap="nowrap" role="listitem"><UnstyledButton className="queued-file-preview" onClick={() => openFilePreview(file)} aria-label={`Preview ${file.webkitRelativePath || file.name}`}><Group wrap="nowrap" miw={0}><IconFile size={18} /><Box miw={0}><Text size="sm" fw={600} className="path-text">{file.webkitRelativePath || file.name}</Text><Text size="xs" c="dimmed">{formatFileSize(file.size)}</Text></Box></Group></UnstyledButton><ActionIcon variant="subtle" color="red" aria-label={`Remove ${file.name}`} onClick={() => setFiles((items) => items.filter((_, i) => i !== index))}><IconTrash size={17} /></ActionIcon></Group>)}</Stack></Stack>}
        {readiness && !readiness.ready && <Alert color="orange" icon={<IconAlertCircle size={18} />} title="Extractor configuration incomplete">Add {readiness.missing.join(", ")} to the backend environment before starting a job.</Alert>}
        <Button className="primary-action" size="md" leftSection={<IconCloudUpload size={18} />} disabled={!subject || !files.length || readiness?.ready === false} loading={uploading} onClick={submit}>Upload & start extraction</Button>
        <Alert color="blue" variant="light" icon={<IconClock size={18} />}>Jobs are stored in the database and resume after a server restart. Closing this browser page does not cancel processing.</Alert>
      </Stack></Card>
      <Stack gap="md">{selectedJob ? <><JobStatus job={selectedJob}/>{ACTIVE.has(selectedJob.status) ? <Button variant="subtle" color="red" leftSection={<IconPlayerStop size={17}/>} onClick={() => void cancelJob(selectedJob.id).then(() => getJob(selectedJob.id)).then(setSelectedJob)}>Stop after current step</Button> : ["failed", "cancelled", "completed_with_errors"].includes(selectedJob.status) && <Button variant="light" color="dark" leftSection={<IconPlayerPlay size={17}/>} onClick={() => void resumeJob(selectedJob.id).then(setSelectedJob)}>Resume unfinished files</Button>}</> : <Card className="surface-card"><Center mih={300}>{loadingJobs ? <Loader color="yellow" /> : <Stack align="center"><IconBook2 size={32} /><Text c="dimmed">No extraction job yet.</Text></Stack>}</Center></Card>}</Stack>
    </SimpleGrid>

    <Card className="surface-card" p={0} mt="xl"><Group justify="space-between" p="lg"><Box><Title order={2} className="section-title">Extraction history</Title><Text size="sm" c="dimmed">Select a job to inspect its progress and questions.</Text></Box><ActionIcon variant="light" color="dark" aria-label="Refresh jobs" onClick={() => void loadJobs()}><IconRefresh size={18}/></ActionIcon></Group><Divider/><Box className="job-strip">{sortedJobs.map((job) => <button key={job.id} type="button" className="job-tile" data-active={selectedJob?.id === job.id || undefined} onClick={() => { setSelectedJob(job); setSelectedQuestionIds(new Set()); setQuestionPage(1); setManifestPage(1); }}><Group justify="space-between"><Badge color={statusColor[job.status]} variant="dot">{job.status.replaceAll("_", " ")}</Badge><Group gap={6}>{job.job_type === "question_reprocess" && <Badge size="xs" color="blue" variant="light">Re-extract</Badge>}<Text size="xs" c="dimmed">{job.subject}</Text></Group></Group><Text fw={700} mt="sm">{new Date(job.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</Text><Text size="xs" c="dimmed" mt={4}>{job.aligned_questions} aligned question{job.aligned_questions === 1 ? "" : "s"}</Text></button>)}</Box>{jobs.total > 0 && <Group className="pagination-bar" justify="space-between" p="md"><Text size="sm" c="dimmed">Showing {(jobPage - 1) * jobs.page_size + 1}–{Math.min(jobPage * jobs.page_size, jobs.total)} of {jobs.total} jobs</Text><Pagination total={jobPages} value={jobPage} onChange={(page) => { setJobPage(page); setSelectedJob(null); setSelectedQuestionIds(new Set()); }} color="dark" /></Group>}</Card>

    {selectedJob && <Stack gap="xl" mt="xl">
      <Card className="surface-card table-card" p={0}><Box p="lg"><Title order={2} className="section-title">Latest errors</Title><Text size="sm" c="dimmed">File-level failures and partial extraction issues with their complete messages.</Text></Box><Divider/>
        {errors.length ? <Table.ScrollContainer minWidth={700}><Table verticalSpacing="md" horizontalSpacing="lg"><Table.Thead><Table.Tr><Table.Th>Time</Table.Th><Table.Th>File</Table.Th><Table.Th>Error</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{errors.map((file) => <Table.Tr key={file.id}><Table.Td><Text size="sm" ff="monospace">{new Date(file.updated_at).toLocaleString()}</Text></Table.Td><Table.Td><Text size="sm" className="path-text">{file.relative_path || file.file_name}</Text></Table.Td><Table.Td><Text size="sm" c="red" className="error-message">{file.error_message}</Text></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer> : <Center mih={110}><Group gap="xs"><IconCheck size={18} color="var(--mantine-color-teal-7)"/><Text size="sm" c="dimmed">No errors recorded for this job.</Text></Group></Center>}
      </Card>

      <Card className="surface-card table-card" p={0}><Group justify="space-between" p="lg"><Box><Title order={2} className="section-title">File activity</Title><Text size="sm" c="dimmed">Persistent manifest for every file discovered in the upload.</Text></Box><Badge variant="light" color="dark">{selectedFiles.length} files</Badge></Group><Divider/>
        {selectedFiles.length ? <><Table.ScrollContainer minWidth={940}><Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover><Table.Thead><Table.Tr><Table.Th>Updated</Table.Th><Table.Th>Folder</Table.Th><Table.Th>File</Table.Th><Table.Th>Stage</Table.Th><Table.Th>Questions</Table.Th><Table.Th>Aligned</Table.Th><Table.Th>Review</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{manifestFiles.map((file) => <Table.Tr key={file.id}><Table.Td><Text size="sm" ff="monospace">{new Date(file.updated_at).toLocaleTimeString()}</Text></Table.Td><Table.Td><Text size="sm" className="path-text">{file.folder_path || "—"}</Text></Table.Td><Table.Td><Text size="sm" fw={600} className="path-text">{file.file_name}</Text></Table.Td><Table.Td><Stack gap={3}><Badge w="fit-content" color={file.status === "failed" ? "red" : file.status === "completed" ? "teal" : "yellow"} variant="light">{file.status}</Badge><Text size="xs" c="dimmed">{stageLabel[file.stage] ?? file.stage}</Text></Stack></Table.Td><Table.Td>{file.question_count || 0}</Table.Td><Table.Td>{file.aligned_count || 0}</Table.Td><Table.Td>{file.review_count || 0}</Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>{manifestPages > 1 && <Group className="pagination-bar" justify="space-between" p="md"><Text size="sm" c="dimmed">Showing {(manifestPage - 1) * 10 + 1}–{Math.min(manifestPage * 10, selectedFiles.length)} of {selectedFiles.length}</Text><Pagination total={manifestPages} value={manifestPage} onChange={setManifestPage} color="dark" /></Group>}</> : <Center mih={120}><Text size="sm" c="dimmed">The file manifest will appear after upload.</Text></Center>}
      </Card>
    </Stack>}

    <Card className="surface-card table-card" p={0} mt="xl">
      <Stack gap="md" p="lg" className="questions-toolbar">
        <Group className="table-toolbar" justify="space-between" align="flex-end">
          <Box><Title order={2} className="section-title">Extracted questions</Title><Text size="sm" c="dimmed">Search, preview, or select questions for a bulk action.</Text></Box>
          <TextInput label="Search questions" placeholder="Code or question content…" leftSection={<IconSearch size={16}/>} value={search} onChange={(e) => { setSearch(e.currentTarget.value); setSelectedQuestionIds(new Set()); setQuestionPage(1); }} />
        </Group>
        {selectedQuestionIds.size > 0 && <Group justify="space-between" className="question-selection-bar">
          <Text size="sm" fw={700}>{selectedQuestionIds.size} selected</Text>
          <Group gap="xs"><Button size="compact-sm" variant="light" color="blue" leftSection={<IconReload size={16}/>} onClick={() => setBulkAction("reprocess")}>Re-extract</Button><Button size="compact-sm" variant="light" color="red" leftSection={<IconTrash size={16}/>} onClick={() => setBulkAction("delete")}>Delete</Button></Group>
        </Group>}
      </Stack>
      <Divider/>
      {loadingQuestions ? <Center mih={220}><Loader color="yellow"/></Center> : questions.items.length ? <>
        <Table.ScrollContainer minWidth={820}><Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th w={44}><Checkbox aria-label="Select all questions on this page" checked={allPageSelected} indeterminate={!allPageSelected && somePageSelected} onChange={() => setSelectedQuestionIds((current) => {
            const next = new Set(current); if (allPageSelected) pageQuestionIds.forEach((id) => next.delete(id)); else pageQuestionIds.forEach((id) => next.add(id)); return next;
          })}/></Table.Th><Table.Th>Code</Table.Th><Table.Th>Preview</Table.Th><Table.Th>Type</Table.Th><Table.Th>Difficulty</Table.Th><Table.Th>Status</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>{questions.items.map((question) => <Table.Tr key={question.id} className="clickable-row" tabIndex={0} onClick={() => { setLoadingPreview(true); void getQuestion(selectedJob!.id, question.id).then(setPreview).finally(() => setLoadingPreview(false)); }} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.click(); }}>
            <Table.Td onClick={(event) => event.stopPropagation()}><Checkbox aria-label={`Select ${question.code}`} checked={selectedQuestionIds.has(question.id)} onChange={() => setSelectedQuestionIds((current) => { const next = new Set(current); if (next.has(question.id)) next.delete(question.id); else next.add(question.id); return next; })}/></Table.Td>
            <Table.Td><Text fw={700} ff="monospace">{question.code}</Text></Table.Td><Table.Td><Text size="sm" lineClamp={2}>{questionText(question.content_en) || questionText(question.content_zh)}</Text></Table.Td><Table.Td><Badge variant="light" color="gray">{question.question_type}</Badge></Table.Td><Table.Td>{question.difficulty}</Table.Td><Table.Td><Badge color={question.status === "verified" ? "teal" : "yellow"} variant="light">{question.status}</Badge></Table.Td>
          </Table.Tr>)}</Table.Tbody>
        </Table></Table.ScrollContainer>
        <Group className="pagination-bar" justify="space-between" p="md"><Text size="sm" c="dimmed">Showing {(questionPage - 1) * questions.page_size + 1}–{Math.min(questionPage * questions.page_size, questions.total)} of {questions.total} questions</Text><Pagination total={questionPages} value={questionPage} onChange={(page) => { setQuestionPage(page); setSelectedQuestionIds(new Set()); }} color="dark" /></Group>
      </> : <Center mih={220}><Stack align="center" gap="xs"><IconBook2 size={30} color="#8b94a0"/><Text fw={600}>{search ? "No questions match this search" : selectedJob ? "No stored questions yet" : "Select an extraction job"}</Text><Text size="sm" c="dimmed">{search ? "Try a code, English phrase, or Chinese phrase." : "Completed, aligned questions will appear here."}</Text></Stack></Center>}
    </Card>

    <Modal opened={Boolean(filePreview)} onClose={closeFilePreview} title="File preview" size="xl" centered><Stack gap="md">{filePreview && <Group justify="space-between" align="flex-start"><Box miw={0}><Text fw={700} className="path-text">{filePreview.webkitRelativePath || filePreview.name}</Text><Text size="sm" c="dimmed">{formatFileSize(filePreview.size)} · {filePreview.type || "Unknown file type"}</Text></Box><Badge variant="light" color="dark">{filePreview.name.split(".").pop()?.toUpperCase()}</Badge></Group>}{filePreviewUrl && previewIsImage && <Image src={filePreviewUrl} alt={`Preview of ${filePreview?.name}`} className="selected-file-image-preview" fit="contain" radius="md"/>}{filePreviewUrl && previewIsPdf && <iframe className="selected-file-pdf-preview" src={filePreviewUrl} title={`Preview of ${filePreview?.name}`} />}{filePreview && !previewIsImage && !previewIsPdf && <Alert color="blue" icon={<IconFile size={18}/>} title="Preview is not available for DOCX">The file is ready to upload, but this browser cannot render DOCX files directly. Image and PDF files can be previewed here.</Alert>}</Stack></Modal>

    <Modal opened={bulkAction !== null} onClose={() => !bulkBusy && setBulkAction(null)} title={bulkAction === "delete" ? "Delete selected questions?" : "Re-extract selected questions?"} centered>
      <Stack gap="lg"><Text size="sm">{bulkAction === "delete"
        ? `This permanently removes ${selectedQuestionIds.size} selected question${selectedQuestionIds.size === 1 ? "" : "s"}, related answers, bookmarks, XP records, reports, chat references, cached prompts, and stored question images.`
        : `This queues ${selectedQuestionIds.size} selected question${selectedQuestionIds.size === 1 ? "" : "s"} for fresh answer generation, translation alignment, and embeddings. Grouped siblings are included automatically.`}</Text>
        {bulkAction === "delete" && <Alert color="red" icon={<IconAlertCircle size={18}/>}>This action cannot be undone.</Alert>}
        <Group justify="flex-end"><Button variant="default" disabled={bulkBusy} onClick={() => setBulkAction(null)}>Cancel</Button><Button color={bulkAction === "delete" ? "red" : "dark"} loading={bulkBusy} onClick={() => void runBulkAction()}>{bulkAction === "delete" ? "Delete questions" : "Queue re-extraction"}</Button></Group>
      </Stack>
    </Modal>

    <ProviderSettingsModal opened={providerSettingsOpen} onClose={() => setProviderSettingsOpen(false)} onSaved={() => void getExtractorReadiness().then(setReadiness)} />

    <Drawer opened={Boolean(preview) || loadingPreview} onClose={() => setPreview(null)} title="Question preview" position="right" size="xl" padding="xl">{loadingPreview && !preview ? <Center mih={300}><Loader color="yellow"/></Center> : preview && <Stack gap="xl"><Group><Badge color="dark">{preview.code}</Badge><Badge color="yellow" variant="light">{preview.difficulty}</Badge><Badge color={preview.alignment ? "teal" : "orange"} variant="light">{preview.alignment ? "Alignment ready" : "Alignment pending"}</Badge></Group>{preview.image_url && <Image src={preview.image_url} alt={`Figure for ${preview.code}`} radius="md" fit="contain" mah={320}/>}<Tabs defaultValue={Object.keys(preview.content_en ?? {}).length ? "en" : "zh"}><Tabs.List><Tabs.Tab value="en">English</Tabs.Tab><Tabs.Tab value="zh">中文</Tabs.Tab></Tabs.List><Tabs.Panel value="en" pt="lg"><QuestionBlock content={preview.content_en}/></Tabs.Panel><Tabs.Panel value="zh" pt="lg"><QuestionBlock content={preview.content_zh}/></Tabs.Panel></Tabs><Divider/><Box><Text className="eyebrow">Correct answer</Text><Text fw={800} size="xl">{preview.answer}</Text></Box><Box><Text className="eyebrow">Explanation</Text><Tabs defaultValue={preview.explanation_en ? "en" : "zh"}><Tabs.List><Tabs.Tab value="en">English</Tabs.Tab><Tabs.Tab value="zh">中文</Tabs.Tab></Tabs.List><Tabs.Panel value="en" pt="md"><MarkdownLatexText circleNums>{preview.explanation_en || "No English explanation."}</MarkdownLatexText></Tabs.Panel><Tabs.Panel value="zh" pt="md"><MarkdownLatexText circleNums>{preview.explanation_zh || "暂无中文解析。"}</MarkdownLatexText></Tabs.Panel></Tabs></Box></Stack>}</Drawer>
  </>;
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileCheck2,
  LockKeyhole,
  Loader2,
  MapPin,
  Monitor,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  DocumentFileUpload,
  type UploadedDocumentFile,
} from "@/components/shared/document-file-upload";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

type ExamRow = {
  id: number;
  title: string;
  description: string | null;
  total_marks: number;
  duration_minutes: number | null;
  exam_date: string | null;
  exam_time: string | null;
  exam_place: string | null;
  exam_mode: string | null;
  result_date: string | null;
  instant_result: boolean;
  version: number;
  institution_name: string;
  target_type: string | null;
  target_label: string | null;
  question_count: number;
  submission_status: string;
  submitted_at: string | null;
  obtained_marks: number | null;
  percentage: number | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  unanswered: number | null;
  attempt_count: number;
  is_released: boolean;
  result_available: boolean;
};

type ExamAttempt = {
  id: number;
  practice_exam_id: number;
  attempt_no: number;
  exam_version: number;
  status: string;
  submitted_at: string | null;
  obtained_marks: number | null;
  percentage: number | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  unanswered: number | null;
  title: string;
  total_marks: number;
  institution_name: string;
  target_label: string | null;
};

type QuestionOption = {
  id: number;
  text: string;
  is_correct?: boolean;
};

type QuestionFile = {
  id: number;
  url: string;
};

type ExamQuestion = {
  id: number;
  question_text: string;
  question_type: "objective" | "true_false" | "subjective";
  marks: number;
  display_order: number;
  selected_option_id: number | null;
  answer_text: string | null;
  answer_image_url: string | null;
  is_correct: boolean | null;
  marks_awarded: number | null;
  explanation: string | null;
  options: QuestionOption[];
  files: QuestionFile[];
};

type ExamDetail = ExamRow & {
  questions: ExamQuestion[];
  time_taken_seconds: number | null;
};

type AnswerDraft = Record<number, {
  selected_option_id: number | null;
  answer_text: string;
  answer_image: UploadedDocumentFile | null;
}>;
type ViewMode = "all" | "attempts" | "results";

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid response" };
  }
}

function statusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "Completed";
  if (normalized === "in_progress") return "In Progress";
  return "Pending";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalDateOnly(value: string | null | undefined) {
  if (!value) return "";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (!Number.isFinite(parsed.getTime())) return text.slice(0, 10);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatExamDateTime(date: string | null | undefined, time: string | null | undefined) {
  if (!date || !time) return "Schedule unavailable";
  return formatDateTime(`${toLocalDateOnly(date)}T${String(time).slice(0, 5)}`);
}

function formatExamDate(date: string | null | undefined) {
  if (!date) return "the scheduled result date";
  return new Date(`${toLocalDateOnly(date)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isSubmittedStatus(status: string | null | undefined) {
  return String(status ?? "").toLowerCase() === "completed";
}

function isExamLocked(row: Pick<ExamRow, "question_count">) {
  return Number(row.question_count ?? 0) <= 0;
}

function isImageUrl(value: string) {
  return /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(value);
}

function buildDraft(questions: ExamQuestion[]): AnswerDraft {
  return Object.fromEntries(
    questions.map((question) => [
      question.id,
      {
        selected_option_id: question.selected_option_id ?? null,
        answer_text: question.answer_text ?? "",
        answer_image: question.answer_image_url
          ? {
              url: question.answer_image_url,
              publicId: "",
              resourceType: "image",
              fileType: "image/*",
            }
          : null,
      },
    ])
  );
}

export default function ClassroomExamsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const isParentReadonly = Boolean(user?.role_codes?.includes("parent"));
  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken]
  );
  const [rows, setRows] = useState<ExamRow[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeExam, setActiveExam] = useState<ExamDetail | null>(null);
  const [resultExamId, setResultExamId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerDraft>({});

  const fetchExams = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/classroom/exams?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load exams");
      setRows(json.data ?? []);
      setAttempts([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader, search]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void fetchExams(), 250);
    return () => window.clearTimeout(timeout);
  }, [fetchExams, isReady]);

  async function openExam(row: ExamRow) {
    if (!accessToken) return;
    if (row.is_released && isExamLocked(row)) {
      toast.info("Exam is locked until at least one question is added.");
      return;
    }
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/classroom/exams/${row.id}`, {
        headers: authHeader,
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to open exam");
      const detail = json.data as ExamDetail;
      setActiveExam(detail);
      setAnswers(buildDraft(detail.questions ?? []));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open exam");
    } finally {
      setDetailLoading(false);
    }
  }

  function setSelectedOption(questionId: number, optionId: number) {
    setAnswers((current) => ({
      ...current,
      [questionId]: {
        selected_option_id: optionId,
        answer_text: current[questionId]?.answer_text ?? "",
        answer_image: current[questionId]?.answer_image ?? null,
      },
    }));
  }

  function setAnswerText(questionId: number, text: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: {
        selected_option_id: current[questionId]?.selected_option_id ?? null,
        answer_text: text,
        answer_image: current[questionId]?.answer_image ?? null,
      },
    }));
  }

  function setAnswerImage(questionId: number, files: UploadedDocumentFile[]) {
    setAnswers((current) => ({
      ...current,
      [questionId]: {
        selected_option_id: current[questionId]?.selected_option_id ?? null,
        answer_text: current[questionId]?.answer_text ?? "",
        answer_image: files[0] ?? null,
      },
    }));
  }

  async function submitExam() {
    if (!activeExam || !accessToken) return;
    if (!activeExam.is_released) {
      toast.error("This exam is not public yet");
      return;
    }
    if (isSubmittedStatus(activeExam.submission_status)) {
      toast.error("This exam has already been submitted.");
      return;
    }

    const missing = activeExam.questions.find((question) => {
      const draft = answers[question.id];
      if (question.question_type === "subjective") {
        return !draft?.answer_text?.trim() && !draft?.answer_image?.url;
      }
      return !draft?.selected_option_id;
    });
    if (missing) {
      toast.error(`Answer question ${missing.display_order} before submitting.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/classroom/exams/${activeExam.id}/submit`, {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers: activeExam.questions.map((question) => ({
            question_id: question.id,
            selected_option_id: answers[question.id]?.selected_option_id ?? null,
            answer_text: answers[question.id]?.answer_text ?? "",
            answer_image_url: answers[question.id]?.answer_image?.url ?? null,
          })),
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to submit exam");
      toast.success(activeExam.instant_result ? "Exam submitted. Your result is ready." : "Exam submitted successfully.");
      setViewMode("all");
      await fetchExams();
      await openExam(activeExam);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit exam");
    } finally {
      setSubmitting(false);
    }
  }

  const activeAlreadySubmitted = activeExam
    ? isSubmittedStatus(activeExam.submission_status)
    : false;
  const resultGroups = useMemo(() => {
    const map = new Map<number, ExamAttempt[]>();
    for (const attempt of attempts) {
      const current = map.get(attempt.practice_exam_id) ?? [];
      current.push(attempt);
      map.set(attempt.practice_exam_id, current);
    }
    return Array.from(map.entries()).map(([examId, group]) => ({
      examId,
      title: group[0]?.title ?? "Exam",
      targetLabel: group[0]?.target_label ?? group[0]?.institution_name ?? "Classroom",
      attempts: group,
      latest: group[0],
    }));
  }, [attempts]);
  const selectedResultGroup = resultExamId
    ? resultGroups.find((group) => group.examId === resultExamId) ?? null
    : null;

  if (!isReady) {
    return <div className="text-muted-foreground">Loading exams...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exams</h1>
          <p className="text-muted-foreground">
            {isParentReadonly
              ? "View scheduled exams and released results for the selected child."
              : "View your assigned exams, answer questions, and submit classroom exams."}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void fetchExams()}>
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          Refresh
        </Button>
      </div>

      <div className="flex max-w-sm items-center gap-2 rounded-md border bg-background px-3">
        <Search className="size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search exams..."
          className="border-0 px-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {viewMode === "all" ? (
        <div className="rounded-lg border bg-card">
          <div className="grid grid-cols-[1.8fr_0.8fr_0.9fr_0.9fr] gap-4 border-b px-4 py-3 text-sm font-medium text-muted-foreground">
            <span>Exam</span>
            <span>Exam Date &amp; Time</span>
            <span>Duration</span>
            <span>Status</span>
          </div>
          {loading ? (
            <div className="flex min-h-52 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading exams...
            </div>
          ) : rows.length ? (
            <div className="divide-y">
              {rows.map((row) => {
                const completedCurrent = isSubmittedStatus(row.submission_status);
                const updatedAvailable = !completedCurrent && row.attempt_count > 0;
                const locked = isExamLocked(row);
                const attempted = row.attempt_count > 0;
                return (
                  <button
                    key={row.id}
                    type="button"
                    disabled={row.is_released && locked}
                    className={cn(
                      "grid w-full grid-cols-[1.8fr_0.8fr_0.9fr_0.9fr] gap-4 px-4 py-4 text-left transition hover:bg-muted/40",
                      row.is_released && locked && "cursor-not-allowed opacity-75 hover:bg-transparent"
                    )}
                    onClick={() => void openExam(row)}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">{row.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {row.target_label ?? row.institution_name ?? "Classroom"}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Mode: {row.exam_mode ? row.exam_mode.charAt(0).toUpperCase() + row.exam_mode.slice(1) : "Not specified"}
                      </span>
                    </span>
                    <span className="font-medium">{formatExamDateTime(row.exam_date, row.exam_time)}</span>
                    <span>{row.duration_minutes ? `${row.duration_minutes} min` : "-"}</span>
                    <span>
                      <Badge
                        variant="outline"
                        className={cn(
                          locked && "border-amber-500/60 text-amber-600 dark:text-amber-400",
                          (updatedAvailable || attempted) && "border-primary/60 text-primary"
                        )}
                      >
                        {!row.is_released
                          ? "Upcoming"
                          : locked
                          ? "Locked"
                          : completedCurrent && !row.result_available
                            ? "Completed"
                            : completedCurrent
                              ? "Result"
                          : isParentReadonly
                            ? "View"
                          : updatedAvailable
                            ? "Updated"
                            : attempted
                              ? "Retake"
                              : "Start"}
                      </Badge>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">
              No exams found for your current class and section.
            </div>
          )}
        </div>
      ) : null}

      {viewMode === "attempts" ? (
        <div className="rounded-lg border bg-card">
          <div className="grid grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr] gap-4 border-b px-4 py-3 text-sm font-medium text-muted-foreground">
            <span>Exam</span>
            <span>Attempts</span>
            <span>Latest Score</span>
            <span>Latest Submitted</span>
          </div>
          {loading ? (
            <div className="flex min-h-52 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading exam attempts...
            </div>
          ) : resultGroups.length ? (
            <div className="divide-y">
              {resultGroups.map((group) => (
                <button
                  key={group.examId}
                  type="button"
                  className="grid w-full grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr] gap-4 px-4 py-4 text-left transition hover:bg-muted/40"
                  onClick={() => setResultExamId(group.examId)}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{group.title}</span>
                    <span className="block text-xs text-muted-foreground">{group.targetLabel}</span>
                  </span>
                  <span>{group.attempts.length}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {Number(group.latest?.obtained_marks ?? 0).toFixed(2)} /{" "}
                    {Number(group.latest?.total_marks ?? 0).toFixed(2)}
                  </span>
                  <span>{formatDateTime(group.latest?.submitted_at)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">
              No attempts yet.
            </div>
          )}
        </div>
      ) : null}

      {viewMode === "results" ? (
        <div className="rounded-lg border bg-card">
          <div className="grid grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr] gap-4 border-b px-4 py-3 text-sm font-medium text-muted-foreground">
            <span>Exam</span>
            <span>Attempts</span>
            <span>Latest Score</span>
            <span>Latest Submitted</span>
          </div>
          {loading ? (
            <div className="flex min-h-52 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading results...
            </div>
          ) : resultGroups.length ? (
            <div className="divide-y">
              {resultGroups.map((group) => (
                <button
                  key={group.examId}
                  type="button"
                  className="grid w-full grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr] gap-4 px-4 py-4 text-left transition hover:bg-muted/40"
                  onClick={() => setResultExamId(group.examId)}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{group.title}</span>
                    <span className="block text-xs text-muted-foreground">{group.targetLabel}</span>
                  </span>
                  <span>{group.attempts.length}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {Number(group.latest?.obtained_marks ?? 0).toFixed(2)} /{" "}
                    {Number(group.latest?.total_marks ?? 0).toFixed(2)}
                  </span>
                  <span>{formatDateTime(group.latest?.submitted_at)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">
              No results yet.
            </div>
          )}
        </div>
      ) : null}

      <Sheet
        open={Boolean(activeExam) || detailLoading}
        onOpenChange={(open) => {
          if (!open) {
            setActiveExam(null);
            setAnswers({});
          }
        }}
      >
        <SheetContent
          className="flex flex-col gap-0 p-0 sm:max-w-5xl"
          defaultSize={960}
          resizeStorageKey="classroom-exam-submit-sheet"
        >
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>{activeExam?.title ?? "Exam"}</SheetTitle>
            <SheetDescription>
              {activeExam
                ? `${activeExam.question_count} questions · ${Number(activeExam.total_marks).toFixed(2)} marks · ${activeExam.duration_minutes ?? 0} minutes`
                : "Loading exam questions..."}
            </SheetDescription>
            {activeExam && !activeExam.is_released ? (
              <Badge variant="outline" className="mt-3 w-fit border-amber-500/60 text-amber-500">
                Not public yet
              </Badge>
            ) : activeExam && activeAlreadySubmitted ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-500/60 text-emerald-600 dark:text-emerald-400"
                >
                  {statusLabel(activeExam.submission_status)}
                </Badge>
                {activeExam.obtained_marks !== null ? (
                  <Badge variant="secondary">
                    Marks: {Number(activeExam.obtained_marks).toFixed(2)} /{" "}
                    {Number(activeExam.total_marks).toFixed(2)}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Completed. You cannot submit this exam again.
                  </span>
                )}
              </div>
            ) : null}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {detailLoading || !activeExam ? (
              <div className="flex min-h-72 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading questions...
              </div>
            ) : !activeExam.is_released ? (
              <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-md border bg-card">
                <section className="flex flex-col items-center border-b px-5 py-8 text-center sm:px-8 sm:py-10">
                  <div className="relative flex size-28 items-center justify-center sm:size-36">
                    <span className="absolute inset-2 rounded-full border border-destructive/35" />
                    <span className="absolute inset-5 rounded-full border border-destructive/60" />
                    <ShieldCheck className="relative size-20 text-destructive sm:size-24" strokeWidth={1.35} />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                    This exam is <span className="text-destructive">protected</span>
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Questions will become available automatically at the scheduled exam date and time.
                  </p>
                </section>

                <section className="grid border-b sm:grid-cols-2">
                  {[
                    { label: "Exam Starts", value: formatExamDateTime(activeExam.exam_date, activeExam.exam_time), icon: CalendarClock },
                    { label: "Duration", value: `${activeExam.duration_minutes ?? 0} minutes`, icon: Clock3 },
                    { label: "Mode", value: activeExam.exam_mode ? activeExam.exam_mode.charAt(0).toUpperCase() + activeExam.exam_mode.slice(1) : "Not specified", icon: Monitor },
                    { label: "Place", value: activeExam.exam_place ?? "Not specified", icon: MapPin },
                  ].map(({ label, value, icon: Icon }, index) => (
                    <div
                      key={label}
                      className={cn(
                        "flex min-w-0 items-center gap-4 px-5 py-4 sm:px-7",
                        index < 2 && "border-b",
                        index % 2 === 0 && "sm:border-r",
                        index === 1 && "sm:border-b",
                        index === 2 && "border-b sm:border-b-0"
                      )}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-destructive/50 text-destructive">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="break-words font-semibold">{value}</p>
                      </div>
                    </div>
                  ))}
                </section>

                <section className="px-5 py-6 sm:px-8">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <div className="flex size-9 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                      <ShieldCheck className="size-5" />
                    </div>
                    <h3 className="text-lg font-semibold">Exam Rules for Students</h3>
                  </div>
                  <div className="divide-y">
                    {[
                      { text: "Questions are confidential until the scheduled start time.", icon: LockKeyhole, highlighted: false },
                      { text: "You can start the exam only at the scheduled start time.", icon: PlayCircle, highlighted: false },
                      { text: "You can submit this exam only once.", icon: CheckCircle2, highlighted: false },
                      { text: "Complete every required answer before submitting.", icon: FileCheck2, highlighted: false },
                      { text: "Do not refresh, close, or leave the exam window while answering.", icon: RefreshCw, highlighted: false },
                      { text: "Do not use unfair means or take help from others.", icon: Users, highlighted: false },
                      {
                        text: activeExam.instant_result
                          ? "Result will be available immediately after you submit the exam."
                          : `Result will be declared on ${formatExamDate(activeExam.result_date)}.`,
                        icon: BarChart3,
                        highlighted: true,
                      },
                    ].map(({ text, icon: Icon, highlighted = false }) => (
                      <div key={text} className="flex items-start gap-3 py-3 text-sm sm:text-base">
                        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-destructive/60 text-destructive">
                          <Icon className="size-3.5" />
                        </div>
                        <p className={cn(
                          "leading-6",
                          highlighted ? "font-bold text-destructive" : "text-muted-foreground"
                        )}>{text}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : activeAlreadySubmitted && !activeExam.result_available ? (
              <div className="rounded-lg border bg-card p-5">
                <h2 className="font-semibold">Exam completed</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your exam was submitted successfully. Please wait until {formatExamDate(activeExam.result_date)} for result declaration.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeAlreadySubmitted ? (
                  <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-5">
                    <div>
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className="mt-1 font-semibold">
                        {Number(activeExam.obtained_marks ?? 0).toFixed(2)} /{" "}
                        {Number(activeExam.total_marks).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Percentage</p>
                      <p className="mt-1 font-semibold">
                        {Number(activeExam.percentage ?? 0).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Correct</p>
                      <p className="mt-1 font-semibold text-emerald-500">
                        {activeExam.correct_answers ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Wrong</p>
                      <p className="mt-1 font-semibold text-destructive">
                        {activeExam.wrong_answers ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Skipped</p>
                      <p className="mt-1 font-semibold">{activeExam.unanswered ?? 0}</p>
                    </div>
                  </div>
                ) : null}
                {activeExam.questions.map((question) => (
                  <div key={question.id} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Badge variant="outline">Question {question.display_order}</Badge>
                        <h2 className="mt-3 text-base font-semibold">{question.question_text}</h2>
                      </div>
                      <Badge variant="secondary">{Number(question.marks).toFixed(2)} marks</Badge>
                    </div>

                    {question.files.length ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {question.files.map((file, index) => (
                          isImageUrl(file.url) ? (
                            <a
                              key={file.id}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block overflow-hidden rounded-md border bg-background"
                            >
                              <Image
                                src={file.url}
                                alt={`Question ${question.display_order} image ${index + 1}`}
                                width={640}
                                height={320}
                                className="h-48 w-full object-contain"
                              />
                            </a>
                          ) : (
                            <a
                              key={file.id}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              Open file {index + 1}
                            </a>
                          )
                        ))}
                      </div>
                    ) : null}

                    {question.question_type === "subjective" ? (
                      <div className="mt-4 space-y-2">
                        <Textarea
                          value={answers[question.id]?.answer_text ?? ""}
                          onChange={(event) => setAnswerText(question.id, event.target.value)}
                          placeholder="Write your answer..."
                          className="min-h-32"
                          disabled={activeAlreadySubmitted || isParentReadonly}
                        />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="h-px flex-1 bg-border" />
                          <span>or upload an image</span>
                          <span className="h-px flex-1 bg-border" />
                        </div>
                        <DocumentFileUpload
                          accessToken={accessToken}
                          files={answers[question.id]?.answer_image ? [answers[question.id].answer_image] : []}
                          onFilesChange={(files) => setAnswerImage(question.id, files)}
                          maxFiles={1}
                          maxSize={2 * 1024 * 1024}
                          buttonLabel="Upload image"
                          emptyText="Drop an image here or click to browse"
                          compact
                          disabled={activeAlreadySubmitted || isParentReadonly}
                        />
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-2">
                        {question.options.map((option) => {
                          const selected = answers[question.id]?.selected_option_id === option.id;
                          const correct = activeAlreadySubmitted && option.is_correct;
                          const wrongSelection = activeAlreadySubmitted && selected && !option.is_correct;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              disabled={activeAlreadySubmitted || isParentReadonly}
                              className={cn(
                                "rounded-md border px-3 py-2 text-left text-sm transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-80",
                                selected &&
                                  !activeAlreadySubmitted &&
                                  "border-destructive bg-destructive/10 text-destructive",
                                correct &&
                                  "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                                wrongSelection &&
                                  "border-destructive/70 bg-destructive/10 text-destructive"
                              )}
                              onClick={() => setSelectedOption(question.id, option.id)}
                            >
                              {option.text}
                              {correct ? " (correct answer)" : ""}
                              {wrongSelection ? " (your answer)" : ""}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {activeAlreadySubmitted && question.explanation ? (
                      <div className="mt-4 rounded-md border bg-background p-3 text-sm">
                        <p className="font-medium">Explanation</p>
                        <p className="mt-1 text-muted-foreground">{question.explanation}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <SheetFooter className="border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActiveExam(null);
                setAnswers({});
              }}
              disabled={submitting}
            >
              {activeExam?.is_released ? "Cancel" : "Close"}
            </Button>
            <Button
              type="button"
              onClick={() => void submitExam()}
              disabled={submitting || !activeExam || !activeExam.is_released || activeAlreadySubmitted || isParentReadonly}
              className={cn((isParentReadonly || !activeExam?.is_released || activeAlreadySubmitted) && "hidden")}
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {activeAlreadySubmitted ? "Completed" : "Submit Exam"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(selectedResultGroup)}
        onOpenChange={(open) => {
          if (!open) setResultExamId(null);
        }}
      >
        <SheetContent
          className="flex flex-col gap-0 p-0 sm:max-w-2xl"
          defaultSize={680}
          resizeStorageKey="classroom-exam-results-sheet"
        >
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>{selectedResultGroup?.title ?? "Exam Results"}</SheetTitle>
            <SheetDescription>
              {selectedResultGroup
                ? `${selectedResultGroup.attempts.length} attempt${selectedResultGroup.attempts.length === 1 ? "" : "s"} saved for this exam.`
                : "Loading result history..."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-3">
              {selectedResultGroup?.attempts.map((attempt) => (
                <div key={attempt.id} className="rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Attempt #{attempt.attempt_no}</Badge>
                        <Badge variant="secondary">v{attempt.exam_version}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Submitted {formatDateTime(attempt.submitted_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {Number(attempt.obtained_marks ?? 0).toFixed(2)} /{" "}
                        {Number(attempt.total_marks).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Number(attempt.percentage ?? 0).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-md border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Correct</p>
                      <p className="mt-1 font-semibold text-emerald-500">
                        {attempt.correct_answers ?? 0}
                      </p>
                    </div>
                    <div className="rounded-md border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Wrong</p>
                      <p className="mt-1 font-semibold text-destructive">
                        {attempt.wrong_answers ?? 0}
                      </p>
                    </div>
                    <div className="rounded-md border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Skipped</p>
                      <p className="mt-1 font-semibold">{attempt.unanswered ?? 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <SheetFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setResultExamId(null)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}





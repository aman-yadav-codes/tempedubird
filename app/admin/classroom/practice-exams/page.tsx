"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Loader2,
  RefreshCw,
  Search,
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
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

type PracticeExamRow = {
  id: number;
  title: string;
  description: string | null;
  total_marks: number;
  duration_minutes: number | null;
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
};

type PracticeExamAttempt = {
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

type PracticeExamQuestion = {
  id: number;
  question_text: string;
  question_type: "objective" | "true_false" | "subjective";
  marks: number;
  display_order: number;
  selected_option_id: number | null;
  answer_text: string | null;
  is_correct: boolean | null;
  marks_awarded: number | null;
  explanation: string | null;
  options: QuestionOption[];
  files: QuestionFile[];
};

type PracticeExamDetail = PracticeExamRow & {
  questions: PracticeExamQuestion[];
  time_taken_seconds: number | null;
};

type AnswerDraft = Record<number, { selected_option_id: number | null; answer_text: string }>;
type ViewMode = "all" | "practice" | "results";

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

function isSubmittedStatus(status: string | null | undefined) {
  return String(status ?? "").toLowerCase() === "completed";
}

function isPracticeExamLocked(row: Pick<PracticeExamRow, "question_count">) {
  return Number(row.question_count ?? 0) <= 0;
}

function isImageUrl(value: string) {
  return /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(value);
}

function buildDraft(questions: PracticeExamQuestion[]): AnswerDraft {
  return Object.fromEntries(
    questions.map((question) => [
      question.id,
      {
        selected_option_id: question.selected_option_id ?? null,
        answer_text: question.answer_text ?? "",
      },
    ])
  );
}

export default function ClassroomPracticeExamsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const isParentReadonly = Boolean(user?.role_codes?.includes("parent"));
  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken]
  );
  const [rows, setRows] = useState<PracticeExamRow[]>([]);
  const [attempts, setAttempts] = useState<PracticeExamAttempt[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activePracticeExam, setActivePracticeExam] = useState<PracticeExamDetail | null>(null);
  const [resultPracticeExamId, setResultPracticeExamId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerDraft>({});

  const fetchPracticeExams = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/classroom/practice-exams?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load practice exams");
      setRows(json.data ?? []);
      setAttempts(json.attempts ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load practice exams");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader, search]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void fetchPracticeExams(), 250);
    return () => window.clearTimeout(timeout);
  }, [fetchPracticeExams, isReady]);

  async function openPracticeExam(row: PracticeExamRow) {
    if (!accessToken) return;
    if (isPracticeExamLocked(row)) {
      toast.info("Practice exam is locked until at least one question is added.");
      return;
    }
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/classroom/practice-exams/${row.id}`, {
        headers: authHeader,
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to open practice exam");
      const detail = json.data as PracticeExamDetail;
      setActivePracticeExam(detail);
      setAnswers(buildDraft(detail.questions ?? []));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open practice exam");
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
      },
    }));
  }

  function setAnswerText(questionId: number, text: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: {
        selected_option_id: current[questionId]?.selected_option_id ?? null,
        answer_text: text,
      },
    }));
  }

  async function submitPracticeExam() {
    if (!activePracticeExam || !accessToken) return;
    if (isSubmittedStatus(activePracticeExam.submission_status)) {
      toast.error("This practice exam has already been submitted.");
      return;
    }

    const missing = activePracticeExam.questions.find((question) => {
      const draft = answers[question.id];
      if (question.question_type === "subjective") return !draft?.answer_text?.trim();
      return !draft?.selected_option_id;
    });
    if (missing) {
      toast.error(`Answer question ${missing.display_order} before submitting.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/classroom/practice-exams/${activePracticeExam.id}/submit`, {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers: activePracticeExam.questions.map((question) => ({
            question_id: question.id,
            selected_option_id: answers[question.id]?.selected_option_id ?? null,
            answer_text: answers[question.id]?.answer_text ?? "",
          })),
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to submit practice exam");
      toast.success("Practice exam submitted.");
      setActivePracticeExam(null);
      setAnswers({});
      setViewMode("practice");
      await fetchPracticeExams();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit practice exam");
    } finally {
      setSubmitting(false);
    }
  }

  const activeAlreadySubmitted = activePracticeExam
    ? isSubmittedStatus(activePracticeExam.submission_status)
    : false;
  const resultGroups = useMemo(() => {
    const map = new Map<number, PracticeExamAttempt[]>();
    for (const attempt of attempts) {
      const current = map.get(attempt.practice_exam_id) ?? [];
      current.push(attempt);
      map.set(attempt.practice_exam_id, current);
    }
    return Array.from(map.entries()).map(([practiceExamId, group]) => ({
      practiceExamId,
      title: group[0]?.title ?? "Practice Exam",
      targetLabel: group[0]?.target_label ?? group[0]?.institution_name ?? "Classroom",
      attempts: group,
      latest: group[0],
    }));
  }, [attempts]);
  const selectedResultGroup = resultPracticeExamId
    ? resultGroups.find((group) => group.practiceExamId === resultPracticeExamId) ?? null
    : null;

  if (!isReady) {
    return <div className="text-muted-foreground">Loading practice exams...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Practice Exams</h1>
          <p className="text-muted-foreground">
            {isParentReadonly
              ? "View practice exams, attempts, and results for the selected child."
              : "View your assigned exams, answer questions, and submit classroom practice exams."}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void fetchPracticeExams()}>
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          ["all", "All Exams"],
          ["practice", isParentReadonly ? "Practice" : "My Practice"],
          ["results", "Results"],
        ].map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant={viewMode === value ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode(value as ViewMode)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="flex max-w-sm items-center gap-2 rounded-md border bg-background px-3">
        <Search className="size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search practice exams..."
          className="border-0 px-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {viewMode === "all" ? (
        <div className="rounded-lg border bg-card">
          <div className="grid grid-cols-[1.7fr_0.7fr_0.8fr_0.8fr_0.9fr_0.8fr] gap-4 border-b px-4 py-3 text-sm font-medium text-muted-foreground">
            <span>Exam</span>
            <span>Version</span>
            <span>Questions</span>
            <span>Attempts</span>
            <span>Duration</span>
            <span>Status</span>
          </div>
          {loading ? (
            <div className="flex min-h-52 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading practice exams...
            </div>
          ) : rows.length ? (
            <div className="divide-y">
              {rows.map((row) => {
                const completedCurrent = isSubmittedStatus(row.submission_status);
                const updatedAvailable = !completedCurrent && row.attempt_count > 0;
                const locked = isPracticeExamLocked(row);
                const attempted = row.attempt_count > 0;
                return (
                  <button
                    key={row.id}
                    type="button"
                    disabled={locked}
                    className={cn(
                      "grid w-full grid-cols-[1.7fr_0.7fr_0.8fr_0.8fr_0.9fr_0.8fr] gap-4 px-4 py-4 text-left transition hover:bg-muted/40",
                      locked && "cursor-not-allowed opacity-75 hover:bg-transparent"
                    )}
                    onClick={() => void openPracticeExam(row)}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">{row.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {row.target_label ?? row.institution_name ?? "Classroom"}
                      </span>
                    </span>
                    <span>v{row.version}</span>
                    <span>{row.question_count}</span>
                    <span>{row.attempt_count}</span>
                    <span>{row.duration_minutes ? `${row.duration_minutes} min` : "-"}</span>
                    <span>
                      <Badge
                        variant="outline"
                        className={cn(
                          locked && "border-amber-500/60 text-amber-600 dark:text-amber-400",
                          (updatedAvailable || attempted) && "border-primary/60 text-primary"
                        )}
                      >
                        {locked
                          ? "Locked"
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
              No practice exams found for your current class and section.
            </div>
          )}
        </div>
      ) : null}

      {viewMode === "practice" ? (
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
              Loading practice attempts...
            </div>
          ) : resultGroups.length ? (
            <div className="divide-y">
              {resultGroups.map((group) => (
                <button
                  key={group.practiceExamId}
                  type="button"
                  className="grid w-full grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr] gap-4 px-4 py-4 text-left transition hover:bg-muted/40"
                  onClick={() => setResultPracticeExamId(group.practiceExamId)}
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
                  key={group.practiceExamId}
                  type="button"
                  className="grid w-full grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr] gap-4 px-4 py-4 text-left transition hover:bg-muted/40"
                  onClick={() => setResultPracticeExamId(group.practiceExamId)}
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
        open={Boolean(activePracticeExam) || detailLoading}
        onOpenChange={(open) => {
          if (!open) {
            setActivePracticeExam(null);
            setAnswers({});
          }
        }}
      >
        <SheetContent
          className="flex flex-col gap-0 p-0 sm:max-w-3xl"
          defaultSize={760}
          resizeStorageKey="classroom-practice-exam-submit-sheet"
        >
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>{activePracticeExam?.title ?? "Practice Exam"}</SheetTitle>
            <SheetDescription>
              {activePracticeExam
                ? `${activePracticeExam.questions.length} questions · ${Number(activePracticeExam.total_marks).toFixed(2)} marks · ${activePracticeExam.duration_minutes ?? 0} minutes`
                : "Loading practice exam questions..."}
            </SheetDescription>
            {activePracticeExam && activeAlreadySubmitted ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-500/60 text-emerald-600 dark:text-emerald-400"
                >
                  {statusLabel(activePracticeExam.submission_status)}
                </Badge>
                {activePracticeExam.obtained_marks !== null ? (
                  <Badge variant="secondary">
                    Marks: {Number(activePracticeExam.obtained_marks).toFixed(2)} /{" "}
                    {Number(activePracticeExam.total_marks).toFixed(2)}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Completed. You cannot submit this practice exam again.
                  </span>
                )}
              </div>
            ) : null}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {detailLoading || !activePracticeExam ? (
              <div className="flex min-h-72 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading questions...
              </div>
            ) : (
              <div className="space-y-4">
                {activeAlreadySubmitted ? (
                  <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-5">
                    <div>
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className="mt-1 font-semibold">
                        {Number(activePracticeExam.obtained_marks ?? 0).toFixed(2)} /{" "}
                        {Number(activePracticeExam.total_marks).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Percentage</p>
                      <p className="mt-1 font-semibold">
                        {Number(activePracticeExam.percentage ?? 0).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Correct</p>
                      <p className="mt-1 font-semibold text-emerald-500">
                        {activePracticeExam.correct_answers ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Wrong</p>
                      <p className="mt-1 font-semibold text-destructive">
                        {activePracticeExam.wrong_answers ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Skipped</p>
                      <p className="mt-1 font-semibold">{activePracticeExam.unanswered ?? 0}</p>
                    </div>
                  </div>
                ) : null}
                {activePracticeExam.questions.map((question) => (
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
                      <Textarea
                        value={answers[question.id]?.answer_text ?? ""}
                        onChange={(event) => setAnswerText(question.id, event.target.value)}
                        placeholder="Write your answer..."
                        className="mt-4 min-h-32"
                        disabled={activeAlreadySubmitted || isParentReadonly}
                      />
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
                setActivePracticeExam(null);
                setAnswers({});
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitPracticeExam()}
              disabled={submitting || !activePracticeExam || activeAlreadySubmitted || isParentReadonly}
              className={cn(isParentReadonly && "hidden")}
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {activeAlreadySubmitted ? "Completed" : "Submit Practice Exam"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(selectedResultGroup)}
        onOpenChange={(open) => {
          if (!open) setResultPracticeExamId(null);
        }}
      >
        <SheetContent
          className="flex flex-col gap-0 p-0 sm:max-w-2xl"
          defaultSize={680}
          resizeStorageKey="classroom-practice-exam-results-sheet"
        >
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>{selectedResultGroup?.title ?? "Practice Exam Results"}</SheetTitle>
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
            <Button type="button" variant="outline" onClick={() => setResultPracticeExamId(null)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}





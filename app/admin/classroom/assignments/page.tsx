"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
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
import {
  DocumentFileUpload,
  type UploadedDocumentFile,
} from "@/components/shared/document-file-upload";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

type AssignmentRow = {
  id: number;
  title: string;
  description: string | null;
  total_marks: number;
  issue_date: string;
  submission_date: string;
  institution_name: string;
  target_type: string | null;
  target_label: string | null;
  question_count: number;
  submission_status: string;
  submitted_at: string | null;
  obtained_marks: number | null;
};

type AssignmentStats = {
  total: number;
  pending: number;
  submitted: number;
  overdue: number;
};

type QuestionOption = {
  id: number;
  text: string;
};

type QuestionFile = {
  id: number;
  url: string;
};

type AssignmentQuestion = {
  id: number;
  question_text: string;
  question_type: "objective" | "true_false" | "subjective";
  marks: number;
  display_order: number;
  selected_option_id: number | null;
  answer_text: string | null;
  answer_image_url: string | null;
  options: QuestionOption[];
  files: QuestionFile[];
};

type AssignmentDetail = AssignmentRow & {
  questions: AssignmentQuestion[];
};

type AnswerDraft = Record<number, {
  selected_option_id: number | null;
  answer_text: string;
  answer_image: UploadedDocumentFile | null;
}>;

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid response" };
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "checked") return "Checked";
  if (normalized === "submitted") return "Submitted";
  return "Pending";
}

function isAssignmentLocked(row: Pick<AssignmentRow, "question_count">) {
  return Number(row.question_count ?? 0) <= 0;
}

function isSubmittedStatus(status: string | null | undefined) {
  return ["submitted", "checked"].includes(String(status ?? "").toLowerCase());
}

function isOverdue(row: AssignmentRow) {
  return !isAssignmentLocked(row) && !isSubmittedStatus(row.submission_status) && new Date(row.submission_date) < new Date();
}

function isImageUrl(value: string) {
  return /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(value);
}

function buildDraft(questions: AssignmentQuestion[]): AnswerDraft {
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

export default function ClassroomAssignmentsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const isParentReadonly = Boolean(user?.role_codes?.includes("parent"));
  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken]
  );
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [stats, setStats] = useState<AssignmentStats>({
    total: 0,
    pending: 0,
    submitted: 0,
    overdue: 0,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<AssignmentDetail | null>(null);
  const [answers, setAnswers] = useState<AnswerDraft>({});

  const fetchAssignments = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/classroom/assignments?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load assignments");
      setRows(json.data ?? []);
      setStats(json.stats ?? { total: 0, pending: 0, submitted: 0, overdue: 0 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader, search]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void fetchAssignments(), 250);
    return () => window.clearTimeout(timeout);
  }, [fetchAssignments, isReady]);

  async function openAssignment(row: AssignmentRow) {
    if (!accessToken) return;
    if (isAssignmentLocked(row)) {
      toast.info("Assignment is locked until at least one question is added.");
      return;
    }
    setDetailLoading(true);
    try {
      const params = new URLSearchParams({ assignmentId: String(row.id) });
      const res = await fetch(`/api/admin/classroom/assignments?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to open assignment");
      const detail = json.data as AssignmentDetail;
      setActiveAssignment(detail);
      setAnswers(buildDraft(detail.questions ?? []));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open assignment");
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

  async function submitAssignment() {
    if (!activeAssignment || !accessToken) return;
    if (isSubmittedStatus(activeAssignment.submission_status)) {
      toast.error("This assignment has already been submitted.");
      return;
    }

    const missing = activeAssignment.questions.find((question) => {
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
      const params = new URLSearchParams({ assignmentId: String(activeAssignment.id) });
      const res = await fetch(`/api/admin/classroom/assignments?${params.toString()}`, {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers: activeAssignment.questions.map((question) => ({
            question_id: question.id,
            selected_option_id: answers[question.id]?.selected_option_id ?? null,
            answer_text: answers[question.id]?.answer_text ?? "",
            answer_image_url: answers[question.id]?.answer_image?.url ?? null,
          })),
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to submit assignment");
      toast.success("Assignment submitted.");
      setActiveAssignment(null);
      setAnswers({});
      await fetchAssignments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  }

  const cards = [
    { label: "Total Assignments", value: stats.total, icon: ClipboardList },
    { label: "Pending", value: stats.pending, icon: CalendarDays },
    { label: "Submitted", value: stats.submitted, icon: CheckCircle2 },
    { label: "Overdue", value: stats.overdue, icon: FileText },
  ];
  const activeAlreadySubmitted = activeAssignment
    ? isSubmittedStatus(activeAssignment.submission_status)
    : false;

  if (!isReady) {
    return <div className="text-muted-foreground">Loading assignments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">
            {isParentReadonly
              ? "View assignments and submission status for the selected child."
              : "View your assigned work, answer questions, and submit classroom assignments."}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void fetchAssignments()}>
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <card.icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex max-w-sm items-center gap-2 rounded-md border bg-background px-3">
        <Search className="size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search assignments..."
          className="border-0 px-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr_0.8fr] gap-4 border-b px-4 py-3 text-sm font-medium text-muted-foreground">
          <span>Assignment</span>
          <span>Questions</span>
          <span>Marks</span>
          <span>Due</span>
          <span>Status</span>
        </div>
        {loading ? (
          <div className="flex min-h-52 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading assignments...
          </div>
        ) : rows.length ? (
          <div className="divide-y">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                disabled={isAssignmentLocked(row)}
                className={cn(
                  "grid w-full grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr_0.8fr] gap-4 px-4 py-4 text-left transition hover:bg-muted/40",
                  isAssignmentLocked(row) && "cursor-not-allowed opacity-75 hover:bg-transparent"
                )}
                onClick={() => void openAssignment(row)}
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{row.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {row.target_label ?? row.institution_name ?? "Classroom"}
                  </span>
                </span>
                <span>{row.question_count}</span>
                <span>
                  {row.submission_status?.toLowerCase() === "checked" &&
                  row.obtained_marks !== null ? (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {Number(row.obtained_marks).toFixed(2)} / {Number(row.total_marks).toFixed(2)}
                    </span>
                  ) : (
                    Number(row.total_marks).toFixed(2)
                  )}
                </span>
                <span>{formatDate(row.submission_date)}</span>
                <span>
                  <Badge
                    variant="outline"
                    className={cn(
                      isSubmittedStatus(row.submission_status) &&
                        "border-emerald-500/60 text-emerald-600 dark:text-emerald-400",
                      isAssignmentLocked(row) && "border-amber-500/60 text-amber-600 dark:text-amber-400",
                      isOverdue(row) && "border-destructive/60 text-destructive"
                    )}
                  >
                    {isAssignmentLocked(row)
                      ? "Locked"
                      : isOverdue(row)
                        ? "Overdue"
                        : statusLabel(row.submission_status)}
                  </Badge>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-4 py-16 text-center text-sm text-muted-foreground">
            No assignments found for your current class and section.
          </div>
        )}
      </div>

      <Sheet
        open={Boolean(activeAssignment) || detailLoading}
        onOpenChange={(open) => {
          if (!open) {
            setActiveAssignment(null);
            setAnswers({});
          }
        }}
      >
        <SheetContent
          className="flex flex-col gap-0 p-0 sm:max-w-3xl"
          defaultSize={760}
          resizeStorageKey="classroom-assignment-submit-sheet"
        >
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>{activeAssignment?.title ?? "Assignment"}</SheetTitle>
            <SheetDescription>
              {activeAssignment
                ? `${activeAssignment.questions.length} questions · ${Number(activeAssignment.total_marks).toFixed(2)} marks · due ${formatDate(activeAssignment.submission_date)}`
                : "Loading assignment questions..."}
            </SheetDescription>
            {activeAssignment && activeAlreadySubmitted ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-500/60 text-emerald-600 dark:text-emerald-400"
                >
                  {statusLabel(activeAssignment.submission_status)}
                </Badge>
                {activeAssignment.submission_status.toLowerCase() === "checked" &&
                activeAssignment.obtained_marks !== null ? (
                  <Badge variant="secondary">
                    Marks: {Number(activeAssignment.obtained_marks).toFixed(2)} /{" "}
                    {Number(activeAssignment.total_marks).toFixed(2)}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Already submitted. You cannot submit this assignment again.
                  </span>
                )}
              </div>
            ) : null}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {detailLoading || !activeAssignment ? (
              <div className="flex min-h-72 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading questions...
              </div>
            ) : (
              <div className="space-y-4">
                {activeAssignment.questions.map((question) => (
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
                          className="min-h-28"
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
                          return (
                            <button
                              key={option.id}
                              type="button"
                              disabled={activeAlreadySubmitted || isParentReadonly}
                              className={cn(
                                "rounded-md border px-3 py-2 text-left text-sm transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-80",
                                selected && "border-destructive bg-destructive/10 text-destructive"
                              )}
                              onClick={() => setSelectedOption(question.id, option.id)}
                            >
                              {option.text}
                            </button>
                          );
                        })}
                      </div>
                    )}
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
                setActiveAssignment(null);
                setAnswers({});
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitAssignment()}
              disabled={submitting || !activeAssignment || activeAlreadySubmitted || isParentReadonly}
              className={cn(isParentReadonly && "hidden")}
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {activeAlreadySubmitted ? "Already Submitted" : "Submit Assignment"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import Image from "next/image";
import { Eye, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

type ExamAttemptRow = {
  id: number;
  practice_exam_id: number;
  student_id: number;
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
  duration_minutes: number | null;
  exam_date: string | null;
  exam_time: string | null;
  exam_mode: string | null;
  institution_name: string;
  student_name: string;
  student_email: string | null;
  student_avatar_url: string | null;
  admission_number: string | null;
  roll_number: string | null;
  answered_count: number;
};

type ExamAnswer = {
  question_id: number;
  question_text: string;
  question_type: string;
  marks: number;
  display_order: number;
  explanation: string | null;
  answer_id: number | null;
  selected_option_id: number | null;
  selected_option_text: string | null;
  selected_option_is_correct: boolean | null;
  answer_text: string | null;
  is_correct: boolean | null;
  marks_awarded: number | null;
  options: Array<{ id: number; text: string; is_correct: boolean }>;
  files: Array<{ id: number; url: string }>;
};

type ExamAttemptDetail = {
  attempt: ExamAttemptRow & {
    started_at: string | null;
  };
  answers: ExamAnswer[];
};

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid response" };
  }
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
  if (!date || !time) return "-";
  return formatDateTime(`${toLocalDateOnly(date)}T${String(time).slice(0, 5)}`);
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S"
  );
}

function isImageUrl(value: string) {
  return /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(value);
}

export default function StudentExamsPage() {
  const { isReady } = useAdminGuard();
  const { activeInstitution } = useActiveInstitution();
  const { accessToken } = useAuthStore();
  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken],
  );
  const institutionId = activeInstitution ? String(activeInstitution.id) : "";

  const [rows, setRows] = useState<ExamAttemptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ExamAttemptDetail | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const fetchAttempts = useCallback(async () => {
    if (!accessToken) return;
    if (!institutionId) {
      setRows([]);
      setPageCount(0);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        institutionId,
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search: debouncedSearch,
      });
      const res = await fetch(`/api/admin/students/exams?${params}`, {
        headers: authHeader,
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load exam submissions");
      setRows(json.data ?? []);
      setPageCount(json.pageCount ?? 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load exam submissions");
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    authHeader,
    debouncedSearch,
    institutionId,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void fetchAttempts(), 0);
    return () => window.clearTimeout(timeout);
  }, [fetchAttempts, isReady]);

  const openAttempt = useCallback(
    async (row: ExamAttemptRow) => {
      if (!accessToken) return;
      setDetailOpen(true);
      setDetail(null);
      setDetailLoading(true);
      try {
        const params = institutionId
          ? `?${new URLSearchParams({ institutionId })}`
          : "";
        const res = await fetch(`/api/admin/students/practice/attempts/${row.id}${params}`, {
          headers: authHeader,
        });
        const json = await readJson(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to load exam submission");
        setDetail(json.data ?? null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load exam submission");
      } finally {
        setDetailLoading(false);
      }
    },
    [accessToken, authHeader, institutionId],
  );

  const columns = useMemo<ColumnDef<ExamAttemptRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
            aria-label="Select all exam submissions"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label={`Select ${row.original.title}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "title",
        header: "Exam",
        cell: ({ row }) => (
          <div className="min-w-72">
            <p className="font-semibold">{row.original.title}</p>
            <p className="text-xs text-muted-foreground">
              {formatExamDateTime(row.original.exam_date, row.original.exam_time)} -{" "}
              {row.original.duration_minutes ? `${row.original.duration_minutes} min` : "Duration not set"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "student_name",
        header: "Student",
        cell: ({ row }) => (
          <div className="flex min-w-56 items-center gap-3">
            <Avatar className="size-9">
              <AvatarImage
                src={row.original.student_avatar_url || undefined}
                alt={row.original.student_name}
              />
              <AvatarFallback>{initials(row.original.student_name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{row.original.student_name}</p>
              <p className="text-xs text-muted-foreground">
                {row.original.admission_number ||
                  row.original.roll_number ||
                  row.original.student_email ||
                  `Student ${row.original.student_id}`}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "obtained_marks",
        header: "Marks",
        cell: ({ row }) => (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {Number(row.original.obtained_marks ?? 0).toFixed(2)} /{" "}
            {Number(row.original.total_marks ?? 0).toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="border-emerald-500/60 text-emerald-600 dark:text-emerald-400"
          >
            {row.original.status === "completed" ? "Submitted" : row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "submitted_at",
        header: "Submitted",
        cell: ({ row }) => formatDateTime(row.original.submitted_at),
      },
      {
        id: "actions",
        header: "Actions",
        enableHiding: false,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              void openAttempt(row.original);
            }}
          >
            <Eye className="size-4" />
            View
          </Button>
        ),
      },
    ],
    [openAttempt],
  );

  if (!isReady) {
    return <div className="text-muted-foreground">Loading exam submissions...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Exams</h1>
        <p className="text-muted-foreground">
          Review submitted student exams, marks, and answer results.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyText={
          institutionId
            ? "No submitted student exams found."
            : "Select an institution from the sidebar to view submitted exams."
        }
        manualPagination
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        getRowId={(row) => String(row.id)}
        selectionResetKey={`${institutionId}:${debouncedSearch}:${pagination.pageSize}`}
        enableRowSelection
        onRowClick={(row) => void openAttempt(row)}
        toolbarLeft={
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
            placeholder="Search exams or students..."
            disabled={!institutionId}
            className="h-9 w-80 max-w-full"
          />
        }
        toolbarRight={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void fetchAttempts()}
            disabled={!institutionId || loading}
          >
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            <span className="sr-only">Refresh exam submissions</span>
          </Button>
        }
      />

      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetail(null);
        }}
      >
        <SheetContent
          className="flex flex-col gap-0 p-0 sm:max-w-3xl"
          defaultSize={760}
          resizeStorageKey="student-exam-submission-review-sheet"
        >
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>{detail?.attempt.title ?? "Exam Submission"}</SheetTitle>
            <SheetDescription>
              {detail
                ? `${detail.attempt.student_name} - Submitted ${formatDateTime(detail.attempt.submitted_at)}`
                : "Loading student exam submission..."}
            </SheetDescription>
            {detail ? (
              <div className="mt-3 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-5">
                <div>
                  <p className="text-xs text-muted-foreground">Marks</p>
                  <p className="mt-1 font-semibold">
                    {Number(detail.attempt.obtained_marks ?? 0).toFixed(2)} /{" "}
                    {Number(detail.attempt.total_marks ?? 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Percentage</p>
                  <p className="mt-1 font-semibold">
                    {Number(detail.attempt.percentage ?? 0).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Correct</p>
                  <p className="mt-1 font-semibold text-emerald-500">
                    {detail.attempt.correct_answers ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Wrong</p>
                  <p className="mt-1 font-semibold text-destructive">
                    {detail.attempt.wrong_answers ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                  <p className="mt-1 font-semibold">
                    {detail.attempt.unanswered ?? 0}
                  </p>
                </div>
              </div>
            ) : null}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {detailLoading ? (
              <div className="flex min-h-72 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading answers...
              </div>
            ) : detail ? (
              <div className="space-y-4">
                {detail.answers.map((answer) => {
                  const isObjective =
                    answer.question_type === "objective" ||
                    answer.question_type === "true_false";
                  const isCorrect = answer.is_correct === true;
                  const isWrong = answer.is_correct === false;
                  const correctOption = answer.options.find((option) => option.is_correct);
                  return (
                    <div
                      key={answer.question_id}
                      className="rounded-lg border bg-card p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">
                              Question {answer.display_order}
                            </Badge>
                            {isCorrect ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/60 text-emerald-500"
                              >
                                Correct
                              </Badge>
                            ) : null}
                            {isWrong ? (
                              <Badge
                                variant="outline"
                                className="border-destructive/70 text-destructive"
                              >
                                Wrong
                              </Badge>
                            ) : null}
                          </div>
                          <h3 className="mt-3 font-semibold">
                            {answer.question_text}
                          </h3>
                        </div>
                        <Badge variant="secondary">
                          {Number(answer.marks_awarded ?? 0).toFixed(2)} /{" "}
                          {Number(answer.marks).toFixed(2)} marks
                        </Badge>
                      </div>

                      {answer.files.length ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {answer.files.map((file, index) =>
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
                                  alt={`Question ${answer.display_order} image ${index + 1}`}
                                  width={640}
                                  height={320}
                                  className="h-44 w-full object-contain"
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
                                Open attachment {index + 1}
                              </a>
                            ),
                          )}
                        </div>
                      ) : null}

                      {isObjective ? (
                        <div className="mt-4 grid gap-2">
                          {answer.options.map((option) => {
                            const selected = option.id === answer.selected_option_id;
                            const correct = option.is_correct;
                            return (
                              <div
                                key={option.id}
                                className={cn(
                                  "rounded-md border px-3 py-2 text-sm",
                                  correct &&
                                    "border-emerald-500/70 bg-emerald-500/10 text-emerald-500",
                                  selected &&
                                    !correct &&
                                    "border-destructive/70 bg-destructive/10 text-destructive",
                                )}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium">{option.text}</span>
                                  <span className="flex flex-wrap gap-2">
                                    {correct ? (
                                      <Badge
                                        variant="outline"
                                        className="border-emerald-500/60 text-emerald-500"
                                      >
                                        Correct answer
                                      </Badge>
                                    ) : null}
                                    {selected ? (
                                      <Badge
                                        variant="outline"
                                        className={
                                          correct
                                            ? "border-emerald-500/60 text-emerald-500"
                                            : "border-destructive/70 text-destructive"
                                        }
                                      >
                                        Student marked
                                      </Badge>
                                    ) : null}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-md border bg-background p-3 text-sm">
                          <p className="text-xs font-medium text-muted-foreground">
                            Student answer
                          </p>
                          <p className="mt-2 whitespace-pre-wrap">
                            {answer.answer_text || "No answer text"}
                          </p>
                        </div>
                      )}

                      <div className="mt-4 rounded-md border bg-background p-3 text-sm">
                        <p className="text-xs font-medium text-muted-foreground">
                          Result
                        </p>
                        <p
                          className={cn(
                            "mt-2 font-medium",
                            isCorrect && "text-emerald-500",
                            isWrong && "text-destructive",
                          )}
                        >
                          {isObjective
                            ? answer.selected_option_text || "No option selected"
                            : answer.answer_text || "No answer text"}
                          {isCorrect ? " (correct)" : ""}
                          {isWrong ? " (wrong)" : ""}
                        </p>
                        {isWrong && correctOption ? (
                          <p className="mt-2 text-xs font-medium text-emerald-500">
                            Correct answer is {correctOption.text}
                          </p>
                        ) : null}
                        {answer.explanation ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {answer.explanation}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No answer details found.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

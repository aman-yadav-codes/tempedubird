"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import Image from "next/image";
import { CheckCircle2, Eye, Loader2, RefreshCw, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAuthStore } from "@/store";

type ProgramOption = { id: number; title: string };
type SectionOption = { id: number; name: string };
type AssignmentRow = {
  id: number;
  title: string;
  description: string | null;
  total_marks: number;
  issue_date: string;
  submission_date: string;
  status: string;
  institution_name: string;
  target_type: string | null;
  target_label: string | null;
  question_count: number;
  student_count: number;
  submitted_count: number;
};
type SubmissionStudent = {
  student_id: number;
  user_id: number;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  admission_number: string | null;
  roll_number: string | null;
  status: string;
  submitted_at: string | null;
  obtained_marks: number | null;
  checked_at: string | null;
};
type CheckAnswer = {
  answer_id: number | null;
  question_id: number;
  question_text: string;
  question_type: string;
  marks: number;
  display_order: number;
  selected_option_id: number | null;
  selected_option_text: string | null;
  selected_option_is_correct: boolean | null;
  answer_text: string | null;
  marks_awarded: number | null;
  options: Array<{ id: number; text: string; is_correct: boolean }>;
  files: Array<{ id: number; url: string }>;
};
type CheckPayload = {
  submission: {
    id: number;
    assignment_title: string;
    total_marks: number;
    obtained_marks: number | null;
    full_name: string;
    admission_number: string | null;
    roll_number: string | null;
    status: string;
  };
  answers: CheckAnswer[];
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

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";
}

function isImageUrl(value: string) {
  return /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(value);
}

export default function StudentAssignmentsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken]
  );
  const selectedInstitutionId = activeInstitution ? String(activeInstitution.id) : "";
  const [programId, setProgramId] = useState("");
  const [programName, setProgramName] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [programLoading, setProgramLoading] = useState(false);
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentRow | null>(null);
  const [submissionRows, setSubmissionRows] = useState<SubmissionStudent[]>([]);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [checkOpen, setCheckOpen] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkSaving, setCheckSaving] = useState(false);
  const [checkTarget, setCheckTarget] = useState<SubmissionStudent | null>(null);
  const [checkData, setCheckData] = useState<CheckPayload | null>(null);
  const [answerChecks, setAnswerChecks] = useState<Record<number, boolean>>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setProgramId("");
      setProgramName("");
      setSectionId("");
      setSections([]);
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [selectedInstitutionId]);

  const fetchPrograms = useCallback(async (searchValue: string, page: number) => {
    if (!selectedInstitutionId) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      page: String(page),
      limit: "15",
      search: searchValue,
      institutionId: selectedInstitutionId,
    });
    const res = await fetch(`/api/admin/institutions/programs?${params.toString()}`, {
      headers: authHeader,
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to load classes");
    return { data: json.data || [], hasMore: page < json.pageCount };
  }, [authHeader, selectedInstitutionId]);

  async function loadProgramDetail(id: string) {
    if (!id) {
      setSections([]);
      return;
    }
    setProgramLoading(true);
    try {
      const res = await fetch(`/api/admin/institutions/programs/${id}`, {
        headers: authHeader,
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load class");
      setSections(
        (json.data?.section_ids ?? []).map((value: number, index: number) => ({
          id: value,
          name: json.data?.section_names?.[index] ?? `Section ${value}`,
        }))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load class");
    } finally {
      setProgramLoading(false);
    }
  }

  const fetchRows = useCallback(async () => {
    if (!accessToken) return;
    if (!selectedInstitutionId) {
      setRows([]);
      setPageCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search: debouncedSearch,
      });
      params.set("institutionId", selectedInstitutionId);
      if (programId) params.set("programId", programId);
      if (sectionId) params.set("sectionId", sectionId);
      const res = await fetch(`/api/admin/students/assignments?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load assignments");
      setRows(json.data ?? []);
      setPageCount(json.pageCount ?? 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    authHeader,
    debouncedSearch,
    selectedInstitutionId,
    pagination.pageIndex,
    pagination.pageSize,
    programId,
    sectionId,
  ]);

  const fetchSubmissions = useCallback(async (assignment: AssignmentRow) => {
    if (!accessToken) return;
    setSelectedAssignment(assignment);
    setSubmissionSearch("");
    setSubmissionLoading(true);
    try {
      const params = new URLSearchParams();
      if (programId) params.set("programId", programId);
      if (sectionId) params.set("sectionId", sectionId);
      const res = await fetch(
        `/api/admin/students/assignments/${assignment.id}/submissions?${params.toString()}`,
        { headers: authHeader }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load submissions");
      setSubmissionRows(json.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load submissions");
      setSubmissionRows([]);
    } finally {
      setSubmissionLoading(false);
    }
  }, [accessToken, authHeader, programId, sectionId]);

  const openCheckDialog = useCallback(async (student: SubmissionStudent) => {
    if (!selectedAssignment || !accessToken) return;
    setCheckTarget(student);
    setCheckOpen(true);
    setCheckLoading(true);
    setCheckData(null);
    try {
      const res = await fetch(
        `/api/admin/students/assignments/${selectedAssignment.id}/submissions/${student.student_id}`,
        { headers: authHeader }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load answers");
      const data = json.data as CheckPayload;
      setCheckData(data);
      setAnswerChecks(
        Object.fromEntries(
          data.answers
            .filter((answer) => answer.answer_id)
            .map((answer) => [
              Number(answer.answer_id),
              answer.marks_awarded !== null
                ? Number(answer.marks_awarded) > 0
                : answer.selected_option_is_correct === true,
            ])
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load answers");
    } finally {
      setCheckLoading(false);
    }
  }, [accessToken, authHeader, selectedAssignment]);

  async function saveChecks() {
    if (!selectedAssignment || !checkTarget || !checkData || !accessToken) return;
    setCheckSaving(true);
    try {
      const res = await fetch(
        `/api/admin/students/assignments/${selectedAssignment.id}/submissions/${checkTarget.student_id}`,
        {
          method: "PATCH",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: checkData.answers
              .filter((answer) => answer.answer_id)
              .map((answer) => ({
                answer_id: answer.answer_id,
                correct: answerChecks[Number(answer.answer_id)] === true,
              })),
          }),
        }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to save checks");
      toast.success("Submission checked.");
      setCheckOpen(false);
      setCheckData(null);
      await fetchSubmissions(selectedAssignment);
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save checks");
    } finally {
      setCheckSaving(false);
    }
  }

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void fetchRows(), 0);
    return () => window.clearTimeout(timeout);
  }, [fetchRows, isReady]);

  const columns = useMemo<ColumnDef<AssignmentRow>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
          aria-label="Select all assignments"
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
      header: "Assignment",
      cell: ({ row }) => (
        <div className="min-w-[260px]">
          <p className="font-semibold">{row.original.title}</p>
        </div>
      ),
    },
    {
      accessorKey: "target_label",
      header: "Target",
      cell: ({ row }) => (
        <div>
          <Badge variant="outline">{row.original.target_type ?? "Target"}</Badge>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.original.target_label ?? "-"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={
            row.original.status === "active"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : ""
          }
          variant={row.original.status === "active" ? "secondary" : "outline"}
        >
          {row.original.status}
        </Badge>
      ),
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
          onClick={() => void fetchSubmissions(row.original)}
        >
          <Eye className="size-4" />
          View
        </Button>
      ),
    },
  ], [fetchSubmissions]);

  const submittedTotal = submissionRows.filter(
    (student) => ["submitted", "checked"].includes(student.status.toLowerCase())
  ).length;
  const filteredSubmissionRows = useMemo(() => {
    const term = submissionSearch.trim().toLowerCase();
    if (!term) return submissionRows;

    return submissionRows.filter((student) =>
      [
        student.full_name,
        student.email,
        student.admission_number,
        student.roll_number,
        String(student.student_id),
        String(student.user_id),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [submissionRows, submissionSearch]);
  const checkedTotal = checkData?.answers.reduce((sum, answer) => {
    if (!answer.answer_id || answerChecks[answer.answer_id] !== true) return sum;
    return sum + Number(answer.marks);
  }, 0) ?? 0;

  if (!isReady) return <div className="text-muted-foreground">Loading assignments...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
        <p className="text-muted-foreground">
          View assignments assigned to an institution, class, section, or student.
        </p>
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Class / Program</Label>
              <Badge variant="outline" className="shrink-0">Step 1</Badge>
            </div>
            <AsyncSearchPopover<ProgramOption>
              value={programId}
              selectedLabel={programName}
              onChange={(value) => {
                setProgramId(value);
                setSectionId("");
                setSections([]);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
                if (value) void loadProgramDetail(value);
              }}
              onSelectItem={(item) => setProgramName(item.title)}
              fetcher={fetchPrograms}
              getValue={(item) => String(item.id)}
              getLabel={(item) => item.title}
              placeholder={
                selectedInstitutionId
                  ? "Select class..."
                  : "Select institution from sidebar"
              }
              searchPlaceholder="Search classes..."
              emptyText="No classes found"
              disabled={!selectedInstitutionId}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Section</Label>
              <Badge variant="outline" className="shrink-0">Step 2</Badge>
            </div>
            <Select
              value={sectionId}
              onValueChange={(value) => {
                setSectionId(value);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
              disabled={!programId || programLoading || sections.length === 0}
            >
              <SelectTrigger>
                {programLoading ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading sections...
                  </span>
                ) : (
                  <SelectValue
                    placeholder={
                      sections.length
                        ? "Select section..."
                        : programId
                          ? "No sections"
                          : "Select class first"
                    }
                  />
                )}
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={String(section.id)}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyText={
          selectedInstitutionId
            ? "No assignments found."
            : "Select an institution from the sidebar to view assignments."
        }
        manualPagination
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        getRowId={(row) => String(row.id)}
        selectionResetKey={`${selectedInstitutionId}:${programId}:${sectionId}:${debouncedSearch}:${pagination.pageSize}`}
        enableRowSelection
        onRowClick={(row) => void fetchSubmissions(row)}
        toolbarLeft={
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
            placeholder="Search assignments..."
            disabled={!selectedInstitutionId}
            className="h-9 w-72 max-w-full"
          />
        }
        toolbarRight={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void fetchRows()}
          >
            <RefreshCw
              className={loading ? "size-4 animate-spin" : "size-4"}
            />
            <span className="sr-only">Refresh assignments</span>
          </Button>
        }
      />

      <Sheet
        open={Boolean(selectedAssignment)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAssignment(null);
            setSubmissionRows([]);
            setSubmissionSearch("");
          }
        }}
      >
        <SheetContent
          className="flex flex-col gap-0 p-0 sm:max-w-xl"
          defaultSize={560}
          resizeStorageKey="student-assignment-submissions-sheet"
        >
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              {selectedAssignment?.title ?? "Assignment submissions"}
            </SheetTitle>
            <SheetDescription>
              {selectedAssignment
                ? `${submittedTotal}/${submissionRows.length} submitted for ${programName || selectedAssignment.target_label || "selected scope"}${sectionId ? ` - Section ${sections.find((section) => String(section.id) === sectionId)?.name ?? sectionId}` : ""}.`
                : "Student submission status for this assignment."}
            </SheetDescription>
            {selectedAssignment ? (
              <div className="grid gap-2 pt-3 sm:grid-cols-4">
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">
                    Questions
                  </p>
                  <p className="text-sm font-semibold">
                    {selectedAssignment.question_count}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">
                    Marks
                  </p>
                  <p className="text-sm font-semibold">
                    {Number(selectedAssignment.total_marks).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">
                    Due
                  </p>
                  <p className="text-sm font-semibold">
                    {formatDate(selectedAssignment.submission_date)}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">
                    Submitted
                  </p>
                  <p className="text-sm font-semibold">
                    {submittedTotal}/{submissionRows.length}
                  </p>
                </div>
              </div>
            ) : null}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {submissionLoading ? (
              <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading students...
              </div>
            ) : submissionRows.length > 0 ? (
              <div className="space-y-4">
                <Input
                  value={submissionSearch}
                  onChange={(event) => setSubmissionSearch(event.target.value)}
                  placeholder="Search students by name or ID..."
                  className="h-9"
                />
                {filteredSubmissionRows.length > 0 ? (
                  <ItemGroup data-size="sm" className="gap-2.5">
                    {filteredSubmissionRows.map((student) => {
                      const submitted = student.status.toLowerCase() === "submitted";
                      const checked = student.status.toLowerCase() === "checked";
                      return (
                        <Item key={student.student_id} variant="outline" size="sm">
                          <ItemMedia>
                            <Avatar>
                              <AvatarImage
                                src={student.avatar_url || undefined}
                                alt={student.full_name}
                              />
                              <AvatarFallback>{initials(student.full_name)}</AvatarFallback>
                            </Avatar>
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{student.full_name}</ItemTitle>
                            <ItemDescription>
                              ID: {student.admission_number || student.roll_number || student.student_id}
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            {(submitted || checked) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void openCheckDialog(student)}
                              >
                                Check
                              </Button>
                            )}
                            {checked && student.obtained_marks !== null && selectedAssignment ? (
                              <Badge variant="secondary">
                                {Number(student.obtained_marks).toFixed(2)} / {Number(selectedAssignment.total_marks).toFixed(2)}
                              </Badge>
                            ) : null}
                            <Badge
                              variant="outline"
                              className={
                                submitted || checked
                                  ? "border-emerald-500/60 text-emerald-600 dark:text-emerald-400"
                                  : "border-destructive/60 text-destructive"
                              }
                            >
                              {checked ? "Checked" : submitted ? "Submitted" : "Remaining"}
                            </Badge>
                          </ItemActions>
                        </Item>
                      );
                    })}
                  </ItemGroup>
                ) : (
                  <div className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                    No students match this search.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No students found for this assignment scope.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={checkOpen} onOpenChange={setCheckOpen}>
        <DialogContent className="grid h-[min(92dvh,900px)] !w-[92vw] !max-w-[1320px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>
              Check {checkTarget?.full_name ?? "submission"}
            </DialogTitle>
            <DialogDescription>
              {checkData
                ? `${checkData.submission.assignment_title} - ${checkedTotal.toFixed(2)} / ${Number(checkData.submission.total_marks).toFixed(2)} marks`
                : "Loading submitted answers..."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto px-6 py-5">
            {checkLoading ? (
              <div className="flex min-h-56 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading answers...
              </div>
            ) : checkData ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {checkData.answers.map((answer) => {
                  const answerId = Number(answer.answer_id);
                  const isCorrect = answerChecks[answerId] === true;
                  const isFalse = answerChecks[answerId] === false;
                  const isSubjective = answer.question_type === "subjective";
                  const isWrongOption =
                    !isSubjective && answer.selected_option_is_correct === false;
                  const options = answer.options ?? [];
                  const files = answer.files ?? [];
                  const correctOption = options.find((option) => option.is_correct);
                  return (
                    <div key={answer.question_id} className="rounded-lg border bg-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">Question {answer.display_order}</Badge>
                            {isSubjective ? (
                              <Badge
                                variant="outline"
                                className="border-amber-500/60 text-amber-400"
                              >
                                Manual review needed
                              </Badge>
                            ) : null}
                            {isWrongOption ? (
                              <Badge
                                variant="outline"
                                className="border-destructive/70 text-destructive"
                              >
                                Wrong option
                              </Badge>
                            ) : null}
                          </div>
                          <h3 className="mt-3 font-semibold">{answer.question_text}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {Number(answer.marks).toFixed(2)} marks
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={isCorrect ? "default" : "outline"}
                            disabled={!answer.answer_id}
                            onClick={() => setAnswerChecks((current) => ({ ...current, [answerId]: true }))}
                          >
                            <CheckCircle2 className="size-4" />
                            Correct
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={isFalse ? "destructive" : "outline"}
                            disabled={!answer.answer_id}
                            onClick={() => setAnswerChecks((current) => ({ ...current, [answerId]: false }))}
                          >
                            <XCircle className="size-4" />
                            False
                          </Button>
                        </div>
                      </div>

                      {files.length ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {files.map((file, index) =>
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
                            )
                          )}
                        </div>
                      ) : null}

                      {!isSubjective && options.length ? (
                        <div className="mt-4 grid gap-2">
                          {options.map((option) => {
                            const selected = option.id === answer.selected_option_id;
                            const correct = option.is_correct;
                            return (
                              <div
                                key={option.id}
                                className={`rounded-md border px-3 py-2 text-sm ${
                                  correct
                                    ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-400"
                                    : selected
                                      ? "border-destructive/70 bg-destructive/10 text-destructive"
                                      : "bg-background"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium">{option.text}</span>
                                  <span className="flex flex-wrap gap-2">
                                    {correct ? (
                                      <Badge
                                        variant="outline"
                                        className="border-emerald-500/60 text-emerald-400"
                                      >
                                        Correct
                                      </Badge>
                                    ) : null}
                                    {selected ? (
                                      <Badge
                                        variant="outline"
                                        className={
                                          correct
                                            ? "border-emerald-500/60 text-emerald-400"
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
                      ) : null}

                      <div className="mt-4 rounded-md border bg-background p-3 text-sm">
                        <p className="text-xs font-medium text-muted-foreground">Student answer</p>
                        {isSubjective ? (
                          <div className="mt-2 space-y-2">
                            <p className="whitespace-pre-wrap">{answer.answer_text || "No answer text"}</p>
                            <p className="text-xs font-medium text-amber-400">
                              Manual review needed
                            </p>
                          </div>
                        ) : (
                          <p
                            className={`mt-2 font-medium ${
                              isWrongOption
                                ? "text-destructive"
                                : answer.selected_option_is_correct === true
                                  ? "text-emerald-500"
                                  : ""
                            }`}
                          >
                            {answer.selected_option_text || "No option selected"}
                            {answer.selected_option_is_correct === true ? (
                              <span className="ml-2">(correct option)</span>
                            ) : null}
                            {isWrongOption ? (
                              <span className="ml-2">(wrong option)</span>
                            ) : null}
                          </p>
                        )}
                        {isWrongOption && correctOption ? (
                          <p className="mt-2 text-xs font-medium text-emerald-400">
                            Correct answer is {correctOption.text}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No submitted answers found.
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCheckOpen(false)}
              disabled={checkSaving}
              className="min-w-32"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void saveChecks()}
              disabled={checkSaving || checkLoading || !checkData}
              className="min-w-40"
            >
              {checkSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Mark as Checked
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

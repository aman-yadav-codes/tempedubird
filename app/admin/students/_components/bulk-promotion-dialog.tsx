"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2, Repeat2 } from "lucide-react";
import { toast } from "sonner";

import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { DatePicker } from "@/components/shared/date-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { readJsonResponse } from "@/lib/api/read-json-response";
import type { Student } from "@/app/admin/students/columns";
import type { StudentFilters } from "./student-filters-drawer";

type PromotionOutcome = "promoted" | "retained" | "failed" | "graduated" | "transferred";

type AcademicYearOption = {
  id: number;
  name: string;
};

type ProgramOption = {
  id: number;
  title: string;
};

type SectionOption = {
  id: number;
  name: string;
};

type ListResponse<T> = {
  data?: T[];
  pageCount?: number;
  error?: string;
};

type ProgramDetailResponse = {
  data?: {
    section_ids?: number[];
    section_names?: string[];
  };
  error?: string;
};

type BulkPromotionResponse = {
  data?: {
    count?: number;
  };
  error?: string;
};

type BulkPromotionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
  institutionId?: number | null;
  filters: StudentFilters;
  selectedStudents: Student[];
  onPromoted: () => void;
};

const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();

const outcomeLabels: Record<PromotionOutcome, string> = {
  promoted: "Promoted",
  retained: "Repeat same class",
  failed: "Failed",
  graduated: "Graduated",
  transferred: "Transferred",
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createsEnrollment(outcome: PromotionOutcome) {
  return outcome === "promoted" || outcome === "retained" || outcome === "failed";
}

export function BulkPromotionDialog({
  open,
  onOpenChange,
  accessToken,
  institutionId,
  filters,
  selectedStudents,
  onPromoted,
}: BulkPromotionDialogProps) {
  const [outcome, setOutcome] = useState<PromotionOutcome>("promoted");
  const [destinationAcademicYearId, setDestinationAcademicYearId] = useState("");
  const [destinationAcademicYearName, setDestinationAcademicYearName] = useState("");
  const [destinationProgramId, setDestinationProgramId] = useState("");
  const [destinationProgramName, setDestinationProgramName] = useState("");
  const [destinationSectionId, setDestinationSectionId] = useState("");
  const [destinationSectionName, setDestinationSectionName] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [admissionDate, setAdmissionDate] = useState(toDateInputValue(TODAY));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const authHeader = useMemo(
    () => accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    [accessToken],
  );
  const sortedStudents = useMemo(
    () => [...selectedStudents].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [selectedStudents],
  );
  const requiresDestination = createsEnrollment(outcome);
  const sourceReady = Boolean(institutionId && filters.programId && filters.academicYearId);
  const canPromote = sourceReady && selectedStudents.length > 0;

  const fetchAcademicYears = useCallback(async (search: string, page: number) => {
    if (!institutionId) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      institutionId: String(institutionId),
      search,
      page: String(page),
      limit: "10",
      activeOnly: "true",
    });
    const res = await fetch(`/api/admin/institutions/academic-years?${params.toString()}`, {
      headers: authHeader,
    });
    const json = await readJsonResponse<ListResponse<AcademicYearOption>>(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to fetch academic years");
    return {
      data: (json.data ?? []) as AcademicYearOption[],
      hasMore: page < (json.pageCount ?? page),
    };
  }, [authHeader, institutionId]);

  const fetchPrograms = useCallback(async (search: string, page: number) => {
    if (!institutionId) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      institutionId: String(institutionId),
      search,
      page: String(page),
      limit: "15",
    });
    const res = await fetch(`/api/admin/institutions/programs?${params.toString()}`, {
      headers: authHeader,
    });
    const json = await readJsonResponse<ListResponse<ProgramOption>>(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to fetch classes");
    return {
      data: (json.data ?? []) as ProgramOption[],
      hasMore: page < (json.pageCount ?? page),
    };
  }, [authHeader, institutionId]);

  const loadSections = useCallback(async (programId: string) => {
    if (!accessToken || !programId) {
      setSections([]);
      return;
    }
    setSectionsLoading(true);
    try {
      const res = await fetch(`/api/admin/institutions/programs/${programId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJsonResponse<ProgramDetailResponse>(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load sections");
      const data = json.data ?? {};
      const nextSections = ((data.section_ids ?? []) as number[]).map((sectionId, index) => ({
        id: sectionId,
        name: data.section_names?.[index] ?? `Section ${sectionId}`,
      }));
      setSections(nextSections);
      setDestinationSectionId((current) =>
        current && nextSections.some((section) => String(section.id) === current) ? current : ""
      );
    } catch (error) {
      setSections([]);
      toast.error(error instanceof Error ? error.message : "Failed to load sections");
    } finally {
      setSectionsLoading(false);
    }
  }, [accessToken]);

  function handleOutcomeChange(value: PromotionOutcome) {
    setOutcome(value);
    if (value === "promoted") {
      setDestinationProgramId("");
      setDestinationProgramName("");
      setDestinationSectionId("");
      setDestinationSectionName("");
      setSections([]);
      return;
    }

    setDestinationProgramId(filters.programId);
    setDestinationProgramName(filters.programLabel);
    setDestinationSectionId(filters.sectionId);
    setDestinationSectionName(filters.sectionLabel);
  }

  async function submitPromotion() {
    if (!accessToken || !institutionId) return;
    if (!filters.programId || !filters.academicYearId) {
      toast.error("Apply class and session filters before batch promotion.");
      return;
    }
    if (requiresDestination && (!destinationAcademicYearId || !destinationProgramId)) {
      toast.error("Select destination session and class.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/students/promotions/bulk", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institutionId,
          studentUserIds: sortedStudents.map((student) => student.id),
          sourceAcademicYearId: Number(filters.academicYearId),
          sourceProgramId: Number(filters.programId),
          sourceSectionId: filters.sectionId ? Number(filters.sectionId) : null,
          outcome,
          destinationAcademicYearId: requiresDestination ? Number(destinationAcademicYearId) : null,
          destinationProgramId: requiresDestination ? Number(destinationProgramId) : null,
          destinationSectionId: requiresDestination && destinationSectionId ? Number(destinationSectionId) : null,
          admissionDate: requiresDestination ? admissionDate : null,
          notes: notes.trim() || null,
        }),
      });
      const json = await readJsonResponse<BulkPromotionResponse>(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to process batch promotion");

      toast.success(`${json.data?.count ?? sortedStudents.length} students processed. Roll numbers assigned alphabetically.`);
      onOpenChange(false);
      onPromoted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process batch promotion");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat2 className="size-5 text-destructive" />
            Batch Promotion
          </DialogTitle>
          <DialogDescription>
            Promote selected students from the filtered class/session. Roll numbers are generated automatically in alphabetical order.
          </DialogDescription>
        </DialogHeader>

        {!canPromote ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Apply class and academic session filters, then select students to batch promote.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-sm font-medium">
                Source: {filters.programLabel || "Selected class"}
                {filters.sectionLabel ? ` - ${filters.sectionLabel}` : ""}
                {filters.academicYearLabel ? ` - ${filters.academicYearLabel}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {sortedStudents.length} selected. Automatic roll order: {sortedStudents.map((student) => student.full_name).join(", ")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Outcome</Label>
                <Select value={outcome} onValueChange={(value) => handleOutcomeChange(value as PromotionOutcome)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(outcomeLabels) as PromotionOutcome[]).map((item) => (
                      <SelectItem key={item} value={item}>{outcomeLabels[item]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {requiresDestination && (
                <>
                  <div className="space-y-1.5">
                    <Label>Destination Session</Label>
                    <AsyncSearchPopover<AcademicYearOption>
                      value={destinationAcademicYearId}
                      selectedLabel={destinationAcademicYearName}
                      onChange={(value) => {
                        setDestinationAcademicYearId(value);
                        if (!value) setDestinationAcademicYearName("");
                      }}
                      onSelectItem={(year) => {
                        setDestinationAcademicYearId(String(year.id));
                        setDestinationAcademicYearName(year.name);
                      }}
                      placeholder="Select destination session"
                      searchPlaceholder="Search sessions..."
                      fetcher={fetchAcademicYears}
                      getValue={(item) => String(item.id)}
                      getLabel={(item) => item.name}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Destination Class</Label>
                    {outcome === "promoted" ? (
                      <AsyncSearchPopover<ProgramOption>
                        value={destinationProgramId}
                        selectedLabel={destinationProgramName}
                        onChange={(value) => {
                          setDestinationProgramId(value);
                          if (!value) {
                            setDestinationProgramName("");
                            setDestinationSectionId("");
                            setDestinationSectionName("");
                            setSections([]);
                          } else {
                            void loadSections(value);
                          }
                        }}
                        onSelectItem={(program) => {
                          setDestinationProgramId(String(program.id));
                          setDestinationProgramName(program.title);
                          setDestinationSectionId("");
                          setDestinationSectionName("");
                          void loadSections(String(program.id));
                        }}
                        placeholder="Select class"
                        searchPlaceholder="Search classes..."
                        fetcher={fetchPrograms}
                        getValue={(item) => String(item.id)}
                        getLabel={(item) => item.title}
                      />
                    ) : (
                      <Button type="button" variant="outline" className="w-full justify-start" disabled>
                        {filters.programLabel || "Source class"}
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Destination Section</Label>
                    {outcome === "promoted" ? (
                      <Select
                        value={destinationSectionId || "none"}
                        onValueChange={(value) => {
                          const nextValue = value === "none" ? "" : value;
                          const section = sections.find((item) => String(item.id) === nextValue);
                          setDestinationSectionId(nextValue);
                          setDestinationSectionName(section?.name ?? "");
                        }}
                        disabled={!destinationProgramId || sectionsLoading || !sections.length}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={sectionsLoading ? "Loading sections..." : "Select section"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No section</SelectItem>
                          {sections.map((section) => (
                            <SelectItem key={section.id} value={String(section.id)}>{section.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button type="button" variant="outline" className="w-full justify-start" disabled>
                        {destinationSectionName || "No section"}
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Effective Date</Label>
                    <DatePicker
                      value={admissionDate}
                      onChange={setAdmissionDate}
                      placeholder="Select date"
                      fromYear={CURRENT_YEAR}
                      toYear={CURRENT_YEAR + 1}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional promotion remarks"
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submitPromotion} disabled={!canPromote || submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Repeat2 className="size-4" />}
            Process Batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

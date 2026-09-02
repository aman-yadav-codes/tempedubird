"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, HelpCircle, Loader2, Plus, Save, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { DatePicker } from "@/components/shared/date-picker";
import { TimePicker } from "@/components/shared/time-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import type { ExamRow } from "@/lib/types/exam";
import type { SyllabusNode } from "@/lib/types/syllabus";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { ContentPricingOption } from "@/components/shared/content-pricing-option";

export type ExamInstitutionOption = { id: number; name: string };
type ExamProgramOption = { id: number; title: string };
type ExamStudentOption = {
  id: number;
  name: string;
  email?: string | null;
  admission_number?: string | null;
};
type SectionOption = { id: number; name: string };
type TargetType = "INSTITUTION" | "PROGRAM" | "SECTION" | "STUDENT";
type WizardTab = "basic" | "syllabus" | "questions" | "targets";
type SubjectOption = {
  id: number;
  name: string;
  label?: string;
  syllabus_available?: boolean;
};
type SyllabusOption = {
  id: number;
  title: string;
  subject_id: number;
  subject_name: string;
  institution_name?: string | null;
  is_template?: boolean;
};
type AiQuestionFormat = {
  enabled: boolean;
  true_false: number;
  objective: number;
  subjective: number;
};
type ClassSyllabusMapping = {
  id: string;
  existingExamId?: number;
  programId: string;
  programName: string;
  subjects: SubjectOption[];
  loadingSubjects: boolean;
  subjectId: string;
  subjectName: string;
  syllabusId: string;
  syllabusName: string;
  syllabusTree: SyllabusNode[];
  selectedNodeIds: number[];
  expandedNodeIds: number[];
  treeLoading: boolean;
  totalMarks: string;
  durationMinutes: string;
  examDate: string;
  examTime: string;
  examPlace: string;
  examMode: string;
  aiQuestionFormat: AiQuestionFormat;
};

const WIZARD_TABS: Array<{
  value: WizardTab;
  label: string;
  icon: typeof ClipboardList;
}> = [
  { value: "basic", label: "Basic Details", icon: ClipboardList },
  { value: "targets", label: "Exam Targets", icon: Target },
  { value: "syllabus", label: "Syllabus Mapping", icon: BookOpen },
  { value: "questions", label: "Questions", icon: HelpCircle },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
  template: ExamRow | null;
  existingSubjects?: ExamRow[];
  existingSubjectsLoading?: boolean;
  seriesId?: number | null;
  seriesTitle?: string | null;
  seriesFromDate?: string | null;
  seriesToDate?: string | null;
  seriesTargetType?: TargetType | null;
  seriesTargetId?: number | null;
  seriesTargetProgramId?: number | null;
  seriesTargetLabel?: string | null;
  seriesResultDate?: string | null;
  seriesInstantResult?: boolean;
  seriesIsPublic?: boolean;
  seriesIsActive?: boolean;
  fetchInstitutions: (
    search: string,
    page: number
  ) => Promise<{ data: ExamInstitutionOption[]; hasMore: boolean }>;
  onSaved: (examId: number) => void;
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

function SyllabusNodePicker({
  nodes,
  selectedIds,
  expandedIds,
  onToggleNode,
  onToggleExpanded,
  depth = 0,
}: {
  nodes: SyllabusNode[];
  selectedIds: number[];
  expandedIds: number[];
  onToggleNode: (node: SyllabusNode) => void;
  onToggleExpanded: (nodeId: number) => void;
  depth?: number;
}) {
  return (
    <div className={depth === 0 ? "space-y-1" : "ml-5 mt-1 space-y-1 border-l pl-3"}>
      {nodes.map((node) => {
        const children = node.children ?? [];
        const expanded = expandedIds.includes(node.id);
        return (
          <div key={node.id}>
            <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-6 shrink-0"
                onClick={() => children.length > 0 && onToggleExpanded(node.id)}
                disabled={children.length === 0}
              >
                {children.length > 0 ? (
                  expanded ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )
                ) : (
                  <span className="size-4" />
                )}
              </Button>
              <Checkbox
                checked={selectedIds.includes(node.id)}
                onCheckedChange={() => onToggleNode(node)}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{node.title}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {node.node_type}
                </p>
              </div>
            </div>
            {children.length > 0 && expanded && (
              <SyllabusNodePicker
                nodes={children}
                selectedIds={selectedIds}
                expandedIds={expandedIds}
                onToggleNode={onToggleNode}
                onToggleExpanded={onToggleExpanded}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function collectSyllabusNodeIds(node: SyllabusNode): number[] {
  return [
    node.id,
    ...(node.children ?? []).flatMap((child) => collectSyllabusNodeIds(child)),
  ];
}

function RequiredLabel({ children }: { children: string }) {
  return (
    <Label>
      {children} <span className="text-destructive">*</span>
    </Label>
  );
}

function SubjectOptionRow({ subject }: { subject: SubjectOption }) {
  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <span className="min-w-0 flex-1 truncate">{subject.label ?? subject.name}</span>
      {subject.syllabus_available && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-emerald-500 md:hidden"
              aria-label="Syllabus available"
              onClick={(event) => event.preventDefault()}
            >
              <CheckCircle2 className="size-4" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">Syllabus available</TooltipContent>
        </Tooltip>
      )}
      <span
        className={
          subject.syllabus_available
            ? "hidden shrink-0 rounded-full border border-emerald-500/60 px-1.5 py-0 text-[10px] leading-4 text-emerald-400 md:inline-flex"
            : "hidden shrink-0 rounded-full border border-amber-500/60 px-1.5 py-0 text-[10px] leading-4 text-amber-300 md:inline-flex"
        }
      >
        {subject.syllabus_available ? "Available" : "Not added"}
      </span>
    </div>
  );
}

function SubjectManagerSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((item) => (
        <div key={item} className="rounded-md border p-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="mt-4 h-28 w-full" />
        </div>
      ))}
    </div>
  );
}

function createClassMapping(): ClassSyllabusMapping {
  return {
    id: crypto.randomUUID(),
    programId: "",
    programName: "",
    subjects: [],
    loadingSubjects: false,
    subjectId: "",
    subjectName: "",
    syllabusId: "",
    syllabusName: "",
    syllabusTree: [],
    selectedNodeIds: [],
    expandedNodeIds: [],
    treeLoading: false,
    totalMarks: "1",
    durationMinutes: "30",
    examDate: "",
    examTime: "",
    examPlace: "",
    examMode: "offline",
    aiQuestionFormat: {
      enabled: false,
      true_false: 1,
      objective: 4,
      subjective: 1,
    },
  };
}

function classNameFromTargetLabel(label?: string | null) {
  if (!label) return "";
  const parts = label.split(">").map((part) => part.trim()).filter(Boolean);
  return parts.at(-1) ?? "";
}

function createClassMappingFromSubject(exam: ExamRow): ClassSyllabusMapping {
  const firstNode = exam.syllabus_nodes?.[0];
  const programId =
    exam.target_type === "PROGRAM"
      ? String(exam.target_id ?? "")
      : String(exam.target_program_id ?? "");
  return {
    ...createClassMapping(),
    id: `existing-${exam.id}`,
    existingExamId: exam.id,
    programId,
    programName: exam.target_program_label ?? classNameFromTargetLabel(exam.target_label),
    subjectId: firstNode?.subject_id ? String(firstNode.subject_id) : "",
    subjectName: firstNode?.subject_name ?? "",
    syllabusId: firstNode?.syllabus_id ? String(firstNode.syllabus_id) : "",
    syllabusName: firstNode?.syllabus_title ?? "",
    selectedNodeIds: exam.syllabus_node_ids ?? [],
    totalMarks: String(exam.total_marks ?? 1),
    durationMinutes: String(exam.duration_minutes ?? 30),
    examDate: String(exam.exam_date ?? "").slice(0, 10),
    examTime: String(exam.exam_time ?? "").slice(0, 5),
    examPlace: exam.exam_place ?? "",
    examMode: exam.exam_mode ?? "offline",
    aiQuestionFormat: {
      enabled: Boolean(exam.ai_question_format?.enabled),
      true_false: Number(exam.ai_question_format?.true_false ?? 1),
      objective: Number(exam.ai_question_format?.objective ?? 4),
      subjective: Number(exam.ai_question_format?.subjective ?? 1),
    },
  };
}

function getClassMappingTitle(mapping: ClassSyllabusMapping, index: number) {
  return [mapping.programName || `Class ${index + 1}`, mapping.subjectName]
    .filter(Boolean)
    .join(" ");
}

export function ExamEditor({
  open,
  onOpenChange,
  accessToken,
  template,
  existingSubjects = [],
  existingSubjectsLoading = false,
  seriesId,
  seriesTitle,
  seriesFromDate,
  seriesToDate,
  seriesTargetType,
  seriesTargetId,
  seriesTargetProgramId,
  seriesTargetLabel,
  seriesResultDate,
  seriesInstantResult,
  seriesIsPublic,
  seriesIsActive,
  fetchInstitutions,
  onSaved,
}: Props) {
  const { activeInstitution } = useActiveInstitution();
  const user = useAuthStore((s) => s.user);
  const isPlatformAdmin = isPlatformAdminUser(user);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalMarks, setTotalMarks] = useState("1");
  const [institutionId, setInstitutionId] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("INSTITUTION");
  const [programId, setProgramId] = useState("");
  const [programName, setProgramName] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [programSubjects, setProgramSubjects] = useState<SubjectOption[]>([]);
  const [programLoading, setProgramLoading] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("");
  const [examPlace, setExamPlace] = useState("");
  const [examMode, setExamMode] = useState("offline");
  const [instantResult, setInstantResult] = useState(true);
  const [resultDate, setResultDate] = useState("");
  const [publicWarningOpen, setPublicWarningOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<number | string>(0);
  const [aiQuestionFormat, setAiQuestionFormat] = useState<AiQuestionFormat>({
    enabled: false,
    true_false: 1,
    objective: 4,
    subjective: 1,
  });
  const [activeTab, setActiveTab] = useState<WizardTab>("basic");
  const [subjectId, setSubjectId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [syllabusId, setSyllabusId] = useState("");
  const [syllabusName, setSyllabusName] = useState("");
  const [syllabusTree, setSyllabusTree] = useState<SyllabusNode[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<number[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [classMappings, setClassMappings] = useState<ClassSyllabusMapping[]>([]);
  const [expandedClassMappingId, setExpandedClassMappingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const useClassMappings = Boolean(seriesId && !template && targetType === "INSTITUTION");
  const visibleTabs = useMemo(() => {
    if (seriesId) {
      return WIZARD_TABS.filter((tab) => tab.value !== "targets").sort((first, second) => {
        const order: Record<WizardTab, number> = {
          syllabus: 0,
          basic: 1,
          questions: 2,
          targets: 3,
        };
        return order[first.value] - order[second.value];
      });
    }
    if (isPlatformAdmin) {
      return WIZARD_TABS.filter((tab) => tab.value !== "targets");
    }
    return WIZARD_TABS;
  }, [isPlatformAdmin, seriesId]);
  const mappingExamDates = useMemo(
    () =>
      classMappings
        .map((mapping, index) =>
          mapping.examDate
            ? { date: mapping.examDate, label: getClassMappingTitle(mapping, index) }
            : null
        )
        .filter(Boolean) as Array<{ date: string; label: string }>,
    [classMappings]
  );
  const subjectCalendarMarkers = {
    markedDates: mappingExamDates,
    rangeStart: seriesFromDate ?? undefined,
    rangeEnd: seriesToDate ?? undefined,
    resultDate: seriesInstantResult ? null : seriesResultDate,
  };

  function getTimeConflicts(mappingId: string, selectedDate: string) {
    if (!selectedDate) return [];
    return classMappings
      .filter(
        (mapping) =>
          mapping.id !== mappingId &&
          mapping.examDate === selectedDate &&
          /^\d{2}:\d{2}$/.test(mapping.examTime)
      )
      .map((mapping, index) => ({
        time: mapping.examTime,
        label: getClassMappingTitle(mapping, index),
      }));
  }

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setTitle(template?.title ?? seriesTitle ?? "");
      setDescription(template?.description ?? "");
      setTotalMarks(String(template?.total_marks ?? 1));
      setInstitutionId(String(template?.source_institution_id ?? activeInstitution?.id ?? ""));
      setInstitutionName(template?.institution_name ?? activeInstitution?.name ?? "");
      setTargetType((template?.target_type as TargetType | null) ?? seriesTargetType ?? "INSTITUTION");
      setProgramId(
        template?.target_type === "PROGRAM"
          ? String(template.target_id ?? "")
          : template?.target_type === "SECTION" || template?.target_type === "STUDENT"
            ? String(template.target_program_id ?? "")
            : seriesTargetType === "PROGRAM"
              ? String(seriesTargetId ?? "")
              : seriesTargetType === "SECTION" || seriesTargetType === "STUDENT"
                ? String(seriesTargetProgramId ?? "")
                : ""
      );
      setProgramName(
        template?.target_type === "PROGRAM"
          ? template.target_label ?? ""
          : template?.target_type === "SECTION" || template?.target_type === "STUDENT"
            ? template.target_program_label ?? ""
            : seriesTargetType === "PROGRAM" || seriesTargetType === "SECTION" || seriesTargetType === "STUDENT"
              ? seriesTargetLabel ?? ""
              : ""
      );
      setSectionId(
        template?.target_type === "SECTION"
          ? String(template.target_id ?? "")
          : seriesTargetType === "SECTION"
            ? String(seriesTargetId ?? "")
            : ""
      );
      setStudentId(
        template?.target_type === "STUDENT"
          ? String(template.target_id ?? "")
          : seriesTargetType === "STUDENT"
            ? String(seriesTargetId ?? "")
            : ""
      );
      setStudentName(template?.target_type === "STUDENT" ? template.target_label ?? "" : "");
      setProgramSubjects([]);
      setDurationMinutes(String(template?.duration_minutes ?? 30));
      setExamDate(String(template?.exam_date ?? "").slice(0, 10));
      setExamTime(String(template?.exam_time ?? "").slice(0, 5));
      setExamPlace(template?.exam_place ?? "");
      setExamMode(template?.exam_mode ?? "offline");
      setInstantResult(template?.instant_result ?? seriesInstantResult ?? true);
      setResultDate(String(template?.result_date ?? seriesResultDate ?? "").slice(0, 10));
      setIsPublic(Boolean(template?.marketplace_requested || template?.is_public || seriesIsPublic));
      setIsActive(template?.is_active ?? seriesIsActive ?? false);
      setIsPaid(Boolean((template as any)?.is_paid || (Number((template as any)?.price) > 0)));
      setPrice(Number((template as any)?.price) || 0);
      setAiQuestionFormat({
        enabled: Boolean(template?.ai_question_format?.enabled),
        true_false: Number(template?.ai_question_format?.true_false ?? 1),
        objective: Number(template?.ai_question_format?.objective ?? 4),
        subjective: Number(template?.ai_question_format?.subjective ?? 1),
      });
      setActiveTab(seriesId ? "syllabus" : "basic");
      const firstNode = template?.syllabus_nodes?.[0];
      setSubjectId(firstNode?.subject_id ? String(firstNode.subject_id) : "");
      setSubjectName(firstNode?.subject_name ?? "");
      setSyllabusId(firstNode?.syllabus_id ? String(firstNode.syllabus_id) : "");
      setSyllabusName(firstNode?.syllabus_title ?? "");
      setSelectedNodeIds(template?.syllabus_node_ids ?? []);
      setExpandedNodeIds([]);
      setSyllabusTree([]);
      const existingMappings =
        !template && seriesId && existingSubjects.length > 0
          ? existingSubjects.map(createClassMappingFromSubject)
          : [];
      const initialMapping = existingMappings[0] ?? createClassMapping();
      setClassMappings(template ? [] : existingMappings.length > 0 ? existingMappings : [initialMapping]);
      setExpandedClassMappingId(template ? null : initialMapping.id);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [
    activeInstitution,
    existingSubjects,
    open,
    seriesId,
    seriesFromDate,
    seriesInstantResult,
    seriesIsActive,
    seriesIsPublic,
    seriesResultDate,
    seriesToDate,
    seriesTargetId,
    seriesTargetLabel,
    seriesTargetProgramId,
    seriesTargetType,
    seriesTitle,
    template,
  ]);

  async function fetchProgramDetailData(id: string) {
    if (!accessToken || !id) {
      return { sections: [] as SectionOption[], subjects: [] as SubjectOption[] };
    }
    if (isPlatformAdmin) {
      const res = await fetch(`/api/admin/content/courses/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load course");
      return {
        sections: [] as SectionOption[],
        subjects: (((json.data?.subjects ?? []) as Array<{ id: number; name?: string }>)).map((s) => ({
          id: s.id,
          name: s.name ?? `Subject ${s.id}`,
          syllabus_available: true,
        })),
      };
    }
    const res = await fetch(`/api/admin/institutions/programs/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to load class");
    return {
      sections: (json.data?.section_ids ?? []).map((value: number, index: number) => ({
          id: value,
          name: json.data?.section_names?.[index] ?? `Section ${value}`,
        })),
      subjects: (json.data?.subject_ids ?? []).map((value: number, index: number) => ({
          id: value,
          name: json.data?.subject_names?.[index] ?? `Subject ${value}`,
          syllabus_available: Boolean(json.data?.subject_syllabus_available?.[index]),
        })),
    };
  }

  async function loadProgramDetail(id: string) {
    if (!accessToken || !id) {
      setSections([]);
      setProgramSubjects([]);
      return;
    }
    setProgramLoading(true);
    try {
      const data = await fetchProgramDetailData(id);
      setSections(data.sections);
      setProgramSubjects(data.subjects);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load class");
    } finally {
      setProgramLoading(false);
    }
  }

  function updateClassMapping(id: string, patch: Partial<ClassSyllabusMapping>) {
    setClassMappings((current) =>
      current.map((mapping) =>
        mapping.id === id ? { ...mapping, ...patch } : mapping
      )
    );
  }

  function resetClassMappings() {
    const mapping = createClassMapping();
    setClassMappings([mapping]);
    setExpandedClassMappingId(mapping.id);
  }

  function addClassMapping() {
    const mapping = createClassMapping();
    setClassMappings((current) => [...current, mapping]);
    setExpandedClassMappingId(null);
    window.requestAnimationFrame(() => {
      setExpandedClassMappingId(mapping.id);
    });
  }

  async function loadMappingProgram(mappingId: string, selectedProgramId: string) {
    updateClassMapping(mappingId, {
      loadingSubjects: true,
      subjects: [],
      subjectId: "",
      subjectName: "",
      syllabusId: "",
      syllabusName: "",
      syllabusTree: [],
      selectedNodeIds: [],
      expandedNodeIds: [],
    });
    try {
      const data = await fetchProgramDetailData(selectedProgramId);
      updateClassMapping(mappingId, {
        subjects: data.subjects,
        loadingSubjects: false,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load class");
      updateClassMapping(mappingId, { loadingSubjects: false });
    }
  }

  useEffect(() => {
    if (!open || !programId) return;
    const timeout = window.setTimeout(() => {
      void loadProgramDetail(programId);
    }, 0);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, programId]);

  async function fetchPrograms(search: string, page: number) {
    if (!accessToken) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      page: String(page),
      limit: "25",
      search,
    });
    if (isPlatformAdmin) {
      const res = await fetch(`/api/admin/content/courses?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load courses/programs");
      return {
        data: ((json.data ?? []) as Array<{ id: number; name?: string; title?: string }>).map((item) => ({
          id: item.id,
          title: item.name || item.title || `Course #${item.id}`,
        })),
        hasMore: page < Number(json.pageCount ?? 0),
      };
    }
    if (institutionId) {
      params.set("institutionId", institutionId);
    }
    const res = await fetch(`/api/admin/institutions/programs?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to load courses/programs");
    return {
      data: (json.data ?? []) as ExamProgramOption[],
      hasMore: page < Number(json.pageCount ?? 0),
    };
  }

  async function fetchStudents(search: string, page: number) {
    if (!accessToken || !institutionId) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      action: "students",
      institutionId,
      programId,
      sectionId,
      page: String(page),
      limit: "15",
      search,
    });
    const res = await fetch(`/api/admin/master-data/exams?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to load students");
    return {
      data: (json.data ?? []) as ExamStudentOption[],
      hasMore: page < Number(json.pageCount ?? 0),
    };
  }

  useEffect(() => {
    if (!open || !accessToken || !syllabusId) {
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setTreeLoading(true);
      fetch(`/api/admin/master-data/syllabi/${syllabusId}/tree`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(readJson)
        .then((json) => {
          if (cancelled) return;
          if (json.error) throw new Error(json.error);
          const tree = (json.data ?? []) as SyllabusNode[];
          setSyllabusTree(tree);
          setExpandedNodeIds((current) =>
            current.length > 0 ? current : tree.map((node) => node.id)
          );
        })
        .catch((error) => {
          if (!cancelled) {
            toast.error(error instanceof Error ? error.message : "Failed to load syllabus tree");
          }
        })
        .finally(() => {
          if (!cancelled) setTreeLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [accessToken, open, syllabusId]);

  function resolveTargetId() {
    if (isPlatformAdmin) return Number(programId || 1);
    if (targetType === "INSTITUTION") return Number(institutionId);
    if (targetType === "PROGRAM") return Number(programId);
    if (targetType === "SECTION") return Number(sectionId);
    return Number(studentId);
  }

  function toggleNode(node: SyllabusNode) {
    const nodeIds = collectSyllabusNodeIds(node);
    const nodeIdSet = new Set(nodeIds);
    setSelectedNodeIds((current) =>
      current.includes(node.id)
        ? current.filter((id) => !nodeIdSet.has(id))
        : Array.from(new Set([...current, ...nodeIds]))
    );
  }

  function toggleExpanded(nodeId: number) {
    setExpandedNodeIds((current) =>
      current.includes(nodeId)
        ? current.filter((id) => id !== nodeId)
        : [...current, nodeId]
    );
  }

  async function fetchSubjectSyllabi(selectedSubjectId: string) {
    if (!accessToken || !selectedSubjectId) return [];
    const params = new URLSearchParams({
      page: "1",
      limit: "15",
      search: "",
      subjectId: selectedSubjectId,
      view: "my",
    });
    if (institutionId) params.set("institutionId", institutionId);
    const res = await fetch(`/api/admin/master-data/syllabi?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to load syllabi");
    return (json.data ?? []) as SyllabusOption[];
  }

  async function loadSyllabusTree(selectedSyllabusId: string) {
    if (!accessToken || !selectedSyllabusId) return [] as SyllabusNode[];
    const res = await fetch(`/api/admin/master-data/syllabi/${selectedSyllabusId}/tree`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await readJson(res);
    if (!res.ok || json.error) {
      throw new Error(json.error ?? "Failed to load syllabus tree");
    }
    return (json.data ?? []) as SyllabusNode[];
  }

  async function autoLoadSingleSubjectSyllabus(selectedSubjectId: string) {
    setTreeLoading(true);
    setSyllabusId("");
    setSyllabusName("");
    setSyllabusTree([]);
    setSelectedNodeIds([]);
    setExpandedNodeIds([]);
    try {
      const syllabi = await fetchSubjectSyllabi(selectedSubjectId);
      const syllabus = syllabi[0];
      if (!syllabus) return;
      const tree = await loadSyllabusTree(String(syllabus.id));
      setSyllabusId(String(syllabus.id));
      setSyllabusName(syllabus.title);
      setSyllabusTree(tree);
      setExpandedNodeIds(tree.map((node) => node.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load syllabus");
    } finally {
      setTreeLoading(false);
    }
  }

  async function autoLoadMappingSubjectSyllabus(mappingId: string, selectedSubjectId: string) {
    updateClassMapping(mappingId, {
      treeLoading: true,
      syllabusId: "",
      syllabusName: "",
      syllabusTree: [],
      selectedNodeIds: [],
      expandedNodeIds: [],
    });
    try {
      const syllabi = await fetchSubjectSyllabi(selectedSubjectId);
      const syllabus = syllabi[0];
      if (!syllabus) {
        updateClassMapping(mappingId, { treeLoading: false });
        return;
      }
      const tree = await loadSyllabusTree(String(syllabus.id));
      updateClassMapping(mappingId, {
        syllabusId: String(syllabus.id),
        syllabusName: syllabus.title,
        syllabusTree: tree,
        expandedNodeIds: tree.map((node) => node.id),
        treeLoading: false,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load syllabus");
      updateClassMapping(mappingId, { treeLoading: false });
    }
  }

  async function hydrateExistingMappings(mappings: ClassSyllabusMapping[]) {
    if (!accessToken) return;
    await Promise.all(
      mappings.map(async (mapping) => {
        const patch: Partial<ClassSyllabusMapping> = {};
        try {
          if (mapping.programId) {
            const data = await fetchProgramDetailData(mapping.programId);
            patch.subjects = data.subjects;
          }
          if (mapping.syllabusId) {
            patch.treeLoading = true;
            updateClassMapping(mapping.id, { treeLoading: true });
            const tree = await loadSyllabusTree(mapping.syllabusId);
            patch.syllabusTree = tree;
            patch.expandedNodeIds = tree.map((node) => node.id);
          }
          patch.treeLoading = false;
          updateClassMapping(mapping.id, patch);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to load saved subject paper");
          updateClassMapping(mapping.id, { treeLoading: false });
        }
      })
    );
  }

  useEffect(() => {
    if (!open || template || !seriesId || existingSubjects.length === 0) return;
    const mappings = existingSubjects.map(createClassMappingFromSubject);
    const timeout = window.setTimeout(() => {
      void hydrateExistingMappings(mappings);
    }, 0);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seriesId, template, existingSubjects, accessToken]);

  function toggleMappingNode(mappingId: string, node: SyllabusNode) {
    const nodeIds = collectSyllabusNodeIds(node);
    const nodeIdSet = new Set(nodeIds);
    setClassMappings((current) =>
      current.map((mapping) =>
        mapping.id === mappingId
          ? {
              ...mapping,
              selectedNodeIds: mapping.selectedNodeIds.includes(node.id)
                ? mapping.selectedNodeIds.filter((id) => !nodeIdSet.has(id))
                : Array.from(new Set([...mapping.selectedNodeIds, ...nodeIds])),
            }
          : mapping
      )
    );
  }

  function toggleMappingExpanded(mappingId: string, nodeId: number) {
    setClassMappings((current) =>
      current.map((mapping) =>
        mapping.id === mappingId
          ? {
              ...mapping,
              expandedNodeIds: mapping.expandedNodeIds.includes(nodeId)
                ? mapping.expandedNodeIds.filter((id) => id !== nodeId)
                : [...mapping.expandedNodeIds, nodeId],
            }
          : mapping
      )
    );
  }

  function validateClassMappings(showToast = true) {
    if (!useClassMappings) {
      if (seriesId) {
        if (!subjectId) {
          if (showToast) toast.error("Select subject");
          return false;
        }
        if (selectedNodeIds.length === 0) {
          if (showToast) toast.error("Select syllabus mapping for this subject");
          return false;
        }
      }
      return true;
    }
    if (classMappings.length === 0) {
      if (showToast) toast.error("Add at least one class");
      return false;
    }
    const seen = new Set<string>();
    for (const [index, mapping] of classMappings.entries()) {
      if (!mapping.programId) {
        if (showToast) toast.error(`Select class for row ${index + 1}`);
        return false;
      }
      if (!mapping.subjectId) {
        if (showToast) toast.error(`Select subject for row ${index + 1}`);
        return false;
      }
      if (!mapping.syllabusId) {
        if (showToast) toast.error(`Select syllabus for row ${index + 1}`);
        return false;
      }
      if (mapping.selectedNodeIds.length === 0) {
        if (showToast) toast.error(`Select syllabus mapping for row ${index + 1}`);
        return false;
      }
      const key = `${mapping.programId}:${mapping.subjectId}`;
      if (seen.has(key)) {
        if (showToast) toast.error("The same class and subject is already added");
        return false;
      }
      seen.add(key);
    }
    return true;
  }

  function validateBasic(showToast = true) {
    if (!seriesId && !title.trim()) {
      if (showToast) toast.error("Exam title is required");
      return false;
    }
    if (useClassMappings) {
      for (const [index, mapping] of classMappings.entries()) {
        const label = mapping.subjectName && mapping.programName
          ? `${mapping.programName} ${mapping.subjectName}`
          : `row ${index + 1}`;
        const marks = Number(mapping.totalMarks);
        if (!Number.isFinite(marks) || marks <= 0) {
          if (showToast) toast.error(`Total marks must be greater than zero for ${label}`);
          return false;
        }
        const duration = Number(mapping.durationMinutes);
        if (!Number.isInteger(duration) || duration <= 0) {
          if (showToast) toast.error(`Duration minutes must be greater than zero for ${label}`);
          return false;
        }
        if (!mapping.examDate) {
          if (showToast) toast.error(`Exam date is required for ${label}`);
          return false;
        }
        if (!mapping.examTime) {
          if (showToast) toast.error(`Exam time is required for ${label}`);
          return false;
        }
        if (!mapping.examPlace.trim()) {
          if (showToast) toast.error(`Exam place is required for ${label}`);
          return false;
        }
      }
      return true;
    }
    const marks = Number(totalMarks);
    if (!Number.isFinite(marks) || marks <= 0) {
      if (showToast) toast.error("Total marks must be greater than zero");
      return false;
    }
    const duration = Number(durationMinutes);
    if (!Number.isInteger(duration) || duration <= 0) {
      if (showToast) toast.error("Duration minutes must be greater than zero");
      return false;
    }
    if (!examDate) {
      if (showToast) toast.error("Exam date is required");
      return false;
    }
    if (!examTime) {
      if (showToast) toast.error("Exam time is required");
      return false;
    }
    if (!examPlace.trim()) {
      if (showToast) toast.error("Exam place is required");
      return false;
    }
    if (!instantResult && !resultDate) {
      if (showToast) toast.error("Result date is required");
      return false;
    }
    if (!instantResult && resultDate < examDate) {
      if (showToast) toast.error("Result date cannot be before the exam date");
      return false;
    }
    return true;
  }

  function validateTargets(showToast = true) {
    if (isPlatformAdmin) {
      if (!programId) {
        if (showToast) toast.error("Course / Program is required");
        return false;
      }
      return true;
    }
    if (!institutionId) {
      if (showToast) toast.error("Institution is required");
      return false;
    }
    if (targetType !== "INSTITUTION" && !programId) {
      if (showToast) toast.error("Class / Program is required");
      return false;
    }
    if ((targetType === "SECTION" || targetType === "STUDENT") && !sectionId) {
      if (showToast) toast.error("Section is required");
      return false;
    }
    if (targetType === "STUDENT" && !studentId) {
      if (showToast) toast.error("Student is required");
      return false;
    }
    return true;
  }

  function validateBeforeTab(tab: WizardTab) {
    const index = visibleTabs.findIndex((item) => item.value === tab);
    if (seriesId) {
      if (index >= 1 && !validateClassMappings()) {
        setActiveTab("syllabus");
        return false;
      }
      if (index >= 2 && !validateBasic()) {
        setActiveTab("basic");
        return false;
      }
      return true;
    }
    if (index >= 1 && !validateBasic()) {
      setActiveTab("basic");
      return false;
    }
    if (index >= 2 && !validateTargets()) {
      setActiveTab(isPlatformAdmin ? "basic" : "targets");
      return false;
    }
    if (index >= 3 && !validateClassMappings()) {
      setActiveTab("syllabus");
      return false;
    }
    return true;
  }

  function updateAiQuestionFormat(key: keyof AiQuestionFormat, value: string) {
    const parsed = Number(value);
    setAiQuestionFormat((current) => ({
      ...current,
      [key]: Number.isInteger(parsed) && parsed >= 0 ? parsed : 0,
    }));
  }

  function updateMappingAiQuestionFormat(
    mappingId: string,
    key: keyof AiQuestionFormat,
    value: string
  ) {
    const parsed = Number(value);
    const nextValue = Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
    setClassMappings((current) =>
      current.map((mapping) =>
        mapping.id === mappingId
          ? {
              ...mapping,
              aiQuestionFormat: {
                ...mapping.aiQuestionFormat,
                [key]: nextValue,
              },
            }
          : mapping
      )
    );
  }

  function validateAiQuestionFormat(
    format: AiQuestionFormat,
    hasSyllabusMapping: boolean,
    instant: boolean,
    label: string,
    showToast = true
  ) {
    if (!format.enabled) return true;
    if (!hasSyllabusMapping) {
      if (showToast) toast.error(`Map syllabus before using AI generation for ${label}`);
      return false;
    }
    if (instant && format.subjective > 0) {
      if (showToast) toast.error(`Subjective AI questions are not allowed with instant result for ${label}`);
      return false;
    }
    const total = format.true_false + format.objective + format.subjective;
    if (total <= 0) {
      if (showToast) toast.error(`Add at least one AI question for ${label}`);
      return false;
    }
    return true;
  }

  function validateQuestionFormat(showToast = true) {
    if (useClassMappings) {
      const instant = seriesInstantResult ?? instantResult;
      for (const [index, mapping] of classMappings.entries()) {
        const label = getClassMappingTitle(mapping, index) || `row ${index + 1}`;
        if (
          !validateAiQuestionFormat(
            mapping.aiQuestionFormat,
            mapping.selectedNodeIds.length > 0,
            instant,
            label,
            showToast
          )
        ) {
          return false;
        }
      }
      return true;
    }
    return validateAiQuestionFormat(
      aiQuestionFormat,
      selectedNodeIds.length > 0,
      seriesId ? (seriesInstantResult ?? instantResult) : instantResult,
      subjectName || title || "this subject paper",
      showToast
    );
  }

  function goToTab(tab: WizardTab) {
    const currentIndex = visibleTabs.findIndex((item) => item.value === activeTab);
    const nextIndex = visibleTabs.findIndex((item) => item.value === tab);
    if (nextIndex <= currentIndex || validateBeforeTab(tab)) {
      setActiveTab(tab);
    }
  }

  function goNext() {
    const currentIndex = visibleTabs.findIndex((item) => item.value === activeTab);
    const next = visibleTabs[currentIndex + 1];
    if (next) goToTab(next.value);
  }

  function goPrevious() {
    const currentIndex = visibleTabs.findIndex((item) => item.value === activeTab);
    const previous = visibleTabs[currentIndex - 1];
    if (previous) setActiveTab(previous.value);
  }

  async function save() {
    if (!accessToken) return;
    if (!validateBasic()) return;
    if (!validateTargets()) return;
    if (!validateClassMappings()) {
      setActiveTab("syllabus");
      return;
    }
    if (!validateQuestionFormat()) {
      setActiveTab("questions");
      return;
    }
    if (seriesId && !useClassMappings && selectedNodeIds.length === 0) {
      setActiveTab("syllabus");
      toast.error("Select syllabus mapping for this subject");
      return;
    }
    setActiveTab("questions");
    const marks = Number(totalMarks);
    if (!resolveTargetId()) return toast.error("Exam target is required");
    setSaving(true);
    try {
      if (useClassMappings) {
        let lastExamId = 0;
        for (const mapping of classMappings) {
          const res = await fetch(
            mapping.existingExamId
              ? `/api/admin/master-data/exams/${mapping.existingExamId}`
              : "/api/admin/master-data/exams",
            {
            method: mapping.existingExamId ? "PATCH" : "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: "",
              description: "",
              exam_series_id: seriesId,
              total_marks: Number(mapping.totalMarks),
              duration_minutes: Number(mapping.durationMinutes),
              exam_date: mapping.examDate,
              exam_time: mapping.examTime,
              exam_place: mapping.examPlace.trim(),
              exam_mode: mapping.examMode,
              instant_result: seriesInstantResult ?? instantResult,
              result_date: (seriesInstantResult ?? instantResult) ? null : (seriesResultDate ?? resultDate),
              source_institution_id: Number(institutionId),
              target_type: "PROGRAM",
              target_id: Number(mapping.programId),
              target_program_id: null,
              syllabus_node_ids: mapping.selectedNodeIds,
              ai_question_format: mapping.aiQuestionFormat,
              is_public: seriesIsPublic ?? isPublic,
              is_active: seriesIsActive ?? isActive,
            }),
            }
          );
          const json = await readJson(res);
          if (!res.ok) {
            throw new Error(json.error ?? `Failed to save ${mapping.programName}`);
          }
          lastExamId = Number(json.data?.id) || mapping.existingExamId || lastExamId;
        }
        toast.success(`${classMappings.length} subject paper${classMappings.length === 1 ? "" : "s"} saved`);
        onOpenChange(false);
        onSaved(lastExamId);
        return;
      }
      const res = await fetch(
        template
          ? `/api/admin/master-data/exams/${template.id}`
          : "/api/admin/master-data/exams",
        {
          method: template ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: seriesId ? "" : title.trim(),
            description: seriesId ? "" : description.trim(),
            exam_series_id: seriesId ?? template?.exam_series_id ?? null,
            total_marks: marks,
            duration_minutes: Number(durationMinutes),
            exam_date: examDate,
            exam_time: examTime,
            exam_place: examPlace.trim(),
            exam_mode: examMode,
            instant_result: seriesId ? (seriesInstantResult ?? instantResult) : instantResult,
            result_date: (seriesId ? (seriesInstantResult ?? instantResult) : instantResult)
              ? null
              : (seriesId ? (seriesResultDate ?? resultDate) : resultDate),
            source_institution_id: Number(institutionId || activeInstitution?.id || 1),
            target_type: isPlatformAdmin ? "PROGRAM" : targetType,
            target_id: resolveTargetId(),
            target_program_id: programId ? Number(programId) : null,
            syllabus_node_ids: selectedNodeIds,
            ai_question_format: aiQuestionFormat,
            is_public: isPlatformAdmin ? true : (seriesId ? (seriesIsPublic ?? isPublic) : isPublic),
            is_active: seriesId ? (seriesIsActive ?? isActive) : isActive,
            is_paid: isPaid,
            price: isPaid ? (Number(price) || 0) : 0,
          }),
        }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to save exam");
      const examId = template?.id ?? Number(json.data?.id);
      toast.success(template ? "Exam updated" : "Exam created");
      onOpenChange(false);
      onSaved(examId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save exam");
    } finally {
      setSaving(false);
    }
  }

  const activeTabIndex = Math.max(
    visibleTabs.findIndex((item) => item.value === activeTab),
    0
  );
  const isQuestionsStep = activeTab === "questions";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            {template ? "Edit Subject Exam" : seriesId ? "Add Subject" : "Add Exam"}
          </DialogTitle>
          <DialogDescription>
            {seriesId
              ? `Create a subject paper inside ${seriesTitle ?? "this exam"}. Questions are managed from its detail sheet.`
              : "Save exam details first. Questions are managed from its detail sheet."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map(({ value, label, icon: Icon }) => (
            <Button
              key={value as string}
              type="button"
              variant={activeTab === value ? "default" : "outline"}
              onClick={() => goToTab(value)}
            >
              <Icon className="size-4" />
              {label}
            </Button>
          ))}
        </div>

        {activeTab === "basic" && (
          <div className="grid gap-4">
            {useClassMappings ? (
              <>
                {existingSubjectsLoading ? (
                  <SubjectManagerSkeleton />
                ) : classMappings.map((mapping, index) => {
                  const isOpen = expandedClassMappingId === mapping.id;
                  const mappingTitle = [
                    mapping.programName || `Class ${index + 1}`,
                    mapping.subjectName,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <Collapsible
                      key={mapping.id}
                      open={isOpen}
                      onOpenChange={(openState) =>
                        setExpandedClassMappingId(openState ? mapping.id : null)
                      }
                      className="overflow-hidden rounded-md border"
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className={`flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 ${isOpen ? "border-b" : ""}`}
                        >
                          <span className="min-w-0 flex-1 truncate font-semibold">
                            Basic details for {mappingTitle}
                          </span>
                          <span className="hidden text-xs text-muted-foreground sm:inline">
                            {mapping.totalMarks || "0"} marks · {mapping.durationMinutes || "0"} min
                          </span>
                          <ChevronDown
                            className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                      </CollapsibleTrigger>
                      <div
                        className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{
                          gridTemplateRows: isOpen ? "1fr" : "0fr",
                          opacity: isOpen ? 1 : 0,
                        }}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <div className="space-y-4 p-4">
                            <p className="text-sm text-muted-foreground">
                              Set schedule and marks for this subject paper.
                            </p>
                            <div className="rounded-md border p-4">
                              <div>
                                <p className="font-semibold">Generate questions via AI</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Optional. Used only when you click Generate via AI after saving this subject paper.
                                </p>
                              </div>
                              <label className="mt-4 flex items-center gap-2 text-sm font-medium">
                                <Checkbox
                                  checked={mapping.aiQuestionFormat.enabled}
                                  onCheckedChange={(value) =>
                                    updateClassMapping(mapping.id, {
                                      aiQuestionFormat: {
                                        ...mapping.aiQuestionFormat,
                                        enabled: Boolean(value),
                                        subjective: (seriesInstantResult ?? instantResult)
                                          ? 0
                                          : mapping.aiQuestionFormat.subjective,
                                      },
                                    })
                                  }
                                />
                                Are you generating questions via AI?
                              </label>
                              {mapping.aiQuestionFormat.enabled && (
                                <>
                                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                    <div className="space-y-2">
                                      <Label>True / False</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={mapping.aiQuestionFormat.true_false}
                                        onChange={(event) =>
                                          updateMappingAiQuestionFormat(mapping.id, "true_false", event.target.value)
                                        }
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>MCQ</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={mapping.aiQuestionFormat.objective}
                                        onChange={(event) =>
                                          updateMappingAiQuestionFormat(mapping.id, "objective", event.target.value)
                                        }
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Subjective</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        disabled={seriesInstantResult ?? instantResult}
                                        value={mapping.aiQuestionFormat.subjective}
                                        onChange={(event) =>
                                          updateMappingAiQuestionFormat(mapping.id, "subjective", event.target.value)
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="mt-4 rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                                    Total AI questions:{" "}
                                    <span className="font-semibold text-foreground">
                                      {mapping.aiQuestionFormat.true_false +
                                        mapping.aiQuestionFormat.objective +
                                        mapping.aiQuestionFormat.subjective}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <RequiredLabel>Total Marks</RequiredLabel>
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={mapping.totalMarks}
                                  onChange={(event) =>
                                    updateClassMapping(mapping.id, { totalMarks: event.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <RequiredLabel>Duration Minutes</RequiredLabel>
                                <Input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={mapping.durationMinutes}
                                  onChange={(event) =>
                                    updateClassMapping(mapping.id, { durationMinutes: event.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <RequiredLabel>Exam Date</RequiredLabel>
                                <DatePicker
                                  value={mapping.examDate}
                                  onChange={(value) =>
                                    updateClassMapping(mapping.id, { examDate: value })
                                  }
                                  placeholder="Select exam date"
                                  markedDates={subjectCalendarMarkers.markedDates}
                                  rangeStart={subjectCalendarMarkers.rangeStart}
                                  rangeEnd={subjectCalendarMarkers.rangeEnd}
                                  resultDate={subjectCalendarMarkers.resultDate}
                                />
                              </div>
                              <div className="space-y-2">
                                <RequiredLabel>Exam Time</RequiredLabel>
                                <TimePicker
                                  value={mapping.examTime}
                                  onChange={(value) =>
                                    updateClassMapping(mapping.id, { examTime: value })
                                  }
                                  placeholder="Select exam time"
                                  conflicts={getTimeConflicts(mapping.id, mapping.examDate)}
                                />
                              </div>
                              <div className="space-y-2">
                                <RequiredLabel>Exam Place</RequiredLabel>
                                <Input
                                  value={mapping.examPlace}
                                  onChange={(event) =>
                                    updateClassMapping(mapping.id, { examPlace: event.target.value })
                                  }
                                  placeholder="Room, hall, campus, or online link"
                                />
                              </div>
                              <div className="space-y-2">
                                <RequiredLabel>Exam Mode</RequiredLabel>
                                <Select
                                  value={mapping.examMode}
                                  onValueChange={(value) =>
                                    updateClassMapping(mapping.id, { examMode: value })
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="offline">Offline</SelectItem>
                                    <SelectItem value="online">Online</SelectItem>
                                    <SelectItem value="hybrid">Hybrid</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Collapsible>
                  );
                })}
              </>
            ) : (
              <>
            {!seriesId && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <RequiredLabel>Class / Program</RequiredLabel>
                    <AsyncSearchPopover<ExamProgramOption>
                      value={programId}
                      selectedLabel={programName}
                      onChange={(value) => {
                        setProgramId(value);
                        setSectionId("");
                        setStudentId("");
                        setStudentName("");
                        setSubjectId("");
                        setSubjectName("");
                        setSyllabusId("");
                        setSyllabusName("");
                        setSyllabusTree([]);
                        setSelectedNodeIds([]);
                        setExpandedNodeIds([]);
                        if (value) void loadProgramDetail(value);
                        else {
                          setSections([]);
                          setProgramSubjects([]);
                          setProgramName("");
                        }
                      }}
                      onSelectItem={(program: any) => {
                        setProgramName(program.title || program.name);
                        if (program.institution_id && !institutionId) {
                          setInstitutionId(String(program.institution_id));
                        }
                        if (!title.trim() || title.endsWith("Exam")) {
                          setTitle(`${program.title || program.name} Exam`);
                        }
                      }}
                      fetcher={fetchPrograms}
                      getValue={(program) => String(program.id)}
                      getLabel={(program) => program.title}
                      placeholder="Select course / program..."
                      searchPlaceholder="Search all courses / programs..."
                      emptyText="No courses/programs found"
                    />
                  </div>

                  <div className="space-y-2">
                    <RequiredLabel>Exam Title</RequiredLabel>
                    <Input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="e.g. Class 10 Science Final Exam"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Optional description or exam guidelines..."
                    className="min-h-24"
                  />
                </div>
              </>
            )}
            {seriesId && (
              <div className="rounded-md border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Exam Structure</p>
                <p className="mt-1 font-semibold">{seriesTitle}</p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <RequiredLabel>Total Marks</RequiredLabel>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={totalMarks}
                  onChange={(event) => setTotalMarks(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <RequiredLabel>Duration Minutes</RequiredLabel>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <RequiredLabel>Exam Date</RequiredLabel>
                <DatePicker
                  value={examDate}
                  onChange={(value) => {
                    setExamDate(value);
                    if (resultDate && value && resultDate < value) setResultDate("");
                  }}
                  placeholder="Select exam date"
                  markedDates={subjectCalendarMarkers.markedDates}
                  rangeStart={subjectCalendarMarkers.rangeStart}
                  rangeEnd={subjectCalendarMarkers.rangeEnd}
                  resultDate={subjectCalendarMarkers.resultDate}
                />
              </div>
              <div className="space-y-2">
                <RequiredLabel>Exam Time</RequiredLabel>
                <TimePicker value={examTime} onChange={setExamTime} placeholder="Select exam time" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <RequiredLabel>Exam Place</RequiredLabel>
                <Input
                  value={examPlace}
                  onChange={(event) => setExamPlace(event.target.value)}
                  placeholder="Room, hall, campus, or online link"
                />
              </div>
              <div className="space-y-2">
                <RequiredLabel>Exam Mode</RequiredLabel>
                <Select value={examMode} onValueChange={setExamMode}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!seriesId && (
              <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-2 pt-8 text-sm">
                <Checkbox
                  checked={instantResult}
                  onCheckedChange={(value) => {
                    const checked = Boolean(value);
                    setInstantResult(checked);
                    if (checked) setResultDate("");
                  }}
                />
                Instant result declare
              </label>
              {!instantResult && (
                <div className="space-y-2">
                  <RequiredLabel>Result Date</RequiredLabel>
                  <DatePicker
                    value={resultDate}
                    onChange={setResultDate}
                    placeholder="Select result date"
                    disabledDates={examDate ? { before: new Date(`${examDate}T00:00:00`) } : undefined}
                  />
                </div>
              )}
              </div>
            )}
            {!seriesId && (
              <>
                <ContentPricingOption
                  isPaid={isPaid}
                  onIsPaidChange={setIsPaid}
                  price={price}
                  onPriceChange={setPrice}
                  label="Exam Access Pricing"
                  description="Choose if students access this exam for Free or if a fee is charged."
                />

                <div className="flex flex-wrap items-center gap-5 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={isPublic}
                  onCheckedChange={(value) => {
                    if (Boolean(value)) setPublicWarningOpen(true);
                    else setIsPublic(false);
                  }}
                />
                Request marketplace review
              </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={isActive} onCheckedChange={(value) => setIsActive(Boolean(value))} />
                    Active
                  </label>
                </div>
              </>
            )}
              </>
            )}
          </div>
        )}

        {activeTab === "syllabus" && (
          useClassMappings ? (
            <div className="grid gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Class Subject Mapping</h3>
                  <p className="text-sm text-muted-foreground">
                    Add each class, then choose its subject and syllabus mapping.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addClassMapping}
                >
                  <Plus className="size-4" />
                  Add
                </Button>
              </div>
              {existingSubjectsLoading ? (
                <SubjectManagerSkeleton />
              ) : classMappings.map((mapping, index) => {
                const isOpen = expandedClassMappingId === mapping.id;
                const mappingTitle = [
                  mapping.programName || `Class ${index + 1}`,
                  mapping.subjectName,
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <Collapsible
                    key={mapping.id}
                    open={isOpen}
                    onOpenChange={(openState) =>
                      setExpandedClassMappingId(openState ? mapping.id : null)
                    }
                    className="overflow-hidden rounded-md border"
                  >
                    <div className={`flex items-center ${isOpen ? "border-b" : ""}`}>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
                        >
                          <span className="min-w-0 flex-1 truncate font-semibold">
                            {mappingTitle}
                          </span>
                          {mapping.selectedNodeIds.length > 0 && (
                            <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                              {mapping.selectedNodeIds.length} selected
                            </span>
                          )}
                          <ChevronDown
                            className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                      </CollapsibleTrigger>
                      {classMappings.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mr-2"
                          onClick={() => {
                            setClassMappings((current) =>
                              current.filter((item) => item.id !== mapping.id)
                            );
                            setExpandedClassMappingId((current) =>
                              current === mapping.id ? null : current
                            );
                          }}
                        >
                          <Trash2 className="size-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <div
                      className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{
                        gridTemplateRows: isOpen ? "1fr" : "0fr",
                        opacity: isOpen ? 1 : 0,
                      }}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="space-y-4 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <RequiredLabel>Class</RequiredLabel>
                      <AsyncSearchPopover<ExamProgramOption>
                        value={mapping.programId}
                        selectedLabel={mapping.programName}
                        onChange={(value) => {
                          updateClassMapping(mapping.id, {
                            programId: value,
                            programName: "",
                            subjects: [],
                            subjectId: "",
                            subjectName: "",
                            syllabusId: "",
                            syllabusName: "",
                            syllabusTree: [],
                            selectedNodeIds: [],
                            expandedNodeIds: [],
                          });
                          if (value) void loadMappingProgram(mapping.id, value);
                        }}
                        onSelectItem={(program) =>
                          updateClassMapping(mapping.id, { programName: program.title })
                        }
                        fetcher={fetchPrograms}
                        getValue={(program) => String(program.id)}
                        getLabel={(program) => program.title}
                        placeholder={institutionId ? "Select class..." : "Select institution first"}
                        searchPlaceholder="Search classes..."
                        emptyText="No classes found"
                        disabled={!institutionId}
                      />
                    </div>
                    <div className="space-y-2">
                      <RequiredLabel>Subject</RequiredLabel>
                      <AsyncSearchPopover<SubjectOption>
                        value={mapping.subjectId}
                        selectedLabel={mapping.subjectName}
                        onChange={(value) => {
                          updateClassMapping(mapping.id, {
                            subjectId: value,
                            subjectName: "",
                            syllabusId: "",
                            syllabusName: "",
                            syllabusTree: [],
                            selectedNodeIds: [],
                            expandedNodeIds: [],
                          });
                          if (value) void autoLoadMappingSubjectSyllabus(mapping.id, value);
                        }}
                        onSelectItem={(subject) =>
                          updateClassMapping(mapping.id, {
                            subjectName: subject.label ?? subject.name,
                          })
                        }
                        items={mapping.subjects}
                        localFilter
                        loading={mapping.loadingSubjects}
                        getValue={(subject) => String(subject.id)}
                        getLabel={(subject) => subject.label ?? subject.name}
                        renderItem={(subject) => <SubjectOptionRow subject={subject} />}
                        placeholder={
                          mapping.loadingSubjects
                            ? "Loading subjects..."
                            : mapping.programId
                              ? "Select subject..."
                              : "Select class first"
                        }
                        searchPlaceholder="Search subjects..."
                        emptyText={
                          mapping.programId
                            ? "No subjects attached to this class"
                            : "Select class first"
                        }
                        disabled={!mapping.programId || mapping.loadingSubjects}
                      />
                    </div>
                  </div>
                  <div className="mt-4 rounded-md border p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">Curriculum Mapping</p>
                        <p className="text-sm text-muted-foreground">
                          {mapping.syllabusName
                            ? `Using ${mapping.syllabusName}. Select one or more syllabus nodes.`
                            : "Select a subject to load syllabus mapping."}
                        </p>
                      </div>
                      <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                        {mapping.selectedNodeIds.length} selected
                      </span>
                    </div>
                    {mapping.treeLoading ? (
                      <div className="flex min-h-28 items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading syllabus tree...
                      </div>
                    ) : mapping.syllabusTree.length > 0 ? (
                      <div className="max-h-56 overflow-y-auto rounded-md border bg-background p-2">
                        <SyllabusNodePicker
                          nodes={mapping.syllabusTree}
                          selectedIds={mapping.selectedNodeIds}
                          expandedIds={mapping.expandedNodeIds}
                          onToggleNode={(node) => toggleMappingNode(mapping.id, node)}
                          onToggleExpanded={(nodeId) =>
                            toggleMappingExpanded(mapping.id, nodeId)
                          }
                        />
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                        {mapping.subjectId
                          ? "No syllabus mapping is available for this subject."
                          : "Select a class and subject to map curriculum nodes."}
                      </div>
                    )}
                  </div>
                        </div>
                      </div>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <AsyncSearchPopover<SubjectOption>
                    value={subjectId}
                    selectedLabel={subjectName}
                    onChange={(value) => {
                      setSubjectId(value);
                      if (!value) setSubjectName("");
                      setSyllabusId("");
                      setSyllabusName("");
                      setSyllabusTree([]);
                      setSelectedNodeIds([]);
                      setExpandedNodeIds([]);
                      if (value) void autoLoadSingleSubjectSyllabus(value);
                    }}
                    onSelectItem={(subject) => setSubjectName(subject.label ?? subject.name)}
                    items={programSubjects}
                    localFilter
                    loading={programLoading}
                    getValue={(subject) => String(subject.id)}
                    getLabel={(subject) => subject.label ?? subject.name}
                    renderItem={(subject) => <SubjectOptionRow subject={subject} />}
                    placeholder={programLoading ? "Loading subjects..." : programId ? "Select subject..." : "Select class first"}
                    searchPlaceholder="Search subjects..."
                    emptyText={programLoading ? "Loading subjects..." : programId ? "No subjects attached to this class" : "Select class first"}
                    disabled={!programId || programLoading}
                  />
                </div>
              </div>
              <div className="rounded-md border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Curriculum Mapping</p>
                    <p className="text-sm text-muted-foreground">
                      {syllabusName
                        ? `Using ${syllabusName}. Select one or more syllabus nodes.`
                        : "Select a subject to load syllabus mapping."}
                    </p>
                  </div>
                  <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                    {selectedNodeIds.length} selected
                  </span>
                </div>
                {treeLoading ? (
                  <div className="flex min-h-32 items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading syllabus tree...
                  </div>
                ) : syllabusTree.length > 0 ? (
                  <div className="max-h-72 overflow-y-auto rounded-md border bg-background p-2">
                    <SyllabusNodePicker
                      nodes={syllabusTree}
                      selectedIds={selectedNodeIds}
                      expandedIds={expandedNodeIds}
                      onToggleNode={toggleNode}
                      onToggleExpanded={toggleExpanded}
                    />
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                    {subjectId
                      ? "No syllabus mapping is available for this subject."
                      : "Select a subject to map curriculum nodes."}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {activeTab === "questions" && (
          <div className="grid gap-4">
            {!useClassMappings && (
              <div className="rounded-md border p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">Generate questions via AI</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Optional. Used only when you click Generate via AI after saving this subject paper.
                    </p>
                  </div>
                </div>
                <label className="mt-4 flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={aiQuestionFormat.enabled}
                    onCheckedChange={(value) =>
                      setAiQuestionFormat((current) => ({
                        ...current,
                        enabled: Boolean(value),
                        subjective: (seriesId ? (seriesInstantResult ?? instantResult) : instantResult)
                          ? 0
                          : current.subjective,
                      }))
                    }
                  />
                  Are you generating questions via AI?
                </label>
                {aiQuestionFormat.enabled && (
                  <>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>True / False</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={aiQuestionFormat.true_false}
                          onChange={(event) =>
                            updateAiQuestionFormat("true_false", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>MCQ</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={aiQuestionFormat.objective}
                          onChange={(event) =>
                            updateAiQuestionFormat("objective", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Subjective</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          disabled={seriesId ? (seriesInstantResult ?? instantResult) : instantResult}
                          value={aiQuestionFormat.subjective}
                          onChange={(event) =>
                            updateAiQuestionFormat("subjective", event.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-4 rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                      Total AI questions:{" "}
                      <span className="font-semibold text-foreground">
                        {aiQuestionFormat.true_false +
                          aiQuestionFormat.objective +
                          aiQuestionFormat.subjective}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="rounded-md border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
              Save the exam first, then open its detail sheet and use Add Questions or Manage Questions.
            </div>
          </div>
        )}

        {activeTab === "targets" && (
          <div className="grid gap-4">
            <div className="space-y-2">
              <RequiredLabel>Target</RequiredLabel>
              <Select
                value={targetType}
                onValueChange={(value) => {
                  setTargetType(value as TargetType);
                  setProgramId("");
                  setProgramName("");
                  setSectionId("");
                  setStudentId("");
                  setStudentName("");
                  setSections([]);
                  setProgramSubjects([]);
                  setSubjectId("");
                  setSubjectName("");
                  setSyllabusId("");
                  setSyllabusName("");
                  setSyllabusTree([]);
                  setSelectedNodeIds([]);
                  setExpandedNodeIds([]);
                  resetClassMappings();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSTITUTION">Whole Institution</SelectItem>
                  <SelectItem value="PROGRAM">Class / Program</SelectItem>
                  <SelectItem value="SECTION">Section</SelectItem>
                  <SelectItem value="STUDENT">Particular Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border bg-muted/20 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <RequiredLabel>Institution</RequiredLabel>
                  <AsyncSearchPopover<ExamInstitutionOption>
                    value={institutionId}
                    selectedLabel={institutionName}
                    onChange={(value) => {
                      setInstitutionId(value);
                      if (!value) setInstitutionName("");
                      setProgramId("");
                      setProgramName("");
                      setSectionId("");
                      setStudentId("");
                      setStudentName("");
                      setSections([]);
                      setProgramSubjects([]);
                      setSubjectId("");
                      setSubjectName("");
                      setSyllabusId("");
                      setSyllabusName("");
                      setSyllabusTree([]);
                      setSelectedNodeIds([]);
                      setExpandedNodeIds([]);
                      resetClassMappings();
                    }}
                    onSelectItem={(institution) => setInstitutionName(institution.name)}
                    fetcher={fetchInstitutions}
                    getValue={(institution) => String(institution.id)}
                    getLabel={(institution) => institution.name}
                    placeholder="Select institution..."
                    searchPlaceholder="Search institutions..."
                    emptyText="No accessible institutions found"
                    disabled={Boolean(template) || Boolean(activeInstitution)}
                  />
                </div>
                {targetType !== "INSTITUTION" && (
                  <div className="space-y-2">
                    <RequiredLabel>Class / Program</RequiredLabel>
                    <AsyncSearchPopover<ExamProgramOption>
                      value={programId}
                      selectedLabel={programName}
                      onChange={(value) => {
                        setProgramId(value);
                        setSectionId("");
                        setStudentId("");
                        setStudentName("");
                        setSubjectId("");
                        setSubjectName("");
                        setSyllabusId("");
                        setSyllabusName("");
                        setSyllabusTree([]);
                        setSelectedNodeIds([]);
                        setExpandedNodeIds([]);
                        if (value) void loadProgramDetail(value);
                        else {
                          setSections([]);
                          setProgramSubjects([]);
                        }
                      }}
                      onSelectItem={(program) => setProgramName(program.title)}
                      fetcher={fetchPrograms}
                      getValue={(program) => String(program.id)}
                      getLabel={(program) => program.title}
                      placeholder={institutionId ? "Select class..." : "Select institution first"}
                      searchPlaceholder="Search classes..."
                      emptyText="No classes found"
                      disabled={!institutionId}
                    />
                  </div>
                )}
                {(targetType === "SECTION" || targetType === "STUDENT") && (
                  <div className="space-y-2">
                    <RequiredLabel>Section</RequiredLabel>
                    <Select
                      value={sectionId}
                      onValueChange={(value) => {
                        setSectionId(value);
                        setStudentId("");
                        setStudentName("");
                      }}
                      disabled={!programId || programLoading || sections.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            programLoading ? "Loading sections..." : "Select section..."
                          }
                        />
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
                )}
                {targetType === "STUDENT" && (
                  <div className="space-y-2">
                    <RequiredLabel>Student</RequiredLabel>
                    <AsyncSearchPopover<ExamStudentOption>
                      value={studentId}
                      selectedLabel={studentName}
                      onChange={(value) => {
                        setStudentId(value);
                        if (!value) setStudentName("");
                      }}
                      onSelectItem={(student) => setStudentName(student.name)}
                      fetcher={fetchStudents}
                      getValue={(student) => String(student.id)}
                      getLabel={(student) => student.name}
                      renderItem={(student) => (
                        <div className="min-w-0">
                          <p className="truncate font-medium">{student.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {student.admission_number || student.email || `ID: ${student.id}`}
                          </p>
                        </div>
                      )}
                      placeholder={
                        sectionId ? "Select student..." : "Select section first"
                      }
                      searchPlaceholder="Search students..."
                      emptyText="No students found"
                      disabled={!institutionId || !programId || !sectionId}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-1 justify-start">
            {activeTabIndex > 0 && (
              <Button type="button" variant="outline" onClick={goPrevious} disabled={saving}>
                Back
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          {isQuestionsStep ? (
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {template ? "Save Changes" : "Create Exam"}
            </Button>
          ) : (
            <Button type="button" onClick={goNext} disabled={saving}>
              Next
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      <AlertDialog open={publicWarningOpen} onOpenChange={setPublicWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Expose this exam in marketplace?</AlertDialogTitle>
            <AlertDialogDescription>
              This can make the{" "}
              <span className="font-semibold text-destructive">
                exam paper and questions visible
              </span>{" "}
              to other institutions after the scheduled exam date and time. Keep it private
              unless this paper is safe to share.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep private</AlertDialogCancel>
            <AlertDialogAction onClick={() => setIsPublic(true)}>
              Request public review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}




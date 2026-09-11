"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  HelpCircle,
  Layers,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { DatePicker } from "@/components/shared/date-picker";
import { TimePicker } from "@/components/shared/time-picker";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAuthStore } from "@/store";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

export type SyllabusNode = {
  id: number;
  title: string;
  node_type?: string;
  subject_id?: number;
  subject_name?: string | null;
  syllabus_id?: number;
  syllabus_title?: string | null;
  children?: SyllabusNode[];
};

export type ExamRow = {
  id: number;
  title?: string | null;
  description?: string | null;
  total_marks?: number | null;
  duration_minutes?: number | null;
  exam_date?: string | null;
  exam_time?: string | null;
  exam_place?: string | null;
  exam_mode?: string | null;
  instant_result?: boolean | null;
  result_date?: string | null;
  target_type?: string | null;
  target_id?: number | null;
  target_label?: string | null;
  target_program_id?: number | null;
  target_program_label?: string | null;
  syllabus_node_ids?: number[];
  syllabus_nodes?: Array<{
    id?: number;
    node_id?: number;
    title: string;
    node_type?: string;
    subject_id?: number;
    subject_name?: string | null;
    syllabus_id?: number;
    syllabus_title?: string | null;
  }>;
  source_institution_id?: number | null;
  institution_name?: string | null;
  exam_series_id?: number | null;
  is_public?: boolean | null;
  is_active?: boolean | null;
  marketplace_requested?: boolean | null;
  ai_question_format?: {
    enabled?: boolean;
    true_false?: number;
    objective?: number;
    subjective?: number;
  } | null;
};

export type TargetType = "INSTITUTION" | "PROGRAM" | "SECTION" | "STUDENT";

export type ExamProgramOption = {
  id: number;
  title: string;
  institution_id?: number | null;
  section_names?: string[];
  section_ids?: number[];
};

export type ProgramBatchOption = {
  id: number;
  section_id?: number;
  batch_name?: string;
  section_name?: string;
  name: string;
  section_ids?: number[];
  sections?: string[];
  enrolled_students_count?: number;
  seats_available?: number;
  max_students?: number;
  start_time?: string | null;
  end_time?: string | null;
  class_frequency?: string | null;
  teaching_method?: string | null;
  module_name?: string | null;
  is_active?: boolean;
};

export type SectionOption = {
  id: number;
  name: string;
};

export type SubjectOption = {
  id: number;
  name: string;
  label?: string;
  syllabus_available?: boolean;
};

export type ExamStudentOption = {
  id: number;
  name: string;
  admission_number?: string;
  email?: string;
};

export type ExamInstitutionOption = {
  id: number;
  name: string;
};

export type SyllabusOption = {
  id: number;
  title: string;
  subject_id: number;
};

export type AiQuestionFormat = {
  enabled: boolean;
  true_false: number;
  objective: number;
  subjective: number;
};

export type ClassSyllabusMapping = {
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
  practiceExamTemplateId?: number;
  practiceExamTitle?: string;
  aiQuestionFormat: AiQuestionFormat;
};

export type WizardTab = "basic" | "targets" | "schedule" | "syllabus";

const WIZARD_TABS: Array<{
  value: WizardTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "basic", label: "Basic Details", icon: ClipboardList },
  { value: "targets", label: "Exam Targets", icon: Target },
  { value: "schedule", label: "Subject Timetable", icon: CalendarDays },
  { value: "syllabus", label: "Syllabus Mapping", icon: BookOpen },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
  template?: ExamRow | null;
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
  seriesInstantResult?: boolean | null;
  seriesIsPublic?: boolean | null;
  seriesIsActive?: boolean | null;
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
    return { error: text };
  }
}

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="flex items-center gap-1">
      <span>{children}</span>
      <span className="text-destructive">*</span>
    </Label>
  );
}

function collectSyllabusNodeIds(node: SyllabusNode): number[] {
  return [node.id, ...(node.children ? node.children.flatMap(collectSyllabusNodeIds) : [])];
}

function SyllabusNodeItem({
  node,
  selectedIds,
  expandedIds,
  onToggleNode,
  onToggleExpanded,
}: {
  node: SyllabusNode;
  selectedIds: number[];
  expandedIds: number[];
  onToggleNode: (node: SyllabusNode) => void;
  onToggleExpanded: (nodeId: number) => void;
}) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isExpanded = expandedIds.includes(node.id);
  const isSelected = selectedIds.includes(node.id);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleExpanded(node.id)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted"
          >
            {isExpanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleNode(node)}
          id={`node-${node.id}`}
        />
        <label
          htmlFor={`node-${node.id}`}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm font-medium"
        >
          <span className="truncate">{node.title}</span>
          {node.node_type && (
            <Badge variant="outline" className="text-[10px] uppercase font-normal">
              {node.node_type}
            </Badge>
          )}
        </label>
      </div>
      {hasChildren && isExpanded && (
        <div className="ml-6 space-y-1 border-l pl-2">
          {node.children!.map((child) => (
            <SyllabusNodeItem
              key={child.id}
              node={child}
              selectedIds={selectedIds}
              expandedIds={expandedIds}
              onToggleNode={onToggleNode}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SyllabusNodePicker({
  nodes,
  selectedIds,
  expandedIds,
  onToggleNode,
  onToggleExpanded,
}: {
  nodes: SyllabusNode[];
  selectedIds: number[];
  expandedIds: number[];
  onToggleNode: (node: SyllabusNode) => void;
  onToggleExpanded: (nodeId: number) => void;
}) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <SyllabusNodeItem
          key={node.id}
          node={node}
          selectedIds={selectedIds}
          expandedIds={expandedIds}
          onToggleNode={onToggleNode}
          onToggleExpanded={onToggleExpanded}
        />
      ))}
    </div>
  );
}

function SubjectOptionRow({ subject }: { subject: SubjectOption }) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
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

function createClassMapping(defaultDate = "", defaultTime = "09:00", defaultPlace = "School", defaultMode = "offline"): ClassSyllabusMapping {
  const isOnline = defaultMode === "online";
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
    totalMarks: "100",
    durationMinutes: "60",
    examDate: defaultDate,
    examTime: defaultTime,
    examPlace: isOnline ? "Online" : (defaultPlace || "School"),
    examMode: defaultMode,
    aiQuestionFormat: {
      enabled: false,
      true_false: 2,
      objective: 8,
      subjective: 2,
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
  const mode = exam.exam_mode ?? "offline";
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
    totalMarks: String(exam.total_marks ?? 100),
    durationMinutes: String(exam.duration_minutes ?? 60),
    examDate: String(exam.exam_date ?? "").slice(0, 10),
    examTime: String(exam.exam_time ?? "").slice(0, 5) || "09:00",
    examPlace: exam.exam_place ?? (mode === "online" ? "Online" : "School"),
    examMode: mode,
    aiQuestionFormat: {
      enabled: Boolean(exam.ai_question_format?.enabled),
      true_false: Number(exam.ai_question_format?.true_false ?? 2),
      objective: Number(exam.ai_question_format?.objective ?? 8),
      subjective: Number(exam.ai_question_format?.subjective ?? 2),
    },
  };
}

function getClassMappingTitle(mapping: ClassSyllabusMapping, index: number) {
  return [mapping.programName || `Subject ${index + 1}`, mapping.subjectName]
    .filter(Boolean)
    .join(" - ") || `Subject paper ${index + 1}`;
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
  const [institutionId, setInstitutionId] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("PROGRAM");
  const [programId, setProgramId] = useState("");
  const [programName, setProgramName] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [batches, setBatches] = useState<ProgramBatchOption[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [programSubjects, setProgramSubjects] = useState<SubjectOption[]>([]);
  const [programLoading, setProgramLoading] = useState(false);

  const [examPlace, setExamPlace] = useState("School");
  const [examRoom, setExamRoom] = useState("");
  const [examMode, setExamMode] = useState("offline");
  const [instantResult, setInstantResult] = useState(true);
  const [resultDate, setResultDate] = useState("");
  const [publicWarningOpen, setPublicWarningOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<number | string>(0);

  const [activeTab, setActiveTab] = useState<WizardTab>("basic");
  const [classMappings, setClassMappings] = useState<ClassSyllabusMapping[]>([]);
  const [expandedClassMappingId, setExpandedClassMappingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const visibleTabs = useMemo(() => {
    if (seriesId || isPlatformAdmin) {
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
      setInstitutionId(String(template?.source_institution_id ?? activeInstitution?.id ?? ""));
      setInstitutionName(template?.institution_name ?? activeInstitution?.name ?? "");
      setTargetType(
        ((template?.target_type as TargetType | null) ?? seriesTargetType ?? "PROGRAM") === "INSTITUTION"
          ? "PROGRAM"
          : ((template?.target_type as TargetType | null) ?? seriesTargetType ?? "PROGRAM")
      );
      
      const resolvedProgramId =
        template?.target_type === "PROGRAM"
          ? String(template.target_id ?? "")
          : template?.target_type === "SECTION" || template?.target_type === "STUDENT"
            ? String(template.target_program_id ?? "")
            : seriesTargetType === "PROGRAM"
              ? String(seriesTargetId ?? "")
              : seriesTargetType === "SECTION" || seriesTargetType === "STUDENT"
                ? String(seriesTargetProgramId ?? "")
                : "";

      const resolvedProgramName =
        template?.target_type === "PROGRAM"
          ? template.target_label ?? ""
          : template?.target_type === "SECTION" || template?.target_type === "STUDENT"
            ? template.target_program_label ?? ""
            : seriesTargetType === "PROGRAM" || seriesTargetType === "SECTION" || seriesTargetType === "STUDENT"
              ? seriesTargetLabel ?? ""
              : "";

      setProgramId(resolvedProgramId);
      setProgramName(resolvedProgramName);
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
      setBatches([]);
      const initialMode = template?.exam_mode ?? "offline";
      const rawPlace = template?.exam_place ?? (initialMode === "online" ? "Online" : "School");
      let parsedPlace = rawPlace;
      let parsedRoom = "";
      if (rawPlace.includes(" - ")) {
        const parts = rawPlace.split(" - ");
        parsedPlace = parts[0] || "School";
        parsedRoom = parts.slice(1).join(" - ");
      } else if (rawPlace.includes(" (") && rawPlace.endsWith(")")) {
        const match = rawPlace.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
          parsedPlace = match[1] || "School";
          parsedRoom = match[2] || "";
        }
      }
      setExamPlace(parsedPlace);
      setExamRoom(parsedRoom);
      setExamMode(initialMode);
      setInstantResult(template?.instant_result ?? seriesInstantResult ?? true);
      setResultDate(String(template?.result_date ?? seriesResultDate ?? "").slice(0, 10));
      setIsPublic(Boolean(template?.marketplace_requested || template?.is_public || seriesIsPublic));
      setIsActive(template?.is_active ?? seriesIsActive ?? false);
      setIsPaid(Boolean((template as any)?.is_paid || Number((template as any)?.price) > 0));
      setPrice(Number((template as any)?.price) || 0);

      setActiveTab("basic");

      let initialMappings: ClassSyllabusMapping[] = [];
      if (template) {
        initialMappings = [createClassMappingFromSubject(template)];
      } else if (existingSubjects && existingSubjects.length > 0) {
        initialMappings = existingSubjects.map(createClassMappingFromSubject);
      } else {
        const defaultMap = createClassMapping(
          seriesFromDate ?? "",
          "09:00",
          rawPlace,
          initialMode
        );
        defaultMap.programId = resolvedProgramId;
        defaultMap.programName = resolvedProgramName;
        initialMappings = [defaultMap];
      }

      setClassMappings(initialMappings);
      setExpandedClassMappingId(initialMappings[0]?.id ?? null);

      if (resolvedProgramId) {
        void loadProgramDetail(resolvedProgramId);
      }
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
      setBatches([]);
      setProgramSubjects([]);
      return;
    }
    setProgramLoading(true);
    setBatchesLoading(true);
    try {
      const data = await fetchProgramDetailData(id);
      setSections(data.sections);
      setProgramSubjects(data.subjects);

      setClassMappings((current) =>
        current.map((mapping) => ({
          ...mapping,
          programId: mapping.programId || id,
          programName: mapping.programName || programName,
          subjects: data.subjects,
        }))
      );

      if (!isPlatformAdmin) {
        try {
          const batchRes = await fetch(`/api/admin/institutions/programs/${id}/batches`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (batchRes.ok) {
            const batchJson = await readJson(batchRes);
            const rawBatches = (batchJson.data as ProgramBatchOption[]) || [];
            setBatches(rawBatches);
          } else {
            setBatches([]);
          }
        } catch {
          setBatches([]);
        }
      } else {
        setBatches([]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load class");
    } finally {
      setProgramLoading(false);
      setBatchesLoading(false);
    }
  }

  function updateClassMapping(id: string, patch: Partial<ClassSyllabusMapping>) {
    setClassMappings((current) =>
      current.map((mapping) =>
        mapping.id === id ? { ...mapping, ...patch } : mapping
      )
    );
  }

  function addClassMapping() {
    const isOnline = examMode === "online";
    const mapping = createClassMapping(
      seriesFromDate ?? "",
      "09:00",
      isOnline ? "Online" : (examPlace || "School"),
      examMode
    );
    mapping.programId = programId;
    mapping.programName = programName;
    mapping.subjects = programSubjects;
    setClassMappings((current) => [...current, mapping]);
    setExpandedClassMappingId(mapping.id);
  }

  function autoFillAllSubjects() {
    if (programSubjects.length === 0) {
      toast.error("No subjects found for this class / program");
      return;
    }

    const isOnline = examMode === "online";
    const newMappings: ClassSyllabusMapping[] = programSubjects.map((sub) => {
      const map = createClassMapping(
        seriesFromDate ?? "",
        "09:00",
        isOnline ? "Online" : (examPlace || "School"),
        examMode
      );
      map.programId = programId;
      map.programName = programName;
      map.subjects = programSubjects;
      map.subjectId = String(sub.id);
      map.subjectName = sub.name;
      return map;
    });

    setClassMappings(newMappings);
    setExpandedClassMappingId(newMappings[0]?.id ?? null);
    toast.success(`Loaded ${newMappings.length} subjects into timetable!`);

    newMappings.forEach((map) => {
      if (map.subjectId) {
        void autoLoadMappingSubjectSyllabus(map.id, map.subjectId);
      }
    });
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

  async function fetchPracticeExams(search: string, page: number, subjectId?: string) {
    if (!accessToken) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      page: String(page),
      limit: "25",
      search,
      view: "my",
    });
    if (institutionId) params.set("institutionId", institutionId);
    if (subjectId) params.set("subjectId", subjectId);
    const res = await fetch(`/api/admin/master-data/practice-exams?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await readJson(res);
    if (!res.ok) return { data: [], hasMore: false };
    return {
      data: ((json.data ?? []) as Array<any>).map((item) => ({
        id: item.id,
        title: item.title,
        total_marks: item.total_marks,
        duration_minutes: item.duration_minutes,
        question_count: item.question_count,
        subject_id: item.subject_id,
        subject_name: item.subject_name,
      })),
      hasMore: page < Number(json.pageCount ?? 0),
    };
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
        selectedNodeIds: tree.map((node) => node.id),
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

  function validateBasic(showToast = true) {
    if (!seriesId && !title.trim()) {
      if (showToast) toast.error("Exam title is required");
      return false;
    }
    if (!programId) {
      if (showToast) toast.error("Class / Program is required");
      return false;
    }
    if (!instantResult && !resultDate) {
      if (showToast) toast.error("Result date is required");
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

  function validateSchedule(showToast = true) {
    if (classMappings.length === 0) {
      if (showToast) toast.error("Add at least one subject to the exam timetable");
      return false;
    }
    const seenSubjects = new Set<string>();
    for (const [index, mapping] of classMappings.entries()) {
      const label = mapping.subjectName || `Subject #${index + 1}`;
      if (!mapping.subjectId && !mapping.subjectName) {
        if (showToast) toast.error(`Select subject for row ${index + 1}`);
        return false;
      }
      if (mapping.subjectId) {
        if (seenSubjects.has(mapping.subjectId)) {
          if (showToast) toast.error(`Duplicate subject "${mapping.subjectName}" scheduled in timetable`);
          return false;
        }
        seenSubjects.add(mapping.subjectId);
      }
      if (!mapping.examDate) {
        if (showToast) toast.error(`Select exam date for ${label}`);
        return false;
      }
      if (!mapping.examTime) {
        if (showToast) toast.error(`Select exam start time for ${label}`);
        return false;
      }
      const duration = Number(mapping.durationMinutes);
      if (!Number.isInteger(duration) || duration <= 0) {
        if (showToast) toast.error(`Duration minutes must be positive for ${label}`);
        return false;
      }
      const marks = Number(mapping.totalMarks);
      if (!Number.isFinite(marks) || marks <= 0) {
        if (showToast) toast.error(`Total marks must be greater than zero for ${label}`);
        return false;
      }
    }
    return true;
  }

  function validateClassMappings(showToast = true) {
    for (const [index, mapping] of classMappings.entries()) {
      const label = mapping.subjectName || `Subject #${index + 1}`;
      if (mapping.syllabusTree.length > 0 && mapping.selectedNodeIds.length === 0) {
        if (showToast) toast.error(`Select at least one syllabus topic for ${label}`);
        return false;
      }
    }
    return true;
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

  function validateBeforeTab(tab: WizardTab) {
    const targetIndex = visibleTabs.findIndex((item) => item.value === tab);
    
    // Check Basic Details
    if (targetIndex >= 1 && !validateBasic()) {
      setActiveTab("basic");
      return false;
    }
    // Check Targets
    const targetsIndex = visibleTabs.findIndex((item) => item.value === "targets");
    if (targetsIndex !== -1 && targetIndex > targetsIndex && !validateTargets()) {
      setActiveTab("targets");
      return false;
    }
    // Check Schedule
    const scheduleIndex = visibleTabs.findIndex((item) => item.value === "schedule");
    if (scheduleIndex !== -1 && targetIndex > scheduleIndex && !validateSchedule()) {
      setActiveTab("schedule");
      return false;
    }
    // Check Syllabus
    const syllabusIndex = visibleTabs.findIndex((item) => item.value === "syllabus");
    if (syllabusIndex !== -1 && targetIndex > syllabusIndex && !validateClassMappings()) {
      setActiveTab("syllabus");
      return false;
    }
    return true;
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

  function resolveTargetId(mapping?: ClassSyllabusMapping) {
    if (isPlatformAdmin) return Number(mapping?.programId || programId || 1);
    if (targetType === "INSTITUTION") return Number(institutionId);
    if (targetType === "PROGRAM") return Number(mapping?.programId || programId);
    if (targetType === "SECTION") return Number(sectionId);
    return Number(studentId);
  }

  async function save() {
    if (!accessToken) return;
    if (!validateBasic()) {
      setActiveTab("basic");
      return;
    }
    if (!validateTargets()) {
      setActiveTab(isPlatformAdmin ? "basic" : "targets");
      return;
    }
    if (!validateSchedule()) {
      setActiveTab("schedule");
      return;
    }
    if (!validateClassMappings()) {
      setActiveTab("syllabus");
      return;
    }

    setSaving(true);
    try {
      let lastExamId = 0;
      let effectiveSeriesId = seriesId ?? template?.exam_series_id ?? null;

      if (!effectiveSeriesId && !isPlatformAdmin) {
        const dates = classMappings.map((m) => m.examDate).filter(Boolean).sort();
        const today = new Date().toISOString().slice(0, 10);
        const fromDate = dates[0] || today;
        const toDate = dates[dates.length - 1] || fromDate;

        const seriesRes = await fetch("/api/admin/master-data/exams", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            record_type: "series",
            title: title.trim(),
            description: description.trim() || null,
            from_date: fromDate,
            to_date: toDate,
            source_institution_id: Number(institutionId || activeInstitution?.id || 1),
            target_type: targetType,
            target_id: resolveTargetId(),
            target_program_id: programId ? Number(programId) : null,
            instant_result: instantResult,
            result_date: instantResult ? null : resultDate,
            is_public: isPublic,
            is_active: isActive,
          }),
        });

        const seriesJson = await readJson(seriesRes);
        if (!seriesRes.ok) {
          throw new Error(seriesJson.error ?? "Failed to create exam structure");
        }
        effectiveSeriesId = Number(seriesJson.data?.id) || null;
      }

      for (const mapping of classMappings) {
        const examTitle = effectiveSeriesId
          ? ""
          : classMappings.length === 1
            ? title.trim()
            : `${title.trim()} - ${mapping.subjectName || "Subject"}`;

        const resolvedMode = mapping.examMode || examMode || "offline";
        const combinedPlace = examRoom.trim()
          ? `${examPlace.trim() || "School"} - ${examRoom.trim()}`
          : (examPlace.trim() || "School");
        const resolvedPlace = resolvedMode === "online"
          ? "Online"
          : (mapping.examPlace.trim() || combinedPlace);

        const res = await fetch(
          mapping.existingExamId || template?.id
            ? `/api/admin/master-data/exams/${mapping.existingExamId || template?.id}`
            : "/api/admin/master-data/exams",
          {
            method: mapping.existingExamId || template?.id ? "PATCH" : "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: examTitle,
              description: description.trim(),
              exam_series_id: effectiveSeriesId,
              total_marks: Number(mapping.totalMarks) || 100,
              duration_minutes: Number(mapping.durationMinutes) || 60,
              exam_date: mapping.examDate,
              exam_time: mapping.examTime,
              exam_place: resolvedPlace,
              exam_mode: resolvedMode,
              instant_result: seriesInstantResult ?? instantResult,
              result_date: (seriesInstantResult ?? instantResult) ? null : (seriesResultDate ?? resultDate),
              source_institution_id: Number(institutionId || activeInstitution?.id || 1),
              target_type: isPlatformAdmin ? "PROGRAM" : targetType,
              target_id: resolveTargetId(mapping),
              target_program_id: mapping.programId ? Number(mapping.programId) : programId ? Number(programId) : null,
              syllabus_node_ids: mapping.selectedNodeIds,
              ai_question_format: mapping.aiQuestionFormat,
              practice_exam_template_id: mapping.practiceExamTemplateId ?? null,
              is_public: isPlatformAdmin ? true : (seriesId ? (seriesIsPublic ?? isPublic) : isPublic),
              is_active: seriesId ? (seriesIsActive ?? isActive) : isActive,
              is_paid: isPaid,
              price: isPaid ? Number(price) || 0 : 0,
            }),
          }
        );

        const json = await readJson(res);
        if (!res.ok) {
          throw new Error(json.error ?? `Failed to save ${mapping.subjectName || "exam"}`);
        }
        lastExamId = Number(json.data?.id) || mapping.existingExamId || template?.id || lastExamId;
      }

      toast.success(
        classMappings.length > 1
          ? `Exam timetable created with ${classMappings.length} subject papers!`
          : template
            ? "Exam updated successfully!"
            : "Exam created successfully!"
      );

      onOpenChange(false);
      onSaved(lastExamId);
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
  const isLastStep = activeTabIndex === visibleTabs.length - 1;

  const totalTimetableMarks = useMemo(() => {
    return classMappings.reduce((sum, m) => sum + (Number(m.totalMarks) || 0), 0);
  }, [classMappings]);

  const totalTimetableDuration = useMemo(() => {
    return classMappings.reduce((sum, m) => sum + (Number(m.durationMinutes) || 0), 0);
  }, [classMappings]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            {template ? "Edit Exam Timetable" : seriesId ? "Add Subject Paper" : "Create Exam Timetable"}
          </DialogTitle>
          <DialogDescription>
            {seriesId
              ? `Schedule subject paper in ${seriesTitle ?? "this exam series"}.`
              : "Set up exam details, subject schedules, timings, marks, and syllabus mapping."}
          </DialogDescription>
        </DialogHeader>

        {/* Wizard Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b pb-3">
          {visibleTabs.map(({ value, label, icon: Icon }) => (
            <Button
              key={value as string}
              type="button"
              variant={activeTab === value ? "default" : "outline"}
              size="sm"
              onClick={() => goToTab(value)}
              className="gap-2"
            >
              <Icon className="size-4" />
              {label}
            </Button>
          ))}
        </div>

        {/* TAB 1: BASIC DETAILS */}
        {activeTab === "basic" && (
          <div className="grid gap-4 py-1">
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
                    if (value) void loadProgramDetail(value);
                    else {
                      setSections([]);
                      setBatches([]);
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
                  placeholder="e.g. Mid-Term Examination 2026"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional exam guidelines, instructions, or notes for students..."
                className="min-h-20"
              />
            </div>

            {/* Exam Mode First */}
            <div className="space-y-2">
              <RequiredLabel>Exam Mode</RequiredLabel>
              <Select
                value={examMode}
                onValueChange={(value) => {
                  setExamMode(value);
                  const combined = examRoom.trim()
                    ? `${examPlace.trim() || "School"} - ${examRoom.trim()}`
                    : (examPlace.trim() || "School");
                  const newPlace = value === "online" ? "Online" : combined;
                  setExamPlace(value === "online" ? "Online" : (examPlace === "Online" || !examPlace ? "School" : examPlace));
                  setClassMappings((curr) =>
                    curr.map((m) => ({
                      ...m,
                      examMode: value,
                      examPlace: newPlace,
                    }))
                  );
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">Offline (In-Person)</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* If Offline Mode: Ask for Place and Class Room */}
            {examMode === "offline" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Exam Place / Venue</Label>
                  <Input
                    value={examPlace === "Online" ? "School" : examPlace}
                    onChange={(event) => {
                      const val = event.target.value;
                      setExamPlace(val);
                      const combined = examRoom.trim() ? `${val.trim()} - ${examRoom.trim()}` : val;
                      setClassMappings((curr) =>
                        curr.map((m) => ({
                          ...m,
                          examPlace: combined || "School",
                        }))
                      );
                    }}
                    placeholder="e.g. School, Main Campus, Exam Hall"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Class Room / Room No</Label>
                  <Input
                    value={examRoom}
                    onChange={(event) => {
                      const val = event.target.value;
                      setExamRoom(val);
                      const basePlace = (examPlace === "Online" || !examPlace) ? "School" : examPlace.trim();
                      const combined = val.trim() ? `${basePlace} - ${val.trim()}` : basePlace;
                      setClassMappings((curr) =>
                        curr.map((m) => ({
                          ...m,
                          examPlace: combined,
                        }))
                      );
                    }}
                    placeholder="e.g. Room 101, Hall A, Lab 2"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                <CheckCircle2 className="size-4 text-primary shrink-0" />
                <span>Remote Online Exam — Students will take exams remotely via their portal. No physical place or class room required.</span>
              </div>
            )}

            {!seriesId && (
              <div className="rounded-md border bg-muted/20 p-4">
                <div className="grid gap-4 sm:grid-cols-2 items-center">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <Checkbox
                      checked={instantResult}
                      onCheckedChange={(value) => {
                        const checked = Boolean(value);
                        setInstantResult(checked);
                        if (checked) setResultDate("");
                      }}
                    />
                    <span>Instant Result Declaration</span>
                  </label>
                  {!instantResult && (
                    <div className="space-y-2">
                      <RequiredLabel>Result Publish Date</RequiredLabel>
                      <DatePicker
                        value={resultDate}
                        onChange={setResultDate}
                        placeholder="Select result date"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXAM TARGETS */}
        {activeTab === "targets" && (
          <div className="grid gap-4 py-1">
            <div className="space-y-2">
              <RequiredLabel>Target Audience</RequiredLabel>
              <Select
                value={targetType}
                onValueChange={(value) => {
                  setTargetType(value as TargetType);
                  setSectionId("");
                  setStudentId("");
                  setStudentName("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROGRAM">Batch Wise</SelectItem>
                  <SelectItem value="SECTION">Specific Section</SelectItem>
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

                <div className="space-y-2">
                  <RequiredLabel>Class / Program</RequiredLabel>
                  <Input value={programName || "Select class in Basic Details"} disabled />
                </div>

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
                      disabled={!programId || programLoading || (sections.length === 0 && batches.length === 0)}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            programLoading ? "Loading sections..." : "Select section / batch..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.length > 0
                          ? batches.map((batch) => (
                              <SelectItem key={batch.id || batch.section_id} value={String(batch.section_id || batch.id)}>
                                {batch.batch_name || batch.name} {batch.section_name ? `(${batch.section_name})` : ""}
                              </SelectItem>
                            ))
                          : sections.map((section) => (
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

              {/* Available Batches Display */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Users className="size-3.5 text-primary" />
                    Available Batches ({batches.length})
                  </Label>
                  {batchesLoading && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      Loading batches...
                    </span>
                  )}
                </div>

                {batchesLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Skeleton className="h-16 w-full rounded-md" />
                    <Skeleton className="h-16 w-full rounded-md" />
                  </div>
                ) : batches.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {batches.map((batch) => {
                      const isSelected =
                        targetType === "SECTION" &&
                        String(batch.section_id || batch.id) === sectionId;
                      return (
                        <div
                          key={batch.id || batch.section_id}
                          onClick={() => {
                            if (targetType === "SECTION") {
                              setSectionId(String(batch.section_id || batch.id));
                            }
                          }}
                          className={`rounded-lg border p-3 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "bg-background/80 hover:border-border hover:bg-muted/30"
                          } ${targetType === "SECTION" ? "cursor-pointer" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                                {batch.batch_name || batch.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {batch.section_name ? `Section: ${batch.section_name}` : "All Sections"}
                              </p>
                            </div>
                            {batch.enrolled_students_count !== undefined && (
                              <Badge variant="secondary" className="shrink-0 text-[11px] font-normal">
                                {batch.enrolled_students_count} {batch.enrolled_students_count === 1 ? "student" : "students"}
                              </Badge>
                            )}
                          </div>
                          {(batch.start_time || batch.teaching_method) && (
                            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t text-[11px] text-muted-foreground">
                              {batch.start_time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {batch.start_time} {batch.end_time ? `- ${batch.end_time}` : ""}
                                </span>
                              )}
                              {batch.teaching_method && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                                  {batch.teaching_method}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                    {programId ? (
                      sections.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <span>Available Sections:</span>
                          {sections.map((s) => (
                            <Badge key={s.id} variant="outline" className="text-xs">
                              {s.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        "No specific batches configured for this class. All students in the class will be targeted."
                      )
                    ) : (
                      "Select a class in Basic Details to view its available batches."
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SUBJECT TIMETABLE (NEW TAB) */}
        {activeTab === "schedule" && (
          <div className="grid gap-4 py-1">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  Subject Exam Timetable
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select subjects, exam date, start time, duration, and total marks for each paper.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {programSubjects.length > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={autoFillAllSubjects}
                    className="gap-1.5"
                  >
                    <Sparkles className="size-3.5 text-primary" />
                    Auto-Fill Class Subjects ({programSubjects.length})
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addClassMapping}
                  className="gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Add Subject
                </Button>
              </div>
            </div>

            {/* List of Timetable Rows */}
            <div className="space-y-3">
              {classMappings.map((mapping, index) => {
                const isOpen = expandedClassMappingId === mapping.id;
                const mappingTitle = mapping.subjectName || `Subject paper #${index + 1}`;

                return (
                  <Collapsible
                    key={mapping.id}
                    open={isOpen}
                    onOpenChange={(openState) =>
                      setExpandedClassMappingId(openState ? mapping.id : null)
                    }
                    className="overflow-hidden rounded-lg border transition-all hover:border-primary/40"
                  >
                    {/* Collapsible Header */}
                    <div className="flex items-center justify-between gap-3 bg-muted/20 px-4 py-3">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-sm">
                              {mappingTitle}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {mapping.examDate ? `${mapping.examDate} at ${mapping.examTime || "09:00"}` : "Date not set"} · {mapping.durationMinutes || "60"} mins · {mapping.totalMarks || "100"} marks
                            </p>
                          </div>
                          <ChevronDown
                            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                      </CollapsibleTrigger>
                      {classMappings.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            setClassMappings((curr) => curr.filter((item) => item.id !== mapping.id));
                            setExpandedClassMappingId((curr) => (curr === mapping.id ? null : curr));
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>

                    {/* Collapsible Body Form */}
                    <CollapsibleContent>
                      <div className="space-y-4 border-t p-4 bg-background">
                        <div className="grid gap-4 sm:grid-cols-2">
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
                              items={programSubjects.length > 0 ? programSubjects : mapping.subjects}
                              localFilter
                              loading={mapping.loadingSubjects || programLoading}
                              getValue={(subject) => String(subject.id)}
                              getLabel={(subject) => subject.label ?? subject.name}
                              renderItem={(subject) => <SubjectOptionRow subject={subject} />}
                              placeholder={
                                mapping.loadingSubjects || programLoading
                                  ? "Loading subjects..."
                                  : programId
                                    ? "Select subject..."
                                    : "Select class in Basic Details first"
                              }
                              searchPlaceholder="Search subjects..."
                              emptyText={
                                programId
                                  ? "No subjects attached to this class"
                                  : "Select class first"
                              }
                              disabled={!programId}
                            />
                          </div>

                          <div className="space-y-2">
                            <RequiredLabel>Exam Date</RequiredLabel>
                            <DatePicker
                              value={mapping.examDate}
                              onChange={(value) => updateClassMapping(mapping.id, { examDate: value })}
                              placeholder="Select exam date"
                              markedDates={subjectCalendarMarkers.markedDates}
                              rangeStart={subjectCalendarMarkers.rangeStart}
                              rangeEnd={subjectCalendarMarkers.rangeEnd}
                              resultDate={subjectCalendarMarkers.resultDate}
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-2">
                            <RequiredLabel>Start Time</RequiredLabel>
                            <TimePicker
                              value={mapping.examTime}
                              onChange={(value) => updateClassMapping(mapping.id, { examTime: value })}
                              placeholder="Select start time"
                              conflicts={getTimeConflicts(mapping.id, mapping.examDate)}
                            />
                          </div>

                          <div className="space-y-2">
                            <RequiredLabel>Duration (Minutes)</RequiredLabel>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={mapping.durationMinutes}
                              onChange={(event) =>
                                updateClassMapping(mapping.id, { durationMinutes: event.target.value })
                              }
                              placeholder="e.g. 60"
                            />
                          </div>

                          <div className="space-y-2">
                            <RequiredLabel>Total Marks</RequiredLabel>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={mapping.totalMarks}
                              onChange={(event) =>
                                updateClassMapping(mapping.id, { totalMarks: event.target.value })
                              }
                              placeholder="e.g. 100"
                            />
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>

            {/* Timetable Summary Footer */}
            {classMappings.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>
                    Total Subjects: <strong className="text-foreground">{classMappings.length}</strong>
                  </span>
                  <span>
                    Combined Marks: <strong className="text-foreground">{totalTimetableMarks}</strong>
                  </span>
                  <span>
                    Total Duration: <strong className="text-foreground">{totalTimetableDuration} mins</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-primary">
                  <CheckCircle2 className="size-4" />
                  <span>Timetable ready for syllabus mapping</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SYLLABUS MAPPING */}
        {activeTab === "syllabus" && (
          <div className="grid gap-4 py-1">
            <div>
              <h3 className="font-semibold text-base">Curriculum & Syllabus Mapping</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Map syllabus chapters and topics covered in each subject exam paper.
              </p>
            </div>

            {classMappings.map((mapping, index) => {
              const mappingTitle = mapping.subjectName || `Subject paper #${index + 1}`;
              const isOnline = mapping.examMode === "online" || examMode === "online";

              return (
                <div key={mapping.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b pb-2">
                    <div>
                      <p className="font-semibold text-sm">{mappingTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {mapping.syllabusName
                          ? `Syllabus: ${mapping.syllabusName}`
                          : mapping.subjectId
                            ? "Fetching available syllabus..."
                            : "Select subject in Timetable tab"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isOnline ? "default" : "secondary"} className="text-xs uppercase">
                        {isOnline ? "Online Exam" : "Offline Exam"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {mapping.selectedNodeIds.length} topics mapped
                      </Badge>
                    </div>
                  </div>

                  {isOnline ? (
                    /* 2-Column Split: Half side for Syllabus, Half side for Practice Exam Map */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      {/* Left Column: Syllabus Coverage Tree */}
                      <div className="rounded-md border p-3.5 bg-background space-y-2.5 flex flex-col justify-between min-h-[220px]">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <BookOpen className="size-4 text-primary" />
                              <span className="text-sm font-semibold">Syllabus Curriculum</span>
                            </div>
                            <Badge variant="outline" className="text-[11px] font-normal">
                              {mapping.selectedNodeIds.length} Selected
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Select chapters and topics covered in this online exam paper.
                          </p>
                        </div>

                        {mapping.treeLoading ? (
                          <div className="flex min-h-36 items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="size-4 animate-spin text-primary" />
                            Loading syllabus curriculum tree...
                          </div>
                        ) : mapping.syllabusTree.length > 0 ? (
                          <div className="max-h-60 overflow-y-auto rounded-md border bg-muted/10 p-2">
                            <SyllabusNodePicker
                              nodes={mapping.syllabusTree}
                              selectedIds={mapping.selectedNodeIds}
                              expandedIds={mapping.expandedNodeIds}
                              onToggleNode={(node) => toggleMappingNode(mapping.id, node)}
                              onToggleExpanded={(nodeId) => toggleMappingExpanded(mapping.id, nodeId)}
                            />
                          </div>
                        ) : (
                          <div className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
                            {mapping.subjectId
                              ? "No pre-configured syllabus tree found for this subject. All topics will be included."
                              : "Select subject in Subject Timetable tab first."}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Practice Exam Mapping */}
                      <div className="rounded-md border p-3.5 bg-muted/15 space-y-2.5 flex flex-col justify-between min-h-[220px]">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <FileText className="size-4 text-primary" />
                              <span className="text-sm font-semibold">Map from Practice Exam Records</span>
                            </div>
                            {mapping.practiceExamTemplateId && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  updateClassMapping(mapping.id, {
                                    practiceExamTemplateId: undefined,
                                    practiceExamTitle: undefined,
                                  });
                                }}
                              >
                                Unlink
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Select an existing online practice exam from your records to import its questions into this paper.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <AsyncSearchPopover
                            value={mapping.practiceExamTemplateId ? String(mapping.practiceExamTemplateId) : ""}
                            selectedLabel={mapping.practiceExamTitle}
                            onChange={(value) => {
                              if (!value) {
                                updateClassMapping(mapping.id, {
                                  practiceExamTemplateId: undefined,
                                  practiceExamTitle: undefined,
                                });
                              }
                            }}
                            onSelectItem={(practiceExam: any) => {
                              updateClassMapping(mapping.id, {
                                practiceExamTemplateId: practiceExam.id,
                                practiceExamTitle: practiceExam.title,
                                totalMarks: practiceExam.total_marks ? String(practiceExam.total_marks) : mapping.totalMarks,
                                durationMinutes: practiceExam.duration_minutes ? String(practiceExam.duration_minutes) : mapping.durationMinutes,
                              });
                              toast.success(`Mapped question paper from "${practiceExam.title}"`);
                            }}
                            fetcher={(search, page) => fetchPracticeExams(search, page, mapping.subjectId)}
                            getValue={(item: any) => String(item.id)}
                            getLabel={(item: any) => item.title}
                            renderItem={(item: any) => (
                              <div className="min-w-0">
                                <p className="truncate font-medium">{item.title}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {item.total_marks ?? 0} marks · {item.duration_minutes ?? 0} mins
                                </p>
                              </div>
                            )}
                            placeholder="Select matching practice exam (optional)..."
                            searchPlaceholder="Search practice exams by name..."
                            emptyText="No matching practice exams found"
                            disabled={!institutionId}
                          />
                          {mapping.practiceExamTemplateId ? (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="size-3.5 shrink-0" />
                              <span>Question paper from "{mapping.practiceExamTitle}" will be copied into this online exam.</span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground italic">
                              Leave empty to configure manual questions in the next Questions tab.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Offline Mode: Full Width Syllabus Tree */
                    <div className="space-y-2">
                      {mapping.treeLoading ? (
                        <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="size-4 animate-spin text-primary" />
                          Loading syllabus curriculum tree...
                        </div>
                      ) : mapping.syllabusTree.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto rounded-md border bg-background p-2">
                          <SyllabusNodePicker
                            nodes={mapping.syllabusTree}
                            selectedIds={mapping.selectedNodeIds}
                            expandedIds={mapping.expandedNodeIds}
                            onToggleNode={(node) => toggleMappingNode(mapping.id, node)}
                            onToggleExpanded={(nodeId) => toggleMappingExpanded(mapping.id, nodeId)}
                          />
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                          {mapping.subjectId
                            ? "No pre-configured syllabus tree found for this subject. All topics will be included."
                            : "Select subject in Subject Timetable tab first."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* DIALOG FOOTER */}
        <DialogFooter className="gap-2 sm:justify-between border-t pt-3">
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
          {isLastStep ? (
            <Button type="button" onClick={() => void save()} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {template ? "Save Changes" : `Create Exam Timetable (${classMappings.length})`}
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
              This will make the exam paper visible to other institutions after the scheduled exam date.
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

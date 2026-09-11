"use client";

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import {
  BookOpen,
  CalendarIcon,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  HelpCircle,
  Loader2,
  Save,
  Target,
  Layers,
  FileText,
  CheckCircle2,
  BookMarked,
  Sparkles,
  Check,
  AlertCircle,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import type { AssignmentTemplateRow } from "@/lib/types/assignment-template";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { ContentPricingOption } from "@/components/shared/content-pricing-option";
import { generateDefaultSyllabusForSubject } from "@/lib/utils/syllabus-generator";

export type AssignmentInstitutionOption = { id: number; name: string };
type AssignmentProgramOption = { id: number; title: string; name?: string };
type AssignmentStudentOption = {
  id: number;
  name: string;
  email?: string | null;
  admission_number?: string | null;
};
type SectionOption = { id: number; name: string };
type TargetType = "PROGRAM" | "SECTION" | "STUDENT";
type WizardTab = "basic" | "syllabus" | "targets" | "questions";

type SubjectOption = {
  id: string | number;
  name: string;
  code?: string;
  term_name?: string;
  term_number?: number;
};

export interface LessonNode {
  id: string;
  lesson_number?: string | number;
  title: string;
  description?: string;
  duration_mins?: number | string;
}

export interface ChapterNode {
  id: string;
  chapter_number?: string | number;
  title: string;
  description?: string;
  lessons: LessonNode[];
}

export interface UnitNode {
  id: string;
  unit_number?: string | number;
  title: string;
  description?: string;
  chapters: ChapterNode[];
}

export interface SubjectSyllabusData {
  id?: number;
  course_id: number;
  subject_id: string;
  subject_name: string;
  subject_code?: string | null;
  units: UnitNode[];
}

type AiQuestionFormat = {
  enabled: boolean;
  true_false: number;
  single_choice?: number;
  multiple_choice: number;
  short_text?: number;
  long_text?: number;
  objective?: number;
  subjective?: number;
};

const WIZARD_TABS: Array<{
  value: WizardTab;
  label: string;
  icon: typeof ClipboardList;
}> = [
  { value: "basic", label: "Basic Details", icon: ClipboardList },
  { value: "syllabus", label: "Syllabus", icon: BookOpen },
  { value: "questions", label: "Questions", icon: HelpCircle },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
  template: AssignmentTemplateRow | null;
  fetchInstitutions: (
    search: string,
    page: number
  ) => Promise<{ data: AssignmentInstitutionOption[]; hasMore: boolean }>;
  onSaved: (assignmentId: number) => void;
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

function dateFromString(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const parts = value.split("-").map(Number);
  if (parts.length === 3 && parts.every((p) => !isNaN(p))) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="flex items-center gap-1 font-medium">
      {children}
      <span className="text-destructive">*</span>
    </Label>
  );
}

function DatePickerField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const selected = dateFromString(value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="size-4 mr-2" />
          {selected ? format(selected, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => date && onChange(format(date, "yyyy-MM-dd"))}
        />
      </PopoverContent>
    </Popover>
  );
}

export function AssignmentTemplateEditor({
  open,
  onOpenChange,
  accessToken,
  template,
  fetchInstitutions,
  onSaved,
}: Props) {
  const { activeInstitution } = useActiveInstitution();
  const user = useAuthStore((s) => s.user);
  const isPlatformAdmin = isPlatformAdminUser(user);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalMarks, setTotalMarks] = useState("20");
  const [institutionId, setInstitutionId] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("PROGRAM");
  const [programId, setProgramId] = useState("");
  const [programName, setProgramName] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [programSubjects, setProgramSubjects] = useState<SubjectOption[]>([]);
  const [programLoading, setProgramLoading] = useState(false);

  // Subject selection (strictly 1 subject per assignment)
  const [subjectId, setSubjectId] = useState("");
  const [subjectName, setSubjectName] = useState("");

  // Syllabus hierarchy & selection
  const [syllabusUnits, setSyllabusUnits] = useState<UnitNode[]>([]);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [expandedUnitIds, setExpandedUnitIds] = useState<string[]>([]);
  const [expandedChapterIds, setExpandedChapterIds] = useState<string[]>([]);

  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submissionDate, setSubmissionDate] = useState(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [isPublic, setIsPublic] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<number | string>(0);
  const [aiQuestionFormat, setAiQuestionFormat] = useState<AiQuestionFormat>({
    enabled: false,
    true_false: 1,
    single_choice: 2,
    multiple_choice: 2,
    short_text: 1,
    long_text: 1,
  });

  const [activeTab, setActiveTab] = useState<WizardTab>("basic");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(template?.title ?? "");
    setDescription(template?.description ?? "");
    setTotalMarks(String(template?.total_marks ?? 20));
    setInstitutionId(String(template?.source_institution_id ?? activeInstitution?.id ?? ""));
    setInstitutionName(template?.institution_name ?? activeInstitution?.name ?? "");
    setTargetType(
      template?.target_type && template.target_type !== "INSTITUTION"
        ? (template.target_type as TargetType)
        : "PROGRAM"
    );
    const pId =
      template?.target_type === "PROGRAM"
        ? String(template.target_id ?? "")
        : template?.target_type === "SECTION" || template?.target_type === "STUDENT"
          ? String(template.target_program_id ?? "")
          : "";
    setProgramId(pId);
    setProgramName(
      template?.target_type === "PROGRAM"
        ? template.target_label ?? ""
        : template?.target_type === "SECTION" || template?.target_type === "STUDENT"
          ? template.target_program_label ?? ""
          : ""
    );
    setSectionId(template?.target_type === "SECTION" ? String(template.target_id ?? "") : "");
    setStudentId(template?.target_type === "STUDENT" ? String(template.target_id ?? "") : "");
    setStudentName(template?.target_type === "STUDENT" ? template.target_label ?? "" : "");
    setProgramSubjects([]);

    // Initialize subject
    setSubjectId(template?.subject_id ?? "");
    setSubjectName(template?.subject_name ?? "");

    // Initialize syllabus
    const initialSyllabusData = template?.syllabus_data ?? [];
    if (Array.isArray(initialSyllabusData) && initialSyllabusData.length > 0) {
      const ids: string[] = [];
      initialSyllabusData.forEach((u: any) => {
        if (u.id) ids.push(String(u.id));
        (u.chapters ?? []).forEach((c: any) => {
          if (c.id) ids.push(String(c.id));
          (c.lessons ?? []).forEach((l: any) => {
            if (l.id) ids.push(String(l.id));
          });
        });
      });
      setSelectedItemIds(ids);
    } else {
      setSelectedItemIds([]);
    }

    setIssueDate(template?.issue_date ? String(template.issue_date).slice(0, 10) : new Date().toISOString().slice(0, 10));
    setSubmissionDate(template?.submission_date ? String(template.submission_date).slice(0, 10) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setIsPublic(Boolean(template?.marketplace_requested || template?.is_public));
    setIsActive(template?.is_active ?? true);
    setIsPaid(Boolean((template as any)?.is_paid || Number((template as any)?.price) > 0));
    setPrice(Number((template as any)?.price) || 0);
    setAiQuestionFormat({
      enabled: Boolean(template?.ai_question_format?.enabled),
      true_false: Number(template?.ai_question_format?.true_false ?? 1),
      single_choice: Number((template?.ai_question_format as any)?.single_choice ?? 2),
      multiple_choice: Number(template?.ai_question_format?.objective ?? 2),
      short_text: Number((template?.ai_question_format as any)?.short_text ?? 1),
      long_text: Number(template?.ai_question_format?.subjective ?? 1),
    });

    setActiveTab("basic");

    let cancelled = false;
    if (pId) {
      void loadProgramDetail(pId, template?.subject_id ?? "", () => cancelled);
    }

    return () => {
      cancelled = true;
    };
  }, [activeInstitution, open, template]);

  async function loadProgramDetail(id: string, initialSubId?: string, isCancelled?: () => boolean) {
    if (!accessToken || !id) {
      if (!isCancelled?.()) {
        setSections([]);
        setProgramSubjects([]);
      }
      return;
    }
    setProgramLoading(true);
    try {
      if (isPlatformAdmin) {
        const res = await fetch(`/api/admin/content/courses/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await readJson(res);
        if (isCancelled?.()) return;
        if (!res.ok) throw new Error(json.error ?? "Failed to load course");
        setSections([]);
        const subs: SubjectOption[] = ((json.data?.subjects ?? []) as Array<any>).map((s) => ({
          id: String(s.id),
          name: s.name ?? `Subject ${s.id}`,
          code: s.code,
          term_name: s.term_name,
          term_number: s.term_number,
        }));
        setProgramSubjects(subs);
        if (initialSubId && subs.some((s) => String(s.id) === String(initialSubId))) {
          const match = subs.find((s) => String(s.id) === String(initialSubId));
          setSubjectId(String(match?.id));
          setSubjectName(match?.name ?? "");
        } else if (subs.length === 1 && !initialSubId) {
          setSubjectId(String(subs[0].id));
          setSubjectName(subs[0].name);
        }
        return;
      }

      const res = await fetch(`/api/admin/institutions/programs/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJson(res);
      if (isCancelled?.()) return;
      if (!res.ok) throw new Error(json.error ?? "Failed to load program");
      setSections(
        (json.data?.section_ids ?? []).map((val: number, idx: number) => ({
          id: val,
          name: json.data?.section_names?.[idx] ?? `Section ${val}`,
        }))
      );
      const subs: SubjectOption[] = (json.data?.subject_ids ?? []).map((val: number, idx: number) => ({
        id: String(val),
        name: json.data?.subject_names?.[idx] ?? `Subject ${val}`,
      }));
      setProgramSubjects(subs);
      if (initialSubId && subs.some((s) => String(s.id) === String(initialSubId))) {
        const match = subs.find((s) => String(s.id) === String(initialSubId));
        setSubjectId(String(match?.id));
        setSubjectName(match?.name ?? "");
      } else if (subs.length === 1 && !initialSubId) {
        setSubjectId(String(subs[0].id));
        setSubjectName(subs[0].name);
      }
    } catch (err: any) {
      if (!isCancelled?.()) {
        toast.error(err.message ?? "Failed to load subjects");
      }
    } finally {
      if (!isCancelled?.()) {
        setProgramLoading(false);
      }
    }
  }

  // Load syllabus for chosen course + subject
  useEffect(() => {
    if (!open || !accessToken || !programId || !subjectId) {
      setSyllabusUnits([]);
      return;
    }

    let cancelled = false;
    setLoadingSyllabus(true);

    const queryParams = new URLSearchParams({
      subjectId: String(subjectId),
      subjectName: subjectName || "",
    });

    fetch(`/api/admin/content/courses/${programId}/syllabus?${queryParams.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(readJson)
      .then((json) => {
        if (cancelled) return;
        const syllabiList: SubjectSyllabusData[] = Array.isArray(json.data) ? json.data : [];
        // Match by subject_id or normalized subject_name or partial name match or single entry
        const normSubjName = (subjectName || "").trim().toLowerCase();
        const matched =
          syllabiList.find((s) => String(s.subject_id) === String(subjectId)) ||
          syllabiList.find(
            (s) =>
              s.subject_name &&
              normSubjName &&
              s.subject_name.trim().toLowerCase() === normSubjName
          ) ||
          syllabiList.find(
            (s) =>
              s.subject_name &&
              normSubjName &&
              (s.subject_name.trim().toLowerCase().includes(normSubjName) ||
                normSubjName.includes(s.subject_name.trim().toLowerCase()))
          ) ||
          (syllabiList.length === 1 && Array.isArray(syllabiList[0].units) && syllabiList[0].units.length > 0
            ? syllabiList[0]
            : undefined);

        let unitsToDisplay: UnitNode[] = [];
        if (matched && Array.isArray(matched.units) && matched.units.length > 0) {
          unitsToDisplay = matched.units;
        } else {
          unitsToDisplay = generateDefaultSyllabusForSubject(subjectId, subjectName || "Subject");
        }

        setSyllabusUnits(unitsToDisplay);
        // Expand all units and chapters by default for easy viewing
        setExpandedUnitIds(unitsToDisplay.map((u) => u.id));
        const chIds: string[] = [];
        unitsToDisplay.forEach((u) => (u.chapters ?? []).forEach((c) => chIds.push(c.id)));
        setExpandedChapterIds(chIds);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Error fetching syllabus:", err);
          const fallbackUnits = generateDefaultSyllabusForSubject(subjectId, subjectName || "Subject");
          setSyllabusUnits(fallbackUnits);
          setExpandedUnitIds(fallbackUnits.map((u) => u.id));
          const chIds: string[] = [];
          fallbackUnits.forEach((u) => (u.chapters ?? []).forEach((c) => chIds.push(c.id)));
          setExpandedChapterIds(chIds);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSyllabus(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, accessToken, programId, subjectId, subjectName]);

  async function fetchPrograms(search: string, page: number) {
    if (!accessToken) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      search,
      page: String(page),
      limit: "15",
    });
    if (!isPlatformAdmin && institutionId) {
      params.set("institutionId", institutionId);
    }
    const endpoint = isPlatformAdmin
      ? `/api/admin/content/courses?${params.toString()}`
      : `/api/admin/institutions/programs?${params.toString()}`;

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to fetch courses");
    const data = (json.data ?? []).map((item: any) => ({
      ...item,
      title: item.title ?? item.name,
    }));
    return { data, hasMore: page < (json.pageCount ?? 1) };
  }

  async function fetchStudents(search: string, page: number) {
    if (!accessToken || isPlatformAdmin) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      action: "students",
      search,
      page: String(page),
      limit: "15",
      institutionId,
      programId,
    });
    if (sectionId) params.set("sectionId", sectionId);
    const res = await fetch(`/api/admin/master-data/assignments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to fetch students");
    const data = (json.data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name ?? row.full_name,
      email: row.email,
      admission_number: row.admission_number,
    }));
    return { data, hasMore: page < (json.pageCount ?? 1) };
  }

  function handleSelectSubject(id: string) {
    setSubjectId(id);
    const found = programSubjects.find((s) => String(s.id) === String(id));
    setSubjectName(found?.name ?? "");
    setSelectedItemIds([]);
  }

  // Helper toggle functions for Syllabus items
  function toggleUnit(unit: UnitNode) {
    const unitId = unit.id;
    const allChildIds: string[] = [unitId];
    (unit.chapters ?? []).forEach((c) => {
      allChildIds.push(c.id);
      (c.lessons ?? []).forEach((l) => allChildIds.push(l.id));
    });

    const isUnitSelected = selectedItemIds.includes(unitId);
    if (isUnitSelected) {
      setSelectedItemIds((prev) => prev.filter((id) => !allChildIds.includes(id)));
    } else {
      setSelectedItemIds((prev) => Array.from(new Set([...prev, ...allChildIds])));
    }
  }

  function toggleChapter(unit: UnitNode, chapter: ChapterNode) {
    const chapterId = chapter.id;
    const allChildIds: string[] = [chapterId];
    (chapter.lessons ?? []).forEach((l) => allChildIds.push(l.id));

    const isChapterSelected = selectedItemIds.includes(chapterId);
    if (isChapterSelected) {
      setSelectedItemIds((prev) => {
        const next = prev.filter((id) => !allChildIds.includes(id));
        // If unselecting chapter, also unselect parent unit
        return next.filter((id) => id !== unit.id);
      });
    } else {
      setSelectedItemIds((prev) => {
        const next = Array.from(new Set([...prev, ...allChildIds]));
        // If all chapters in this unit are selected, auto-select unit
        const allChaptersSelected = (unit.chapters ?? []).every(
          (c) => c.id === chapterId || next.includes(c.id)
        );
        if (allChaptersSelected) next.push(unit.id);
        return next;
      });
    }
  }

  function toggleLesson(unit: UnitNode, chapter: ChapterNode, lesson: LessonNode) {
    const lessonId = lesson.id;
    const isLessonSelected = selectedItemIds.includes(lessonId);

    if (isLessonSelected) {
      setSelectedItemIds((prev) => {
        const next = prev.filter((id) => id !== lessonId && id !== chapter.id && id !== unit.id);
        return next;
      });
    } else {
      setSelectedItemIds((prev) => {
        const next = Array.from(new Set([...prev, lessonId]));
        const allLessonsSelected = (chapter.lessons ?? []).every(
          (l) => l.id === lessonId || next.includes(l.id)
        );
        if (allLessonsSelected) next.push(chapter.id);
        const allChaptersSelected = (unit.chapters ?? []).every(
          (c) => (c.id === chapter.id && allLessonsSelected) || next.includes(c.id)
        );
        if (allChaptersSelected) next.push(unit.id);
        return next;
      });
    }
  }

  function handleSelectAllSyllabus() {
    const allIds: string[] = [];
    syllabusUnits.forEach((u) => {
      allIds.push(u.id);
      (u.chapters ?? []).forEach((c) => {
        allIds.push(c.id);
        (c.lessons ?? []).forEach((l) => allIds.push(l.id));
      });
    });
    setSelectedItemIds(allIds);
  }

  function handleClearAllSyllabus() {
    setSelectedItemIds([]);
  }

  // Compute selected syllabus structure for payload
  const selectedSyllabusData = useMemo(() => {
    return syllabusUnits
      .map((unit) => {
        const unitSelected = selectedItemIds.includes(unit.id);
        const selectedChapters = (unit.chapters ?? [])
          .map((chapter) => {
            const chapterSelected = selectedItemIds.includes(chapter.id);
            const selectedLessons = (chapter.lessons ?? []).filter((lesson) =>
              selectedItemIds.includes(lesson.id)
            );
            if (chapterSelected || selectedLessons.length > 0) {
              return {
                ...chapter,
                lessons: selectedLessons,
              };
            }
            return null;
          })
          .filter(Boolean);

        if (unitSelected || selectedChapters.length > 0) {
          return {
            ...unit,
            chapters: selectedChapters,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [syllabusUnits, selectedItemIds]);

  const selectedCountStats = useMemo(() => {
    let unitsCount = 0;
    let chaptersCount = 0;
    let lessonsCount = 0;

    syllabusUnits.forEach((u) => {
      if (selectedItemIds.includes(u.id)) unitsCount++;
      (u.chapters ?? []).forEach((c) => {
        if (selectedItemIds.includes(c.id)) chaptersCount++;
        (c.lessons ?? []).forEach((l) => {
          if (selectedItemIds.includes(l.id)) lessonsCount++;
        });
      });
    });

    return { unitsCount, chaptersCount, lessonsCount };
  }, [syllabusUnits, selectedItemIds]);

  function validateBasic(showToast = true) {
    if (!programId) {
      if (showToast) toast.error("Please select a Course / Program");
      return false;
    }
    if (!subjectId) {
      if (showToast) toast.error("Please select a Subject for this assignment");
      return false;
    }
    
    if (issueDate && submissionDate && new Date(submissionDate) < new Date(issueDate)) {
      if (showToast) toast.error("Submission date cannot be before issue date");
      return false;
    }
    return true;
  }

  function validateTargets(showToast = true) {
    if (isPlatformAdmin) return true;
    if (!institutionId) {
      if (showToast) toast.error("Institution is required");
      return false;
    }
    if (!programId) {
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
    if (tab === "syllabus" || tab === "questions") {
      if (!validateBasic()) {
        setActiveTab("basic");
        return false;
      }
    }
    return true;
  }

  const visibleTabs = WIZARD_TABS;

  const activeTabIndex = visibleTabs.findIndex((item) => item.value === activeTab);
  const isLastStep = activeTabIndex === visibleTabs.length - 1;

  function goToTab(tab: WizardTab) {
    const currentIndex = visibleTabs.findIndex((item) => item.value === activeTab);
    const nextIndex = visibleTabs.findIndex((item) => item.value === tab);
    if (nextIndex <= currentIndex || validateBeforeTab(tab)) {
      setActiveTab(tab);
    }
  }

  function goNext() {
    const next = visibleTabs[activeTabIndex + 1];
    if (next) goToTab(next.value);
  }

  function goPrevious() {
    const previous = visibleTabs[activeTabIndex - 1];
    if (previous) setActiveTab(previous.value);
  }

  async function save() {
    if (!validateBasic()) return;
    if (!accessToken) {
      toast.error("Please login to save assignment");
      return;
    }

    const resolvedInstId =
      (template?.source_institution_id ? Number(template.source_institution_id) : null) ??
      (activeInstitution?.id ? Number(activeInstitution.id) : null) ??
      (user?.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null) ??
      ((user as any)?.institution_id ? Number((user as any).institution_id) : null) ??
      (institutionId ? Number(institutionId) : 1);

    const finalTitle =
      title.trim() ||
      (subjectName
        ? `${subjectName}`
        : programName
          ? `${programName}`
          : "Assignment");

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: finalTitle,
        description: description.trim() || null,
        total_marks: Number(totalMarks),
        source_institution_id: resolvedInstId,
        target_type: "PROGRAM",
        target_id: Number(programId || 1),
        target_program_id: programId ? Number(programId) : null,
        program_id: programId ? Number(programId) : null,
        subject_id: subjectId,
        subject_name: subjectName,
        syllabus_data: selectedSyllabusData,
        syllabus_nodes: selectedSyllabusData,
        issue_date: issueDate || new Date().toISOString().slice(0, 10),
        submission_date: submissionDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        is_public: isPlatformAdmin ? true : isPublic,
        is_active: isActive,
        is_paid: isPaid,
        price: isPaid ? Math.max(0, Number(price) || 0) : 0,
        ai_question_format: aiQuestionFormat,
      };

      const url = template
        ? `/api/admin/master-data/assignments/${template.id}`
        : "/api/admin/master-data/assignments";
      const method = template ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to save assignment");

      toast.success(template ? "Assignment updated successfully" : "Assignment created successfully");
      onOpenChange(false);
      onSaved(Number(json.data?.id ?? template?.id ?? 0));
    } catch (error: any) {
      toast.error(error.message ?? "Failed to save assignment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl md:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="size-4" />
            </span>
            {template ? "Edit Assignment" : "Add Assignment"}
          </DialogTitle>
          <DialogDescription>
            Configure assignment details, select subject and mapped syllabus topics.
          </DialogDescription>
        </DialogHeader>

        {/* Wizard Steps Navigation */}
        <div className="flex items-center gap-2 border-b pb-3 pt-1">
          {visibleTabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.value;
            const isCompleted = activeTabIndex > idx;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => goToTab(tab.value)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all",
                  isCurrent
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isCompleted
                      ? "bg-muted text-foreground hover:bg-muted/80"
                      : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <span className="flex size-5 items-center justify-center rounded-full text-[11px] font-bold border border-current">
                  {isCompleted ? <Check className="size-3 stroke-[3]" /> : idx + 1}
                </span>
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: BASIC DETAILS */}
        {activeTab === "basic" && (
          <div className="grid gap-5 py-2">
            {/* Top Row: Course / Program & Subject parallel */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Course / Program Field */}
              <div className="space-y-2">
                <RequiredLabel>Course / Program</RequiredLabel>
                <AsyncSearchPopover<AssignmentProgramOption>
                  value={programId}
                  selectedLabel={programName}
                  onChange={(value) => {
                    setProgramId(value);
                    setSectionId("");
                    setStudentId("");
                    setStudentName("");
                    setSubjectId("");
                    setSubjectName("");
                    setSyllabusUnits([]);
                    setSelectedItemIds([]);
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
                  }}
                  fetcher={fetchPrograms}
                  getValue={(p) => String(p.id)}
                  getLabel={(p) => p.title}
                  placeholder="Select course / program..."
                  searchPlaceholder="Search all courses / programs..."
                  emptyText="No courses/programs found"
                />
              </div>

              {/* Single Subject Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <RequiredLabel>Subject</RequiredLabel>
                  <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
                    1 subject per assignment
                  </Badge>
                </div>

                {!programId ? (
                  <div className="rounded-md border border-dashed p-2.5 text-xs text-muted-foreground h-10 flex items-center">
                    Select Course first to choose subject
                  </div>
                ) : programLoading ? (
                  <div className="flex items-center gap-2 p-2.5 text-xs text-muted-foreground h-10">
                    <Loader2 className="size-4 animate-spin" /> Loading subjects...
                  </div>
                ) : programSubjects.length === 0 ? (
                  <div className="rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-300">
                    No subjects found for this course.
                  </div>
                ) : (
                  <Select value={subjectId} onValueChange={handleSelectSubject}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a subject for this assignment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {programSubjects.map((sub) => (
                        <SelectItem key={String(sub.id)} value={String(sub.id)}>
                          <div className="flex items-center gap-2">
                            <BookMarked className="size-3.5 text-primary" />
                            <span className="font-medium">{sub.name}</span>
                            {sub.code && (
                              <span className="text-xs text-muted-foreground">({sub.code})</span>
                            )}
                            {sub.term_name && (
                              <Badge variant="secondary" className="text-[10px] py-0">
                                {sub.term_name}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* 4. Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional assignment instructions or description..."
                className="min-h-20"
              />
            </div>

            {/* 5. Pricing & Marketplace Options */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Assignment Access Pricing */}
              <ContentPricingOption
                isPaid={isPaid}
                onIsPaidChange={setIsPaid}
                price={price}
                onPriceChange={setPrice}
                label="Assignment Access Pricing"
                description="Choose if students access this assignment for Free or if a fee is charged."
              />

              {/* Marketplace Publishing Option */}
              <div
                className={cn(
                  "rounded-2xl border transition-all p-4 space-y-3.5 bg-card/60 shadow-2xs flex flex-col justify-between",
                  isPublic
                    ? "border-sky-500/40 bg-gradient-to-br from-sky-50/50 via-background to-indigo-50/20 dark:from-sky-950/20 dark:via-background"
                    : "border-border bg-muted/20"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                      <Label className="text-sm font-bold text-foreground">
                        Show on Marketplace?
                      </Label>
                    </div>

                    {/* Yes / No Toggle */}
                    <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-xl border border-border/70 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsPublic(false)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                          !isPublic
                            ? "bg-muted-foreground/20 text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPublic(true)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                          isPublic
                            ? "bg-sky-600 text-white shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Yes
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {isPublic
                      ? "This assignment will be listed publicly on the EduBird marketplace for other institutions and learners."
                      : "Keep this assignment private to your institution only."}
                  </p>
                </div>

                {isPublic && (
                  <div className="pt-2.5 border-t border-sky-200/60 dark:border-sky-900/40 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                    <span className="text-muted-foreground font-medium">Marketplace Status:</span>
                    <Badge className="bg-sky-600 text-white text-[10px] font-bold">
                      {isPaid && Number(price) > 0 ? `Paid (₹${price})` : "Free Marketplace"}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SYLLABUS SELECTION */}
        {activeTab === "syllabus" && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">
                    Syllabus for {subjectName || "Selected Subject"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select the Units, Chapters, and Lessons covered by this assignment.
                  </p>
                </div>
              </div>

              {syllabusUnits.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAllSyllabus}
                    className="h-8 text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleClearAllSyllabus}
                    className="h-8 text-xs"
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </div>

            {/* Selection Counter Bar */}
            {syllabusUnits.length > 0 && (
              <div className="flex items-center justify-between rounded-md bg-muted/60 px-4 py-2 text-xs">
                <span className="font-medium text-foreground">
                  Selected Topics:
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[11px] font-semibold">
                    {selectedCountStats.unitsCount} Units
                  </Badge>
                  <Badge variant="secondary" className="text-[11px] font-semibold">
                    {selectedCountStats.chaptersCount} Chapters
                  </Badge>
                  <Badge variant="secondary" className="text-[11px] font-semibold">
                    {selectedCountStats.lessonsCount} Lessons
                  </Badge>
                </div>
              </div>
            )}

            {/* Syllabus Tree Content */}
            {loadingSyllabus ? (
              <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary mb-2" />
                Loading syllabus structure for {subjectName}...
              </div>
            ) : syllabusUnits.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 px-4 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 mb-3">
                  <AlertCircle className="size-6" />
                </div>
                <h4 className="font-semibold text-sm">No Syllabus Configured Yet</h4>
                <p className="text-xs text-muted-foreground max-w-md mt-1 mb-4">
                  No syllabus units or chapters have been defined for{" "}
                  <strong className="text-foreground">{subjectName || "this subject"}</strong> in Courses & Programs yet.
                </p>
                <p className="text-xs text-muted-foreground">
                  You can still create the assignment now and link questions directly.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                {syllabusUnits.map((unit, uIdx) => {
                  const unitSelected = selectedItemIds.includes(unit.id);
                  const isUnitExpanded = expandedUnitIds.includes(unit.id);

                  return (
                    <div
                      key={unit.id}
                      className={cn(
                        "rounded-lg border transition-colors",
                        unitSelected ? "border-primary/40 bg-primary/[0.02]" : "bg-card"
                      )}
                    >
                      {/* Unit Header */}
                      <div className="flex items-center justify-between gap-3 p-3 hover:bg-muted/40 rounded-t-lg">
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-6 shrink-0"
                            onClick={() =>
                              setExpandedUnitIds((prev) =>
                                isUnitExpanded
                                  ? prev.filter((id) => id !== unit.id)
                                  : [...prev, unit.id]
                              )
                            }
                          >
                            {isUnitExpanded ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </Button>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <Checkbox
                              checked={unitSelected}
                              onCheckedChange={() => toggleUnit(unit)}
                            />
                            <div className="flex items-center gap-2">
                              <span className="flex size-5 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold">
                                {unit.unit_number ?? uIdx + 1}
                              </span>
                              <span className="font-semibold text-sm">{unit.title}</span>
                            </div>
                          </label>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {unit.chapters?.length ?? 0} Chapters
                        </Badge>
                      </div>

                      {/* Chapters Accordion Content */}
                      {isUnitExpanded && (
                        <div className="border-t px-4 py-2 space-y-2 bg-muted/20 rounded-b-lg">
                          {(unit.chapters ?? []).length === 0 ? (
                            <p className="text-xs text-muted-foreground italic py-1 pl-8">
                              No chapters in this unit.
                            </p>
                          ) : (
                            unit.chapters.map((chapter, cIdx) => {
                              const chapterSelected = selectedItemIds.includes(chapter.id);
                              const isChapterExpanded = expandedChapterIds.includes(chapter.id);

                              return (
                                <div
                                  key={chapter.id}
                                  className={cn(
                                    "rounded-md border p-2.5 transition-colors",
                                    chapterSelected
                                      ? "border-primary/30 bg-primary/[0.03]"
                                      : "bg-background"
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-5 shrink-0"
                                        onClick={() =>
                                          setExpandedChapterIds((prev) =>
                                            isChapterExpanded
                                              ? prev.filter((id) => id !== chapter.id)
                                              : [...prev, chapter.id]
                                          )
                                        }
                                      >
                                        {isChapterExpanded ? (
                                          <ChevronDown className="size-3.5" />
                                        ) : (
                                          <ChevronRight className="size-3.5" />
                                        )}
                                      </Button>
                                      <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <Checkbox
                                          checked={chapterSelected}
                                          onCheckedChange={() => toggleChapter(unit, chapter)}
                                        />
                                        <div className="flex items-center gap-1.5">
                                          <Layers className="size-3.5 text-muted-foreground" />
                                          <span className="text-xs font-medium">
                                            {chapter.title}
                                          </span>
                                        </div>
                                      </label>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">
                                      {chapter.lessons?.length ?? 0} Lessons
                                    </span>
                                  </div>

                                  {/* Lessons List */}
                                  {isChapterExpanded && (
                                    <div className="mt-2 ml-7 pl-3 border-l space-y-1.5 pt-1">
                                      {(chapter.lessons ?? []).length === 0 ? (
                                        <p className="text-[11px] text-muted-foreground italic">
                                          No lessons in this chapter.
                                        </p>
                                      ) : (
                                        chapter.lessons.map((lesson) => {
                                          const lessonSelected = selectedItemIds.includes(lesson.id);
                                          return (
                                            <label
                                              key={lesson.id}
                                              className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-muted/50 cursor-pointer select-none"
                                            >
                                              <Checkbox
                                                checked={lessonSelected}
                                                onCheckedChange={() =>
                                                  toggleLesson(unit, chapter, lesson)
                                                }
                                              />
                                              <FileText className="size-3 text-muted-foreground" />
                                              <span className="text-xs text-foreground/90">
                                                {lesson.title}
                                              </span>
                                            </label>
                                          );
                                        })
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ASSIGNMENT TARGETS (Institution Admin Only) */}
        {activeTab === "targets" && !isPlatformAdmin && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Target Type</Label>
              <Select
                value={targetType}
                onValueChange={(val) => {
                  setTargetType(val as TargetType);
                  setSectionId("");
                  setStudentId("");
                  setStudentName("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROGRAM">Whole Class / Course</SelectItem>
                  <SelectItem value="SECTION">Specific Section</SelectItem>
                  <SelectItem value="STUDENT">Specific Student</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(targetType === "SECTION" || targetType === "STUDENT") && (
              <div className="space-y-2">
                <RequiredLabel>Section</RequiredLabel>
                <Select
                  value={sectionId}
                  onValueChange={(val) => {
                    setSectionId(val);
                    setStudentId("");
                    setStudentName("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((sec) => (
                      <SelectItem key={sec.id} value={String(sec.id)}>
                        {sec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {targetType === "STUDENT" && (
              <div className="space-y-2">
                <RequiredLabel>Student</RequiredLabel>
                <AsyncSearchPopover<AssignmentStudentOption>
                  value={studentId}
                  selectedLabel={studentName}
                  onChange={(val) => setStudentId(val)}
                  onSelectItem={(st) => setStudentName(st.name)}
                  fetcher={fetchStudents}
                  getValue={(st) => String(st.id)}
                  getLabel={(st) => st.name}
                  placeholder="Select student..."
                  searchPlaceholder="Search students..."
                  emptyText="No students found"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 4: QUESTIONS / AI GENERATION CONFIG */}
        {activeTab === "questions" && (
          <div className="grid gap-4 py-2">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Generate Questions via AI</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Automatically generate practice questions tailored to{" "}
                    <strong className="text-foreground">{subjectName || "the chosen subject"}</strong>{" "}
                    and mapped syllabus units.
                  </p>
                </div>
              </div>

              <label className="mt-4 flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Checkbox
                  checked={aiQuestionFormat.enabled}
                  onCheckedChange={(val) =>
                    setAiQuestionFormat((prev) => ({
                      ...prev,
                      enabled: Boolean(val),
                    }))
                  }
                />
                Enable AI question generation format
              </label>

              {aiQuestionFormat.enabled && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3 border-t pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">True / False</Label>
                    <Input
                      type="number"
                      min="0"
                      value={aiQuestionFormat.true_false}
                      onChange={(e) =>
                        setAiQuestionFormat((prev) => ({
                          ...prev,
                          true_false: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Single Choice</Label>
                    <Input
                      type="number"
                      min="0"
                      value={aiQuestionFormat.single_choice ?? 0}
                      onChange={(e) =>
                        setAiQuestionFormat((prev) => ({
                          ...prev,
                          single_choice: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Multiple Choice</Label>
                    <Input
                      type="number"
                      min="0"
                      value={aiQuestionFormat.multiple_choice}
                      onChange={(e) =>
                        setAiQuestionFormat((prev) => ({
                          ...prev,
                          multiple_choice: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Short Text</Label>
                    <Input
                      type="number"
                      min="0"
                      value={aiQuestionFormat.short_text ?? 0}
                      onChange={(e) =>
                        setAiQuestionFormat((prev) => ({
                          ...prev,
                          short_text: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Long Text</Label>
                    <Input
                      type="number"
                      min="0"
                      value={aiQuestionFormat.long_text ?? 0}
                      onChange={(e) =>
                        setAiQuestionFormat((prev) => ({
                          ...prev,
                          long_text: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dialog Footer Actions */}
        <DialogFooter className="gap-2 sm:justify-between border-t pt-4 mt-2">
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
            <Button type="button" onClick={() => void save()} disabled={saving} className="gap-1.5">
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {template ? "Save Changes" : "Create Assignment"}
            </Button>
          ) : (
            <Button type="button" onClick={goNext} disabled={saving}>
              Next
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  HelpCircle,
  Loader2,
  Save,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import type { PracticeExamRow } from "@/lib/types/practice-exam";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { ContentPricingOption } from "@/components/shared/content-pricing-option";
import { generateDefaultSyllabusForSubject } from "@/lib/utils/syllabus-generator";

export type PracticeExamInstitutionOption = { id: number; name: string };
type PracticeExamProgramOption = { id: number; title: string };
type PracticeExamStudentOption = {
  id: number;
  name: string;
  email?: string | null;
  admission_number?: string | null;
};
type SectionOption = { id: number; name: string };
type TargetType = "INSTITUTION" | "PROGRAM" | "SECTION" | "STUDENT";
type WizardTab = "basic" | "syllabus" | "questions";

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
  objective: number;
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
  template: PracticeExamRow | null;
  fetchInstitutions: (
    search: string,
    page: number
  ) => Promise<{ data: PracticeExamInstitutionOption[]; hasMore: boolean }>;
  onSaved: (practiceExamId: number) => void;
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

function RequiredLabel({ children }: { children: string }) {
  return (
    <Label className="flex items-center gap-1 font-medium">
      {children}
      <span className="text-destructive">*</span>
    </Label>
  );
}

export function PracticeExamEditor({
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
  const [totalMarks, setTotalMarks] = useState("1");
  const [durationMinutes, setDurationMinutes] = useState("30");
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

  // Subject selection (strictly 1 subject per practice exam)
  const [subjectId, setSubjectId] = useState("");
  const [subjectName, setSubjectName] = useState("");

  // Syllabus hierarchy & selection
  const [syllabusUnits, setSyllabusUnits] = useState<UnitNode[]>([]);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [expandedUnitIds, setExpandedUnitIds] = useState<string[]>([]);
  const [expandedChapterIds, setExpandedChapterIds] = useState<string[]>([]);

  const [isPublic, setIsPublic] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<number | string>(0);
  const [aiQuestionFormat, setAiQuestionFormat] = useState<AiQuestionFormat>({
    enabled: false,
    true_false: 1,
    objective: 2,
  });

  const [activeTab, setActiveTab] = useState<WizardTab>("basic");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(template?.title ?? "");
    setDescription(template?.description ?? "");
    setTotalMarks(String(template?.total_marks ?? 1));
    setDurationMinutes(String(template?.duration_minutes ?? 30));
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
    const initialSubId = (template as any)?.subject_id ?? "";
    const initialSubName = (template as any)?.subject_name ?? "";
    setSubjectId(initialSubId);
    setSubjectName(initialSubName);

    // Initialize syllabus
    const initialSyllabusData = (template as any)?.syllabus_data ?? [];
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

    setIsPublic(template?.is_public ?? false);
    setIsActive(template?.is_active ?? true);
    setIsPaid(Boolean(template?.is_paid));
    setPrice(Number(template?.price ?? 0));
    setAiQuestionFormat({
      enabled: Boolean(template?.ai_question_format?.enabled),
      true_false: template?.ai_question_format?.true_false ?? 1,
      objective: template?.ai_question_format?.objective ?? 2,
    });
    setActiveTab("basic");

    if (pId) {
      void loadProgramDetail(pId, initialSubId);
    }
  }, [activeInstitution, open, template]);

  async function loadProgramDetail(id: string, initialSubId?: string) {
    if (!accessToken || !id) {
      setSections([]);
      setProgramSubjects([]);
      return;
    }
    setProgramLoading(true);
    try {
      if (isPlatformAdmin) {
        const res = await fetch(`/api/admin/content/courses/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await readJson(res);
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
      toast.error(err.message ?? "Failed to load subjects");
    } finally {
      setProgramLoading(false);
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
      data: (json.data ?? []) as PracticeExamProgramOption[],
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
    const res = await fetch(`/api/admin/master-data/practice-exams?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to load students");
    return {
      data: (json.data ?? []) as PracticeExamStudentOption[],
      hasMore: page < Number(json.pageCount ?? 0),
    };
  }

  function resolveTargetId() {
    if (isPlatformAdmin) return Number(programId || 1);
    if (targetType === "INSTITUTION") return Number(institutionId);
    if (targetType === "PROGRAM") return Number(programId);
    if (targetType === "SECTION") return Number(sectionId);
    return Number(studentId);
  }

  // Checkbox selection helpers for Unit / Chapter / Lesson
  function toggleUnit(unit: UnitNode) {
    const isSelected = selectedItemIds.includes(unit.id);
    const unitAndChildIds: string[] = [unit.id];
    (unit.chapters ?? []).forEach((c) => {
      unitAndChildIds.push(c.id);
      (c.lessons ?? []).forEach((l) => unitAndChildIds.push(l.id));
    });

    if (isSelected) {
      setSelectedItemIds((prev) => prev.filter((id) => !unitAndChildIds.includes(id)));
    } else {
      setSelectedItemIds((prev) => Array.from(new Set([...prev, ...unitAndChildIds])));
    }
  }

  function toggleChapter(unit: UnitNode, chapter: ChapterNode) {
    const isSelected = selectedItemIds.includes(chapter.id);
    const chapterAndChildIds: string[] = [chapter.id];
    (chapter.lessons ?? []).forEach((l) => chapterAndChildIds.push(l.id));

    if (isSelected) {
      setSelectedItemIds((prev) => {
        const next = prev.filter((id) => !chapterAndChildIds.includes(id));
        return next.filter((id) => id !== unit.id);
      });
    } else {
      setSelectedItemIds((prev) => {
        const next = Array.from(new Set([...prev, ...chapterAndChildIds]));
        const allChaptersSelected = (unit.chapters ?? []).every(
          (c) => c.id === chapter.id || next.includes(c.id)
        );
        if (allChaptersSelected) next.push(unit.id);
        return next;
      });
    }
  }

  function toggleLesson(unit: UnitNode, chapter: ChapterNode, lessonId: string) {
    const isSelected = selectedItemIds.includes(lessonId);
    if (isSelected) {
      setSelectedItemIds((prev) =>
        prev.filter((id) => id !== lessonId && id !== chapter.id && id !== unit.id)
      );
    } else {
      setSelectedItemIds((prev) => {
        const next = [...prev, lessonId];
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
      if (showToast) toast.error("Course / Program is required");
      return false;
    }
    const marks = Number(totalMarks);
    if (Number.isNaN(marks) || marks <= 0) {
      if (showToast) toast.error("Total marks must be greater than 0");
      return false;
    }
    const duration = Number(durationMinutes);
    if (!Number.isInteger(duration) || duration < 1) {
      if (showToast) toast.error("Duration minutes must be an integer >= 1");
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
    if (targetType === "INSTITUTION") {
      if (showToast) toast.error("Select Class / Program, Section, or Particular Student as the target");
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

  function validateQuestionFormat(showToast = true) {
    if (!aiQuestionFormat.enabled) return true;
    const total = aiQuestionFormat.true_false + aiQuestionFormat.objective;
    if (total <= 0) {
      if (showToast) toast.error("Add at least one question in the AI format");
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

  const activeTabIndex = Math.max(
    visibleTabs.findIndex((item) => item.value === activeTab),
    0
  );

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
    if (!accessToken) return;
    if (!validateBasic()) return;
    if (!validateQuestionFormat()) return;
    const marks = Number(totalMarks);
    const resolvedInstId =
      (template?.source_institution_id ? Number(template.source_institution_id) : null) ??
      (activeInstitution?.id ? Number(activeInstitution.id) : null) ??
      (user?.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null) ??
      ((user as any)?.institution_id ? Number((user as any).institution_id) : null) ??
      (institutionId ? Number(institutionId) : 1);

    setSaving(true);
    try {
      const res = await fetch(
        template
          ? `/api/admin/master-data/practice-exams/${template.id}`
          : "/api/admin/master-data/practice-exams",
        {
          method: template ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: (title || "").trim() || (subjectName ? `${subjectName} Practice Exam` : `${programName || "Course"} Practice Exam`),
            description: description.trim(),
            total_marks: marks,
            duration_minutes: Number(durationMinutes),
            source_institution_id: resolvedInstId,
            target_type: "PROGRAM",
            target_id: Number(programId || 1),
            target_program_id: programId ? Number(programId) : null,
            subject_id: subjectId,
            subject_name: subjectName,
            syllabus_data: selectedSyllabusData,
            syllabus_node_ids: [],
            ai_question_format: aiQuestionFormat,
            is_public: isPlatformAdmin ? true : isPublic,
            is_active: isActive,
            is_paid: isPaid,
            price: isPaid ? (Number(price) || 0) : 0,
          }),
        }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to save practice exam");
      const practiceExamId = template?.id ?? Number(json.data?.id);
      toast.success(template ? "Practice Exam updated" : "Practice Exam created");
      onOpenChange(false);
      onSaved(practiceExamId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save practice exam");
    } finally {
      setSaving(false);
    }
  }

  const isQuestionsStep = activeTab === "questions";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl md:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="size-4" />
            </span>
            {template ? "Edit Practice Exam" : "Add Practice Exam"}
          </DialogTitle>
          <DialogDescription>
            Configure practice exam details, select subject and mapped syllabus topics.
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

        {activeTab === "basic" && (
          <div className="grid gap-5 py-2">
            {/* Top Row: Course / Program & Subject parallel */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <RequiredLabel>Course / Program</RequiredLabel>
                <AsyncSearchPopover<PracticeExamProgramOption>
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
                    setExpandedUnitIds([]);
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
                  getValue={(program) => String(program.id)}
                  getLabel={(program) => program.title}
                  placeholder="Select course / program..."
                  searchPlaceholder="Search all courses / programs..."
                  emptyText="No courses/programs found"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <RequiredLabel>Subject</RequiredLabel>
                  <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
                    1 subject per exam
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
                  <Select
                    value={subjectId}
                    onValueChange={(val) => {
                      setSubjectId(val);
                      const matched = programSubjects.find((s) => String(s.id) === String(val));
                      setSubjectName(matched?.name ?? "");
                      setSelectedItemIds([]);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a subject for this practice exam..." />
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

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional description or exam instructions..."
                className="min-h-24"
              />
            </div>
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

            <ContentPricingOption
              isPaid={isPaid}
              onIsPaidChange={setIsPaid}
              price={price}
              onPriceChange={setPrice}
              label="Practice Exam Access Pricing"
              description="Choose if learners access this practice exam for Free or if a fee is charged."
            />
          </div>
        )}

        {/* TAB 2: SYLLABUS MAPPING */}
        {activeTab === "syllabus" && (
          <div className="space-y-4">
            {/* Single Subject Selector */}
            <div className="space-y-2">
              <RequiredLabel>Subject</RequiredLabel>
              <Select
                value={subjectId}
                onValueChange={(val) => {
                  setSubjectId(val);
                  const matched = programSubjects.find((s) => String(s.id) === String(val));
                  setSubjectName(matched?.name ?? "");
                  setSelectedItemIds([]);
                }}
                disabled={!programId || programLoading || programSubjects.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      programLoading
                        ? "Loading subjects..."
                        : !programId
                          ? "Select course / program first"
                          : programSubjects.length === 0
                            ? "No subjects available"
                            : "Select subject..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {programSubjects.map((sub) => (
                    <SelectItem key={sub.id} value={String(sub.id)}>
                      <div className="flex items-center gap-2">
                        <span>{sub.name}</span>
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
            </div>

            {/* Curriculum Mapping Box */}
            <div className="space-y-4 pt-2">
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
                      Select the Units, Chapters, and Lessons covered by this practice exam.
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
                  <span className="font-medium text-foreground">Selected Topics:</span>
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
              ) : !subjectId ? (
                <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  Please select a subject above to view and map curriculum topics.
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
                    You can still create the practice exam now and link questions directly.
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

                        {/* Chapters */}
                        {isUnitExpanded && (unit.chapters ?? []).length > 0 && (
                          <div className="p-3 pt-0 space-y-2 border-t bg-muted/10">
                            {unit.chapters.map((chapter, cIdx) => {
                              const chapterSelected = selectedItemIds.includes(chapter.id);
                              const isChapterExpanded = expandedChapterIds.includes(chapter.id);

                              return (
                                <div
                                  key={chapter.id}
                                  className={cn(
                                    "rounded-md border bg-background p-2.5 transition-colors",
                                    chapterSelected ? "border-primary/30" : "border-border/60"
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
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
                                        <span className="text-xs font-medium text-muted-foreground">
                                          Ch {chapter.chapter_number ?? cIdx + 1}:
                                        </span>
                                        <span className="text-xs font-semibold">{chapter.title}</span>
                                      </label>
                                    </div>
                                    {(chapter.lessons ?? []).length > 0 && (
                                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                        {chapter.lessons.length} lessons
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Lessons */}
                                  {isChapterExpanded && (chapter.lessons ?? []).length > 0 && (
                                    <div className="mt-2 ml-7 space-y-1.5 border-l-2 border-primary/20 pl-3 pt-1">
                                      {chapter.lessons.map((lesson) => {
                                        const lessonSelected = selectedItemIds.includes(lesson.id);
                                        return (
                                          <label
                                            key={lesson.id}
                                            className="flex items-center gap-2 text-xs cursor-pointer select-none py-0.5 hover:text-foreground text-muted-foreground"
                                          >
                                            <Checkbox
                                              checked={lessonSelected}
                                              onCheckedChange={() => toggleLesson(unit, chapter, lesson.id)}
                                            />
                                            <span>{lesson.title}</span>
                                            {lesson.duration_mins && (
                                              <span className="text-[10px] text-muted-foreground/70">
                                                ({lesson.duration_mins}m)
                                              </span>
                                            )}
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: QUESTIONS TAB */}
        {activeTab === "questions" && (
          <div className="grid gap-4">
            <div className="rounded-md border p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">Generate questions via AI</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This is optional and is used only when you click Generate via AI after saving the practice exam.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={aiQuestionFormat.enabled}
                    onCheckedChange={(value) =>
                      setAiQuestionFormat((current) => ({
                        ...current,
                        enabled: Boolean(value),
                      }))
                    }
                  />
                  Enable AI question generator for this practice exam
                </label>
                {aiQuestionFormat.enabled && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">True / False questions</Label>
                      <Input
                        type="number"
                        min="0"
                        value={aiQuestionFormat.true_false}
                        onChange={(e) =>
                          setAiQuestionFormat((prev) => ({
                            ...prev,
                            true_false: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Multiple Choice questions</Label>
                      <Input
                        type="number"
                        min="0"
                        value={aiQuestionFormat.objective}
                        onChange={(e) =>
                          setAiQuestionFormat((prev) => ({
                            ...prev,
                            objective: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Save the practice exam first, then open its detail sheet and use Add Questions or Manage Questions.
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
              {template ? "Save Changes" : "Create Practice Exam"}
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

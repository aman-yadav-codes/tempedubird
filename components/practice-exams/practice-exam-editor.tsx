"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, ClipboardList, HelpCircle, Loader2, Save, Target } from "lucide-react";
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
import type { SyllabusNode } from "@/lib/types/syllabus";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { ContentPricingOption } from "@/components/shared/content-pricing-option";

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
};

const WIZARD_TABS: Array<{
  value: WizardTab;
  label: string;
  icon: typeof ClipboardList;
}> = [
  { value: "basic", label: "Basic Details", icon: ClipboardList },
  { value: "targets", label: "Practice Exam Targets", icon: Target },
  { value: "syllabus", label: "Syllabus Mapping", icon: BookOpen },
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
  onToggleNode: (nodeId: number) => void;
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
                onCheckedChange={() => onToggleNode(node.id)}
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

function RequiredLabel({ children }: { children: string }) {
  return (
    <Label>
      {children} <span className="text-destructive">*</span>
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
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [isPublic, setIsPublic] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<number | string>(0);
  const [aiQuestionFormat, setAiQuestionFormat] = useState<AiQuestionFormat>({
    enabled: false,
    true_false: 1,
    objective: 4,
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setTitle(template?.title ?? "");
      setDescription(template?.description ?? "");
      setTotalMarks(String(template?.total_marks ?? 1));
      setInstitutionId(String(template?.source_institution_id ?? activeInstitution?.id ?? ""));
      setInstitutionName(template?.institution_name ?? activeInstitution?.name ?? "");
      setTargetType(
        template?.target_type && template.target_type !== "INSTITUTION"
          ? (template.target_type as TargetType)
          : "PROGRAM"
      );
      setProgramId(
        template?.target_type === "PROGRAM"
          ? String(template.target_id ?? "")
          : template?.target_type === "SECTION" || template?.target_type === "STUDENT"
            ? String(template.target_program_id ?? "")
            : ""
      );
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
      setDurationMinutes(String(template?.duration_minutes ?? 30));
      setIsPublic(Boolean(template?.marketplace_requested || template?.is_public));
      setIsActive(template?.is_active ?? false);
      setIsPaid(Boolean((template as any)?.is_paid || (Number((template as any)?.price) > 0)));
      setPrice(Number((template as any)?.price) || 0);
      setAiQuestionFormat({
        enabled: Boolean(template?.ai_question_format?.enabled),
        true_false: Number(template?.ai_question_format?.true_false ?? 1),
        objective: Number(template?.ai_question_format?.objective ?? 4),
      });
      setActiveTab("basic");
      const firstNode = template?.syllabus_nodes?.[0];
      setSubjectId(firstNode?.subject_id ? String(firstNode.subject_id) : "");
      setSubjectName(firstNode?.subject_name ?? "");
      setSyllabusId(firstNode?.syllabus_id ? String(firstNode.syllabus_id) : "");
      setSyllabusName(firstNode?.syllabus_title ?? "");
      setSelectedNodeIds(template?.syllabus_node_ids ?? []);
      setExpandedNodeIds([]);
      setSyllabusTree([]);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activeInstitution, open, template]);

  async function loadProgramDetail(id: string) {
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
        setProgramSubjects(
          ((json.data?.subjects ?? []) as Array<{ id: number; name?: string; code?: string }>).map((s) => ({
            id: s.id,
            name: s.name ?? `Subject ${s.id}`,
            syllabus_available: true,
          }))
        );
        return;
      }
      const res = await fetch(`/api/admin/institutions/programs/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load class");
      setSections(
        (json.data?.section_ids ?? []).map((value: number, index: number) => ({
          id: value,
          name: json.data?.section_names?.[index] ?? `Section ${value}`,
        }))
      );
      setProgramSubjects(
        (json.data?.subject_ids ?? []).map((value: number, index: number) => ({
          id: value,
          name: json.data?.subject_names?.[index] ?? `Subject ${value}`,
          syllabus_available: Boolean(json.data?.subject_syllabus_available?.[index]),
        }))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load class");
    } finally {
      setProgramLoading(false);
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

  async function fetchSyllabi(search: string, page: number) {
    if (!accessToken || !subjectId) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      page: String(page),
      limit: "15",
      search,
      subjectId,
      view: "my",
    });
    if (institutionId) params.set("institutionId", institutionId);
    const res = await fetch(`/api/admin/master-data/syllabi?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to load syllabi");
    return {
      data: (json.data ?? []) as SyllabusOption[],
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

  function getNodeAndDescendantIds(nodes: SyllabusNode[], nodeId: number): number[] {
    for (const node of nodes) {
      if (node.id === nodeId) {
        const collect = (item: SyllabusNode): number[] => [
          item.id,
          ...(item.children ?? []).flatMap(collect),
        ];
        return collect(node);
      }
      const nested = getNodeAndDescendantIds(node.children ?? [], nodeId);
      if (nested.length > 0) return nested;
    }
    return [];
  }

  function toggleNode(nodeId: number) {
    const affectedIds = getNodeAndDescendantIds(syllabusTree, nodeId);
    const idsToToggle = affectedIds.length > 0 ? affectedIds : [nodeId];
    setSelectedNodeIds((current) => {
      const selected = new Set(current);
      const isSelected = selected.has(nodeId);
      idsToToggle.forEach((id) => {
        if (isSelected) selected.delete(id);
        else selected.add(id);
      });
      return Array.from(selected);
    });
  }

  function toggleExpanded(nodeId: number) {
    setExpandedNodeIds((current) =>
      current.includes(nodeId)
        ? current.filter((id) => id !== nodeId)
        : [...current, nodeId]
    );
  }

  function validateBasic(showToast = true) {
    if (!title.trim()) {
      if (showToast) toast.error("Title is required");
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

  function updateAiQuestionFormat(key: keyof AiQuestionFormat, value: string) {
    const parsed = Number(value);
    setAiQuestionFormat((current) => ({
      ...current,
      [key]: Number.isInteger(parsed) && parsed >= 0 ? parsed : 0,
    }));
  }

  function validateQuestionFormat(showToast = true) {
    if (!aiQuestionFormat.enabled) return true;
    if (selectedNodeIds.length === 0) {
      if (showToast) toast.error("Map at least one syllabus node before using AI generation");
      setActiveTab("syllabus");
      return false;
    }
    const total = aiQuestionFormat.true_false + aiQuestionFormat.objective;
    if (total <= 0) {
      if (showToast) toast.error("Add at least one question in the AI format");
      return false;
    }
    return true;
  }

  function validateBeforeTab(tab: WizardTab) {
    const index = WIZARD_TABS.findIndex((item) => item.value === tab);
    if (index >= 1 && !validateBasic()) {
      setActiveTab("basic");
      return false;
    }
    if (index >= 2 && !validateTargets()) {
      setActiveTab(isPlatformAdmin ? "basic" : "targets");
      return false;
    }
    return true;
  }

  function goToTab(tab: WizardTab) {
    const currentIndex = WIZARD_TABS.findIndex((item) => item.value === activeTab);
    const nextIndex = WIZARD_TABS.findIndex((item) => item.value === tab);
    if (nextIndex <= currentIndex || validateBeforeTab(tab)) {
      setActiveTab(tab);
    }
  }

  function goNext() {
    const visibleList = isPlatformAdmin
      ? WIZARD_TABS.filter((item) => item.value !== "targets")
      : WIZARD_TABS;
    const currentIndex = visibleList.findIndex((item) => item.value === activeTab);
    const next = visibleList[currentIndex + 1];
    if (next) goToTab(next.value);
  }

  function goPrevious() {
    const visibleList = isPlatformAdmin
      ? WIZARD_TABS.filter((item) => item.value !== "targets")
      : WIZARD_TABS;
    const currentIndex = visibleList.findIndex((item) => item.value === activeTab);
    const previous = visibleList[currentIndex - 1];
    if (previous) setActiveTab(previous.value);
  }

  async function save() {
    if (!accessToken) return;
    if (!validateBasic()) return;
    if (!validateTargets()) return;
    if (!validateQuestionFormat()) return;
    setActiveTab("questions");
    const marks = Number(totalMarks);
    const resolvedInstId = Number(institutionId || activeInstitution?.id || 1);
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
            title: title.trim(),
            description: description.trim(),
            total_marks: marks,
            duration_minutes: Number(durationMinutes),
            source_institution_id: resolvedInstId,
            target_type: "PROGRAM",
            target_id: resolveTargetId(),
            target_program_id: programId ? Number(programId) : null,
            syllabus_node_ids: selectedNodeIds,
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

  const visibleTabs = isPlatformAdmin
    ? WIZARD_TABS.filter((item) => item.value !== "targets")
    : WIZARD_TABS;
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
            {template ? "Edit Practice Exam" : "Add Practice Exam"}
          </DialogTitle>
          <DialogDescription>
            Save practice exam details first. Questions are managed from its detail sheet.
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
            {!isPlatformAdmin && !template && !activeInstitution && (
              <div className="space-y-2">
                <RequiredLabel>Institution</RequiredLabel>
                <AsyncSearchPopover<PracticeExamInstitutionOption>
                  value={institutionId}
                  selectedLabel={institutionName}
                  onChange={(value) => {
                    setInstitutionId(value);
                    if (!value) setInstitutionName("");
                    setProgramId("");
                    setProgramName("");
                    setSections([]);
                    setProgramSubjects([]);
                    setSubjectId("");
                    setSubjectName("");
                    setSyllabusId("");
                    setSyllabusName("");
                    setSyllabusTree([]);
                    setSelectedNodeIds([]);
                    setExpandedNodeIds([]);
                  }}
                  onSelectItem={(inst) => setInstitutionName(inst.name)}
                  fetcher={fetchInstitutions}
                  getValue={(inst) => String(inst.id)}
                  getLabel={(inst) => inst.name}
                  placeholder="Select institution..."
                  searchPlaceholder="Search institutions..."
                  emptyText="No accessible institutions found"
                />
              </div>
            )}

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
                    if (!title.trim() || title.endsWith("Practice Exam")) {
                      setTitle(`${program.title || program.name} Practice Exam`);
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
                <RequiredLabel>Practice Exam Title</RequiredLabel>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Class 10 Science Practice Exam"
                />
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

            <div className="flex flex-wrap items-center gap-5 pt-2">
              {!isPlatformAdmin && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={isPublic} onCheckedChange={(value) => setIsPublic(Boolean(value))} />
                  Request marketplace review
                </label>
              )}
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={isActive} onCheckedChange={(value) => setIsActive(Boolean(value))} />
                Active
              </label>
            </div>
          </div>
        )}

        {activeTab === "syllabus" && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
                  }}
                  onSelectItem={(subject) => setSubjectName(subject.label ?? subject.name)}
                  items={programSubjects}
                  localFilter
                  loading={programLoading}
                  getValue={(subject) => String(subject.id)}
                  getLabel={(subject) => subject.label ?? subject.name}
                  renderItem={(subject) => (
                    <div className="flex w-full min-w-0 items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {subject.label ?? subject.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 px-1.5 py-0 text-[10px] leading-4",
                          subject.syllabus_available
                            ? "border-emerald-500/60 text-emerald-400"
                            : "border-amber-500/60 text-amber-300"
                        )}
                      >
                        {subject.syllabus_available ? "Available" : "Not added"}
                      </Badge>
                    </div>
                  )}
                  placeholder={programLoading ? "Loading subjects..." : programId ? "Select subject..." : "Select class first"}
                  searchPlaceholder="Search subjects..."
                  emptyText={programLoading ? "Loading subjects..." : programId ? "No subjects attached to this class" : "Select class first"}
                  disabled={!programId || programLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Syllabus</Label>
                <AsyncSearchPopover<SyllabusOption>
                  value={syllabusId}
                  selectedLabel={syllabusName}
                  onChange={(value) => {
                    setSyllabusId(value);
                    if (!value) setSyllabusName("");
                    setSyllabusTree([]);
                    setSelectedNodeIds([]);
                    setExpandedNodeIds([]);
                  }}
                  onSelectItem={(syllabus) => setSyllabusName(syllabus.title)}
                  fetcher={fetchSyllabi}
                  getValue={(syllabus) => String(syllabus.id)}
                  getLabel={(syllabus) => syllabus.title}
                  renderItem={(syllabus) => (
                    <div className="min-w-0">
                      <p className="truncate font-medium">{syllabus.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {syllabus.institution_name ?? (syllabus.is_template ? "Platform template" : syllabus.subject_name)}
                      </p>
                    </div>
                  )}
                  placeholder={subjectId ? "Select syllabus..." : "Select subject first"}
                  searchPlaceholder="Search syllabi..."
                  emptyText="No syllabi found"
                  disabled={!subjectId}
                />
              </div>
            </div>
            <div className="rounded-md border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Curriculum Mapping</p>
                  <p className="text-sm text-muted-foreground">
                    Select one or more syllabus nodes. Selecting a parent also selects its child nodes.
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
                  Select a subject and syllabus to map curriculum nodes.
                </div>
              )}
            </div>
          </div>
        )}

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
              <label className="mt-4 flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={aiQuestionFormat.enabled}
                  onCheckedChange={(value) =>
                    setAiQuestionFormat((current) => ({
                      ...current,
                      enabled: Boolean(value),
                    }))
                  }
                />
                Are you generating questions via AI?
              </label>
              {aiQuestionFormat.enabled && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                </div>
              )}
              {aiQuestionFormat.enabled && (
                <div className="mt-4 rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  Total AI questions:{" "}
                  <span className="font-semibold text-foreground">
                    {aiQuestionFormat.true_false + aiQuestionFormat.objective}
                  </span>
                </div>
              )}
            </div>
            <div className="rounded-md border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
              Save the practice exam first, then open its detail sheet and use Add Questions or Manage Questions.
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
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                  <AsyncSearchPopover<PracticeExamInstitutionOption>
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
                    <AsyncSearchPopover<PracticeExamStudentOption>
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




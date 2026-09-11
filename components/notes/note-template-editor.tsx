"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  HelpCircle,
  Loader2,
  Save,
  Sparkles,
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
import type { NoteTemplateRow } from "@/lib/types/notes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { ContentPricingOption } from "@/components/shared/content-pricing-option";
import { generateDefaultSyllabusForSubject } from "@/lib/utils/syllabus-generator";

export type NoteInstitutionOption = { id: number; name: string };
type NoteProgramOption = { id: number; title: string; name?: string };
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
  multiple_choice: number;
  objective?: number;
  subjective: number;
};

const WIZARD_TABS: Array<{
  value: WizardTab;
  label: string;
  icon: typeof ClipboardList;
}> = [
  { value: "basic", label: "Basic Details", icon: ClipboardList },
  { value: "syllabus", label: "Syllabus", icon: BookOpen },
  { value: "questions", label: "AI Format", icon: HelpCircle },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
  template: NoteTemplateRow | null;
  fetchInstitutions?: (
    search: string,
    page: number
  ) => Promise<{ data: NoteInstitutionOption[]; hasMore: boolean }>;
  onSaved: (noteId: number) => void;
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

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="flex items-center gap-1">
      <span>{children}</span>
      <span className="text-destructive">*</span>
    </Label>
  );
}

export function NoteTemplateEditor({
  open,
  onOpenChange,
  accessToken,
  template,
  onSaved,
}: Props) {
  const { user } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();

  const [activeTab, setActiveTab] = useState<WizardTab>("basic");
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("0");

  // Optional Course/Subject & Syllabus Mapping
  const [programId, setProgramId] = useState("");
  const [programTitle, setProgramTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [subjectName, setSubjectName] = useState("");

  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [fullSyllabus, setFullSyllabus] = useState<SubjectSyllabusData | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<UnitNode[]>([]);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  // AI Question / Q&A Format
  const [aiQuestionFormat, setAiQuestionFormat] = useState<AiQuestionFormat>({
    enabled: false,
    true_false: 2,
    multiple_choice: 3,
    subjective: 2,
  });

  const effectiveInstitutionId =
    institutionId ||
    (activeInstitutionId ? String(activeInstitutionId) : "") ||
    ((user as any)?.institution_id ? String((user as any).institution_id) : "") ||
    (user?.memberships?.[0]?.institution_id ? String(user.memberships[0].institution_id) : "1");

  useEffect(() => {
    if (!open) return;
    setActiveTab("basic");
    if (template) {
      setTitle(template.title);
      setDescription(template.description ?? "");
      setInstitutionId(String(template.institution_id || ""));
      setIsPublic(Boolean(template.is_public));
      setIsActive(Boolean(template.is_active));
      setIsPaid(Boolean(template.is_paid));
      setPrice(String(template.price || 0));

      setProgramId(
        template.target_program_id
          ? String(template.target_program_id)
          : template.target_id
          ? String(template.target_id)
          : ""
      );
      setProgramTitle(template.target_program_label ?? template.target_label ?? "");
      setSubjectId(template.subject_id ?? "");
      setSubjectName(template.subject_name ?? "");

      setSelectedUnits(
        Array.isArray(template.syllabus_data) ? (template.syllabus_data as UnitNode[]) : []
      );

      if (template.ai_question_format) {
        setAiQuestionFormat({
          enabled: Boolean(template.ai_question_format.enabled),
          true_false: Number(template.ai_question_format.true_false) || 0,
          multiple_choice: Number(template.ai_question_format.objective) || 0,
          subjective: Number(template.ai_question_format.subjective) || 0,
        });
      }
    } else {
      setTitle("");
      setDescription("");
      setInstitutionId(activeInstitutionId ? String(activeInstitutionId) : "");
      setIsPublic(false);
      setIsActive(true);
      setIsPaid(false);
      setPrice("0");
      setProgramId("");
      setProgramTitle("");
      setSubjectId("");
      setSubjectName("");
      setSelectedUnits([]);
      setFullSyllabus(null);
      setAiQuestionFormat({
        enabled: false,
        true_false: 2,
        multiple_choice: 3,
        subjective: 2,
      });
    }
  }, [open, template?.id, activeInstitutionId]);

  // Fetch subjects when class/program changes
  useEffect(() => {
    if (!programId || !accessToken) {
      setSubjects([]);
      return;
    }
    setLoadingSubjects(true);
    fetch(`/api/admin/content/courses/${programId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(readJson)
      .then((json) => {
        const course = json.data;
        if (course && Array.isArray(course.subjects)) {
          setSubjects(course.subjects);
        } else {
          setSubjects([]);
        }
      })
      .catch(() => setSubjects([]))
      .finally(() => setLoadingSubjects(false));
  }, [programId, accessToken]);

  // Fetch subject syllabus
  useEffect(() => {
    if (!programId || !subjectId || !accessToken) {
      setFullSyllabus(null);
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

        const effectiveSyllabusData: SubjectSyllabusData = {
          course_id: Number(programId),
          subject_id: String(subjectId),
          subject_name: subjectName || "Subject",
          units: unitsToDisplay,
        };

        setFullSyllabus(effectiveSyllabusData);
        const initialExp: Record<string, boolean> = {};
        unitsToDisplay.forEach((u: UnitNode) => {
          initialExp[u.id] = true;
        });
        setExpandedUnits(initialExp);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Error fetching syllabus:", err);
          const fallbackUnits = generateDefaultSyllabusForSubject(subjectId, subjectName || "Subject");
          setFullSyllabus({
            course_id: Number(programId),
            subject_id: String(subjectId),
            subject_name: subjectName || "Subject",
            units: fallbackUnits,
          });
          const initialExp: Record<string, boolean> = {};
          fallbackUnits.forEach((u: UnitNode) => {
            initialExp[u.id] = true;
          });
          setExpandedUnits(initialExp);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSyllabus(false);
      });

    return () => {
      cancelled = true;
    };
  }, [programId, subjectId, subjectName, accessToken]);

  const isUnitSelected = (unitId: string) => {
    return selectedUnits.some((u) => u.id === unitId);
  };

  const isChapterSelected = (unitId: string, chapterId: string) => {
    const unit = selectedUnits.find((u) => u.id === unitId);
    if (!unit) return false;
    return unit.chapters.some((c) => c.id === chapterId);
  };

  const toggleUnit = (unit: UnitNode) => {
    if (isUnitSelected(unit.id)) {
      setSelectedUnits((prev) => prev.filter((u) => u.id !== unit.id));
    } else {
      setSelectedUnits((prev) => [...prev, { ...unit, chapters: [...unit.chapters] }]);
    }
  };

  const toggleChapter = (unit: UnitNode, chapter: ChapterNode) => {
    setSelectedUnits((prev) => {
      const existingUnit = prev.find((u) => u.id === unit.id);
      if (!existingUnit) {
        return [...prev, { ...unit, chapters: [chapter] }];
      }
      const hasChapter = existingUnit.chapters.some((c) => c.id === chapter.id);
      if (hasChapter) {
        const nextChapters = existingUnit.chapters.filter((c) => c.id !== chapter.id);
        if (nextChapters.length === 0) {
          return prev.filter((u) => u.id !== unit.id);
        }
        return prev.map((u) =>
          u.id === unit.id ? { ...u, chapters: nextChapters } : u
        );
      } else {
        return prev.map((u) =>
          u.id === unit.id ? { ...u, chapters: [...u.chapters, chapter] } : u
        );
      }
    });
  };

  const selectAllSyllabus = () => {
    if (!fullSyllabus?.units) return;
    setSelectedUnits(fullSyllabus.units.map((u) => ({ ...u, chapters: [...u.chapters] })));
  };

  const deselectAllSyllabus = () => {
    setSelectedUnits([]);
  };

  const isPlatformAdmin = isPlatformAdminUser(user);

  const fetchPrograms = async (query: string, page = 1) => {
    if (!accessToken) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      search: query,
      page: String(page),
      limit: "30",
    });

    if (isPlatformAdmin) {
      const res = await fetch(`/api/admin/content/courses?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJson(res);
      if (!res.ok) return { data: [], hasMore: false };
      return {
        data: ((json.data ?? []) as Array<{ id: number; name?: string; title?: string }>).map((item) => ({
          id: item.id,
          title: item.name || item.title || `Course #${item.id}`,
        })),
        hasMore: false,
      };
    }

    if (effectiveInstitutionId) {
      params.set("institutionId", String(effectiveInstitutionId));
    }
    const res = await fetch(`/api/admin/institutions/programs?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await readJson(res);
    if (!res.ok) return { data: [], hasMore: false };
    return {
      data: ((json.data ?? []) as Array<{ id: number; title?: string; name?: string }>).map((item) => ({
        id: item.id,
        title: item.title || item.name || `Program #${item.id}`,
      })),
      hasMore: false,
    };
  };

  const validateBasic = () => {
    if (!programId) {
      toast.error("Course / Program is required");
      return false;
    }
    return true;
  };

  async function save() {
    if (!validateBasic()) return;
    if (!accessToken) return;

    setSaving(true);
    try {
      const instIdNum = Number(effectiveInstitutionId) || 1;
      const targetIdVal = programId ? Number(programId) : instIdNum;
      const targetTypeVal = programId ? "PROGRAM" : "INSTITUTION";

      const finalTitle =
        (title || "").trim() ||
        (subjectName ? `${subjectName} Notes` : `${programTitle || "Course"} Notes`);

      const payload = {
        title: finalTitle,
        description: description.trim() || null,
        institution_id: instIdNum,
        source_institution_id: instIdNum,
        target_type: targetTypeVal,
        target_id: targetIdVal,
        target_program_id: programId ? Number(programId) : null,
        subject_id: subjectId || null,
        subject_name: subjectName || null,
        syllabus_data: selectedUnits,
        ai_question_format: {
          enabled: aiQuestionFormat.enabled,
          true_false: Number(aiQuestionFormat.true_false) || 0,
          objective: Number(aiQuestionFormat.multiple_choice) || 0,
          subjective: Number(aiQuestionFormat.subjective) || 0,
        },
        is_public: isPlatformAdmin ? true : isPublic,
        is_active: isActive,
        is_paid: isPaid,
        price: isPaid ? Math.max(0, Number(price) || 0) : 0,
      };

      const endpoint = template
        ? `/api/admin/master-data/notes/${template.id}`
        : `/api/admin/master-data/notes`;
      const method = template ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to save note");

      toast.success(template ? "Note updated" : "Note created");
      onOpenChange(false);
      onSaved(template ? template.id : json.data?.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  const activeTabIndex = WIZARD_TABS.findIndex((t) => t.value === activeTab);
  const isLastStep = activeTabIndex === WIZARD_TABS.length - 1;

  const goNext = () => {
    if (activeTab === "basic" && !validateBasic()) return;
    if (activeTabIndex < WIZARD_TABS.length - 1) {
      setActiveTab(WIZARD_TABS[activeTabIndex + 1].value);
    }
  };

  const goPrevious = () => {
    if (activeTabIndex > 0) {
      setActiveTab(WIZARD_TABS[activeTabIndex - 1].value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl md:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4" />
            </span>
            {template ? `Edit Note: ${template.title}` : "Create New Note"}
          </DialogTitle>
          <DialogDescription>
            Configure note details, syllabus mapping, and AI Q&A generation settings.
          </DialogDescription>
        </DialogHeader>

        {/* Wizard Steps Header */}
        <div className="flex items-center gap-2 border-b pb-3 pt-1">
          {WIZARD_TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.value;
            const isCompleted = activeTabIndex > idx;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
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

        {/* Tab Content Area */}
        <div className="space-y-4 py-2">
          {/* TAB 1: BASIC DETAILS */}
          {activeTab === "basic" && (
            <div className="space-y-4">
              {/* Top Row: Course / Program & Subject parallel */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <RequiredLabel>Course / Program</RequiredLabel>
                  <AsyncSearchPopover<NoteProgramOption>
                    value={programId}
                    selectedLabel={programTitle}
                    onChange={(val) => {
                      setProgramId(val);
                      setSubjectId("");
                      setSubjectName("");
                      setSelectedUnits([]);
                    }}
                    onSelectItem={(prog) => setProgramTitle(prog.title ?? prog.name ?? "")}
                    fetcher={fetchPrograms}
                    getValue={(prog) => String(prog.id)}
                    getLabel={(prog) => prog.title ?? prog.name ?? ""}
                    placeholder="Select Course / Program..."
                    searchPlaceholder="Search courses..."
                    emptyText="No courses found"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Course Subject</Label>
                    <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
                      Optional
                    </Badge>
                  </div>
                  <Select
                    value={subjectId}
                    onValueChange={(val) => {
                      setSubjectId(val);
                      const sub = subjects.find((s) => String(s.id) === val);
                      if (sub?.name) setSubjectName(sub.name);
                      setSelectedUnits([]);
                    }}
                    disabled={!programId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          !programId
                            ? "Select Course first..."
                            : loadingSubjects
                            ? "Loading subjects..."
                            : "Select Subject..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((sub) => (
                        <SelectItem key={sub.id} value={String(sub.id)}>
                          {sub.name} {sub.code ? `(${sub.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description / Instructions (Optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional summary or reading instructions for students..."
                  rows={2}
                  className="min-h-[60px]"
                />
              </div>

              {/* Pricing */}
              <div className="pt-2 border-t">
                <ContentPricingOption
                  isPaid={isPaid}
                  price={price}
                  onIsPaidChange={setIsPaid}
                  onPriceChange={(val) => setPrice(String(val))}
                />
              </div>
            </div>
          )}

          {/* TAB 2: SYLLABUS MAPPING */}
          {activeTab === "syllabus" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 rounded-lg border bg-muted/20 p-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Course / Program</span>
                  <p className="text-sm font-semibold truncate">{programTitle || "Not selected"}</p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Subject</span>
                  <p className="text-sm font-semibold truncate">{subjectName || "Not selected"}</p>
                </div>
              </div>

              {!programId || !subjectId ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                  <BookOpen className="size-7 mx-auto mb-2 text-muted-foreground/60" />
                  <p className="font-medium text-sm">Optional Syllabus Mapping</p>
                  <p className="text-xs mt-1 max-w-md mx-auto text-muted-foreground/80">
                    Select a Course and Subject above to map specific chapters and units to this note, or proceed without mapping.
                  </p>
                </div>
              ) : loadingSyllabus ? (
                <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Loading syllabus units...
                </div>
              ) : !fullSyllabus || fullSyllabus.units.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
                  No syllabus units found for <strong>{subjectName}</strong>. You can still proceed without unit mapping.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold">Map Units & Chapters</h4>
                      <p className="text-xs text-muted-foreground">
                        Select which units/chapters these notes cover.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={selectAllSyllabus}>
                        Select All
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={deselectAllSyllabus}>
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto rounded-lg border p-3">
                    {fullSyllabus.units.map((unit) => {
                      const unitSelected = isUnitSelected(unit.id);
                      const isExpanded = Boolean(expandedUnits[unit.id]);
                      return (
                        <div key={unit.id} className="rounded-md border bg-card overflow-hidden">
                          <div className="flex items-center justify-between p-3 bg-muted/30">
                            <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                              <Checkbox
                                checked={unitSelected}
                                onCheckedChange={() => toggleUnit(unit)}
                              />
                              <span>
                                {unit.unit_number ? `Unit ${unit.unit_number}: ` : ""}
                                {unit.title}
                              </span>
                            </label>
                            {unit.chapters && unit.chapters.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedUnits((prev) => ({
                                    ...prev,
                                    [unit.id]: !prev[unit.id],
                                  }))
                                }
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                              >
                                <span>{unit.chapters.length} chapters</span>
                                {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                              </button>
                            )}
                          </div>

                          {isExpanded && unit.chapters && unit.chapters.length > 0 && (
                            <div className="p-3 pl-8 space-y-2 border-t bg-background/50">
                              {unit.chapters.map((ch) => {
                                const chSelected = isChapterSelected(unit.id, ch.id);
                                return (
                                  <label key={ch.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                    <Checkbox
                                      checked={chSelected}
                                      onCheckedChange={() => toggleChapter(unit, ch)}
                                    />
                                    <span>
                                      {ch.chapter_number ? `Ch ${ch.chapter_number}: ` : ""}
                                      {ch.title}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AI GENERATION FORMAT */}
          {activeTab === "questions" && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">AI Q&A Generation Preset</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Enable AI to automatically generate comprehensive practice questions complete with answers and explanations tailored to {subjectName || "the chosen subject"}.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer pt-2">
                  <Checkbox
                    checked={aiQuestionFormat.enabled}
                    onCheckedChange={(val) =>
                      setAiQuestionFormat((prev) => ({
                        ...prev,
                        enabled: Boolean(val),
                      }))
                    }
                  />
                  Enable AI Q&A generation format
                </label>

                {aiQuestionFormat.enabled && (
                  <div className="grid gap-4 sm:grid-cols-3 border-t pt-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">True / False Entries</Label>
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
                      <Label className="text-xs">Multiple Choice Entries</Label>
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
                      <Label className="text-xs">Subjective / Theory Q&A</Label>
                      <Input
                        type="number"
                        min="0"
                        value={aiQuestionFormat.subjective}
                        onChange={(e) =>
                          setAiQuestionFormat((prev) => ({
                            ...prev,
                            subjective: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 sm:justify-between border-t pt-4 mt-2">
          <div className="flex flex-1 justify-start">
            {activeTabIndex > 0 && (
              <Button type="button" variant="outline" onClick={goPrevious} disabled={saving}>
                Back
              </Button>
            )}
          </div>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          {isLastStep ? (
            <Button type="button" onClick={() => void save()} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {template ? "Save Changes" : "Create Note"}
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

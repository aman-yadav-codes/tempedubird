"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  BookOpen,
  FolderTree,
  Plus,
  Trash2,
  Edit2,
  Save,
  Check,
  ChevronRight,
  ChevronDown,
  Layers,
  FileText,
  Clock,
  Search,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookMarked,
} from "lucide-react";
import { useAuthStore } from "@/store";
import { MasterCourse } from "@/lib/types/content-course";

export interface LessonNode {
  id: string;
  lesson_number?: string | number;
  title: string;
  description?: string;
  duration_mins?: number | string;
  learning_outcomes?: string;
}

export interface ChapterNode {
  id: string;
  chapter_number?: string | number;
  title: string;
  description?: string;
  estimated_hours?: number | string;
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
  term_name?: string | null;
  term_number?: number | null;
  units: UnitNode[];
  updated_at?: string;
}

interface CourseSyllabusDialogProps {
  course: MasterCourse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CourseSyllabusDialog({
  course,
  open,
  onOpenChange,
}: CourseSyllabusDialogProps) {
  const { accessToken } = useAuthStore();
  const authHeader: Record<string, string> = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [syllabusMap, setSyllabusMap] = useState<Record<string, UnitNode[]>>({});
  const [activeSubjectId, setActiveSubjectId] = useState<string>("");
  const [subjectSearch, setSubjectSearch] = useState<string>("");
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>("all");

  // Collapse states for tree view: unitId -> boolean, chapterId -> boolean
  const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});

  // Quick form inputs
  const [addingUnitForSubject, setAddingUnitForSubject] = useState<boolean>(false);
  const [newUnitTitle, setNewUnitTitle] = useState<string>("");
  const [newUnitDesc, setNewUnitDesc] = useState<string>("");

  const [addingChapterForUnitId, setAddingChapterForUnitId] = useState<string | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState<string>("");
  const [newChapterDesc, setNewChapterDesc] = useState<string>("");
  const [newChapterHours, setNewChapterHours] = useState<string>("");

  const [addingLessonForChapterId, setAddingLessonForChapterId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState<string>("");
  const [newLessonMins, setNewLessonMins] = useState<string>("");
  const [newLessonOutcomes, setNewLessonOutcomes] = useState<string>("");

  // Editing modal/inline states
  const [editingNode, setEditingNode] = useState<{
    type: "unit" | "chapter" | "lesson";
    unitId?: string;
    chapterId?: string;
    lessonId?: string;
    title: string;
    description?: string;
    hoursOrMins?: string;
  } | null>(null);

  // Normalize subjects list from course
  const subjects = useMemo(() => {
    if (!course) return [];
    if (Array.isArray(course.subjects) && course.subjects.length > 0) {
      return course.subjects.map((s, idx) => ({
        id: String(s.id || `custom-${idx + 1}`),
        name: s.name,
        code: s.code || "",
        term_type: s.term_type || "semester",
        term_number: s.term_number || 1,
        term_name: s.term_name || `Term ${s.term_number || 1}`,
      }));
    }
    return [];
  }, [course]);

  // Available Terms
  const availableTerms = useMemo(() => {
    const termMap = new Map<number, { key: string; label: string; term_number: number }>();
    subjects.forEach((s) => {
      const num = s.term_number || 1;
      if (!termMap.has(num)) {
        termMap.set(num, {
          key: `term-${num}`,
          label: s.term_name || `Term ${num}`,
          term_number: num,
        });
      }
    });
    return Array.from(termMap.values()).sort((a, b) => a.term_number - b.term_number);
  }, [subjects]);

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchSearch =
        !subjectSearch.trim() ||
        s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
        (s.code && s.code.toLowerCase().includes(subjectSearch.toLowerCase()));
      const matchTerm =
        selectedTermFilter === "all" || `term-${s.term_number}` === selectedTermFilter;
      return matchSearch && matchTerm;
    });
  }, [subjects, subjectSearch, selectedTermFilter]);

  // Active Subject object
  const activeSubject = useMemo(() => {
    return subjects.find((s) => s.id === activeSubjectId) || subjects[0] || null;
  }, [subjects, activeSubjectId]);

  // Current active units
  const currentUnits: UnitNode[] = useMemo(() => {
    if (!activeSubject) return [];
    return syllabusMap[activeSubject.id] || [];
  }, [syllabusMap, activeSubject]);

  // Fetch saved syllabi for course
  const fetchCourseSyllabus = useCallback(async () => {
    if (!course?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/content/courses/${course.id}/syllabus`, {
        headers: authHeader,
      });
      if (res.ok) {
        const json = await res.json();
        const records: SubjectSyllabusData[] = json.data || [];
        const newMap: Record<string, UnitNode[]> = {};
        records.forEach((r) => {
          newMap[r.subject_id] = Array.isArray(r.units) ? r.units : [];
        });
        setSyllabusMap(newMap);
      } else {
        toast.error("Failed to load course syllabus records");
      }
    } catch {
      toast.error("Network error loading syllabus");
    } finally {
      setLoading(false);
    }
  }, [course?.id, accessToken]);

  useEffect(() => {
    if (open && course?.id) {
      fetchCourseSyllabus();
      if (subjects.length > 0 && !activeSubjectId) {
        setActiveSubjectId(subjects[0].id);
      }
    }
  }, [open, course?.id, subjects]);

  // Total stats computed across all subjects
  const overallStats = useMemo(() => {
    let totalUnits = 0;
    let totalChapters = 0;
    let totalLessons = 0;
    Object.values(syllabusMap).forEach((units) => {
      totalUnits += units.length;
      units.forEach((u) => {
        totalChapters += (u.chapters || []).length;
        u.chapters?.forEach((c) => {
          totalLessons += (c.lessons || []).length;
        });
      });
    });
    return {
      totalSubjects: subjects.length,
      configuredSubjects: Object.keys(syllabusMap).filter((k) => syllabusMap[k]?.length > 0).length,
      totalUnits,
      totalChapters,
      totalLessons,
    };
  }, [syllabusMap, subjects]);

  // Helper to update active subject units
  const updateActiveUnits = (newUnits: UnitNode[]) => {
    if (!activeSubject) return;
    setSyllabusMap((prev) => ({
      ...prev,
      [activeSubject.id]: newUnits,
    }));
  };

  // Unit Operations
  const handleAddUnit = () => {
    if (!newUnitTitle.trim() || !activeSubject) return;
    
    // Duplicate Unit Name Check
    if (currentUnits.some((u) => u.title.trim().toLowerCase() === newUnitTitle.trim().toLowerCase())) {
      return toast.error(`A unit named "${newUnitTitle.trim()}" already exists in this subject. Unit titles must be unique.`);
    }

    const newUnit: UnitNode = {
      id: `unit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      unit_number: currentUnits.length + 1,
      title: newUnitTitle.trim(),
      description: newUnitDesc.trim() || undefined,
      chapters: [],
    };
    updateActiveUnits([...currentUnits, newUnit]);
    setNewUnitTitle("");
    setNewUnitDesc("");
    setAddingUnitForSubject(false);
    toast.success(`Unit added: ${newUnit.title}`);
  };

  const handleDeleteUnit = (unitId: string) => {
    const updated = currentUnits
      .filter((u) => u.id !== unitId)
      .map((u, i) => ({ ...u, unit_number: i + 1 }));
    updateActiveUnits(updated);
    toast.info("Unit removed");
  };

  const handleMoveUnit = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === currentUnits.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const list = [...currentUnits];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);
    updateActiveUnits(list.map((u, i) => ({ ...u, unit_number: i + 1 })));
  };

  // Chapter Operations
  const handleAddChapter = (unitId: string) => {
    if (!newChapterTitle.trim()) return;

    // Duplicate Chapter Name Check
    const targetUnit = currentUnits.find((u) => u.id === unitId);
    if (
      targetUnit &&
      targetUnit.chapters?.some(
        (c) => c.title.trim().toLowerCase() === newChapterTitle.trim().toLowerCase()
      )
    ) {
      return toast.error(`A chapter named "${newChapterTitle.trim()}" already exists in this unit.`);
    }

    const updated = currentUnits.map((u) => {
      if (u.id === unitId) {
        const chapters = u.chapters || [];
        const newChap: ChapterNode = {
          id: `chap-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          chapter_number: `${u.unit_number}.${chapters.length + 1}`,
          title: newChapterTitle.trim(),
          description: newChapterDesc.trim() || undefined,
          estimated_hours: newChapterHours.trim() || undefined,
          lessons: [],
        };
        return {
          ...u,
          chapters: [...chapters, newChap],
        };
      }
      return u;
    });
    updateActiveUnits(updated);
    setNewChapterTitle("");
    setNewChapterDesc("");
    setNewChapterHours("");
    setAddingChapterForUnitId(null);
    toast.success("Chapter added");
  };

  const handleDeleteChapter = (unitId: string, chapterId: string) => {
    const updated = currentUnits.map((u) => {
      if (u.id === unitId) {
        const chapters = (u.chapters || [])
          .filter((c) => c.id !== chapterId)
          .map((c, i) => ({ ...c, chapter_number: `${u.unit_number}.${i + 1}` }));
        return { ...u, chapters };
      }
      return u;
    });
    updateActiveUnits(updated);
    toast.info("Chapter removed");
  };

  const handleMoveChapter = (unitId: string, index: number, direction: "up" | "down") => {
    const updated = currentUnits.map((u) => {
      if (u.id === unitId) {
        const list = [...(u.chapters || [])];
        if (
          (direction === "up" && index === 0) ||
          (direction === "down" && index === list.length - 1)
        ) {
          return u;
        }
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        const [moved] = list.splice(index, 1);
        list.splice(targetIndex, 0, moved);
        return {
          ...u,
          chapters: list.map((c, i) => ({ ...c, chapter_number: `${u.unit_number}.${i + 1}` })),
        };
      }
      return u;
    });
    updateActiveUnits(updated);
  };

  // Lesson Operations
  const handleAddLesson = (unitId: string, chapterId: string) => {
    if (!newLessonTitle.trim()) return;

    // Duplicate Lesson Name Check
    const targetUnit = currentUnits.find((u) => u.id === unitId);
    const targetChapter = targetUnit?.chapters?.find((c) => c.id === chapterId);
    if (
      targetChapter &&
      targetChapter.lessons?.some(
        (l) => l.title.trim().toLowerCase() === newLessonTitle.trim().toLowerCase()
      )
    ) {
      return toast.error(`A lesson named "${newLessonTitle.trim()}" already exists in this chapter.`);
    }

    const updated = currentUnits.map((u) => {
      if (u.id === unitId) {
        const chapters = (u.chapters || []).map((c) => {
          if (c.id === chapterId) {
            const lessons = c.lessons || [];
            const newLes: LessonNode = {
              id: `les-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              lesson_number: `${c.chapter_number}.${lessons.length + 1}`,
              title: newLessonTitle.trim(),
              duration_mins: newLessonMins.trim() || undefined,
              learning_outcomes: newLessonOutcomes.trim() || undefined,
            };
            return {
              ...c,
              lessons: [...lessons, newLes],
            };
          }
          return c;
        });
        return { ...u, chapters };
      }
      return u;
    });
    updateActiveUnits(updated);
    setNewLessonTitle("");
    setNewLessonMins("");
    setNewLessonOutcomes("");
    setAddingLessonForChapterId(null);
    toast.success("Lesson added");
  };

  const handleDeleteLesson = (unitId: string, chapterId: string, lessonId: string) => {
    const updated = currentUnits.map((u) => {
      if (u.id === unitId) {
        const chapters = (u.chapters || []).map((c) => {
          if (c.id === chapterId) {
            const lessons = (c.lessons || [])
              .filter((l) => l.id !== lessonId)
              .map((l, i) => ({ ...l, lesson_number: `${c.chapter_number}.${i + 1}` }));
            return { ...c, lessons };
          }
          return c;
        });
        return { ...u, chapters };
      }
      return u;
    });
    updateActiveUnits(updated);
    toast.info("Lesson removed");
  };

  // Save Syllabus to DB
  const handleSaveActiveSubject = async () => {
    if (!course || !activeSubject) return;
    setSaving(true);
    try {
      const payload = {
        subjectId: activeSubject.id,
        subjectName: activeSubject.name,
        subjectCode: activeSubject.code || null,
        termName: activeSubject.term_name || null,
        termNumber: activeSubject.term_number || null,
        units: currentUnits,
      };

      const res = await fetch(`/api/admin/content/courses/${course.id}/syllabus`, {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(`Syllabus saved for ${activeSubject.name}!`);
        await fetchCourseSyllabus();
      } else {
        toast.error(json.error || "Failed to save syllabus");
      }
    } catch {
      toast.error("Network error while saving");
    } finally {
      setSaving(false);
    }
  };

  // Save all subjects
  const handleSaveAllSubjects = async () => {
    if (!course) return;
    setSaving(true);
    let successCount = 0;
    try {
      for (const subj of subjects) {
        const units = syllabusMap[subj.id] || [];
        const payload = {
          subjectId: subj.id,
          subjectName: subj.name,
          subjectCode: subj.code || null,
          termName: subj.term_name || null,
          termNumber: subj.term_number || null,
          units: units,
        };
        const res = await fetch(`/api/admin/content/courses/${course.id}/syllabus`, {
          method: "POST",
          headers: {
            ...authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) successCount++;
      }
      toast.success(`Saved syllabus for ${successCount} subject(s)!`);
      await fetchCourseSyllabus();
    } catch {
      toast.error("Error saving syllabus records");
    } finally {
      setSaving(false);
    }
  };

  // Edit Node Form Save
  const handleSaveNodeEdit = () => {
    if (!editingNode || !editingNode.title.trim()) return;

    if (editingNode.type === "unit" && editingNode.unitId) {
      if (
        currentUnits.some(
          (u) =>
            u.id !== editingNode.unitId &&
            u.title.trim().toLowerCase() === editingNode.title.trim().toLowerCase()
        )
      ) {
        return toast.error(`A unit named "${editingNode.title.trim()}" already exists in this subject.`);
      }

      updateActiveUnits(
        currentUnits.map((u) =>
          u.id === editingNode.unitId
            ? { ...u, title: editingNode.title.trim(), description: editingNode.description?.trim() }
            : u
        )
      );
    } else if (editingNode.type === "chapter" && editingNode.unitId && editingNode.chapterId) {
      const targetUnit = currentUnits.find((u) => u.id === editingNode.unitId);
      if (
        targetUnit?.chapters?.some(
          (c) =>
            c.id !== editingNode.chapterId &&
            c.title.trim().toLowerCase() === editingNode.title.trim().toLowerCase()
        )
      ) {
        return toast.error(`A chapter named "${editingNode.title.trim()}" already exists in this unit.`);
      }

      updateActiveUnits(
        currentUnits.map((u) => {
          if (u.id === editingNode.unitId) {
            return {
              ...u,
              chapters: (u.chapters || []).map((c) =>
                c.id === editingNode.chapterId
                  ? {
                      ...c,
                      title: editingNode.title.trim(),
                      description: editingNode.description?.trim(),
                      estimated_hours: editingNode.hoursOrMins?.trim(),
                    }
                  : c
              ),
            };
          }
          return u;
        })
      );
    } else if (
      editingNode.type === "lesson" &&
      editingNode.unitId &&
      editingNode.chapterId &&
      editingNode.lessonId
    ) {
      const targetUnit = currentUnits.find((u) => u.id === editingNode.unitId);
      const targetChap = targetUnit?.chapters?.find((c) => c.id === editingNode.chapterId);
      if (
        targetChap?.lessons?.some(
          (l) =>
            l.id !== editingNode.lessonId &&
            l.title.trim().toLowerCase() === editingNode.title.trim().toLowerCase()
        )
      ) {
        return toast.error(`A lesson named "${editingNode.title.trim()}" already exists in this chapter.`);
      }

      updateActiveUnits(
        currentUnits.map((u) => {
          if (u.id === editingNode.unitId) {
            return {
              ...u,
              chapters: (u.chapters || []).map((c) => {
                if (c.id === editingNode.chapterId) {
                  return {
                    ...c,
                    lessons: (c.lessons || []).map((l) =>
                      l.id === editingNode.lessonId
                        ? {
                            ...l,
                            title: editingNode.title.trim(),
                            duration_mins: editingNode.hoursOrMins?.trim(),
                            learning_outcomes: editingNode.description?.trim(),
                          }
                        : l
                    ),
                  };
                }
                return c;
              }),
            };
          }
          return u;
        })
      );
    }

    setEditingNode(null);
    toast.success("Updated successfully");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[96vw] md:max-w-6xl lg:max-w-7xl w-[96vw] h-[88vh] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-border/80">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-muted/40 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0 border border-primary/20 shadow-xs">
              {course?.icon_url ? (
                course.icon_url.startsWith("http") || course.icon_url.startsWith("/") ? (
                  <img src={course.icon_url} alt="" className="h-full w-full object-cover rounded-2xl" />
                ) : (
                  <span>{course.icon_url}</span>
                )
              ) : (
                <GraduationCap className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg font-bold text-foreground">
                  Course Syllabus Management
                </DialogTitle>
                <Badge variant="outline" className="text-xs bg-background/80 font-medium">
                  {course?.name}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Configure Unit, Chapter, and Lesson curriculum structures individually per subject.
              </DialogDescription>
            </div>
          </div>

          {/* Top Quick Stats */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border text-foreground font-semibold shadow-2xs">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>{overallStats.totalSubjects} Subjects</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border text-foreground font-semibold shadow-2xs">
              <FolderTree className="h-3.5 w-3.5 text-indigo-500" />
              <span>{overallStats.totalUnits} Units</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border text-foreground font-semibold shadow-2xs">
              <Layers className="h-3.5 w-3.5 text-amber-500" />
              <span>{overallStats.totalChapters} Chapters</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border text-foreground font-semibold shadow-2xs">
              <FileText className="h-3.5 w-3.5 text-emerald-500" />
              <span>{overallStats.totalLessons} Lessons</span>
            </div>
          </div>
        </div>

        {/* Main Body (2 Columns) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0 bg-background">
          {/* Left Column: Subject Selector List (4 cols) */}
          <div className="md:col-span-4 border-r border-border/80 flex flex-col h-full bg-muted/10">
            {/* Search & Term Filters */}
            <div className="p-3.5 border-b border-border/80 space-y-2.5 bg-background">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter course subjects..."
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-muted/30"
                />
              </div>

              {availableTerms.length > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTermFilter("all")}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all whitespace-nowrap ${
                      selectedTermFilter === "all"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Terms ({subjects.length})
                  </button>
                  {availableTerms.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setSelectedTermFilter(t.key)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all whitespace-nowrap ${
                        selectedTermFilter === t.key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subjects List Scroll */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-xs gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Loading curriculum subjects...</span>
                </div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-10 px-4 text-muted-foreground space-y-2">
                  <AlertCircle className="h-8 w-8 mx-auto text-amber-500/70" />
                  <p className="text-xs font-semibold text-foreground">No subjects added to this course yet.</p>
                  <p className="text-[11px]">
                    Please edit the course first to add curriculum subjects.
                  </p>
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No subjects match &quot;{subjectSearch}&quot;
                </div>
              ) : (
                filteredSubjects.map((subj) => {
                  const isSelected = activeSubject?.id === subj.id;
                  const unitList = syllabusMap[subj.id] || [];
                  const chapCount = unitList.reduce((acc, u) => acc + (u.chapters?.length || 0), 0);
                  const lesCount = unitList.reduce(
                    (acc, u) =>
                      acc + (u.chapters?.reduce((cAcc, c) => cAcc + (c.lessons?.length || 0), 0) || 0),
                    0
                  );

                  return (
                    <div
                      key={subj.id}
                      onClick={() => setActiveSubjectId(subj.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-xs"
                          : "bg-background hover:bg-muted/50 border-border/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className={`text-xs font-bold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {subj.name}
                          </h4>
                          {subj.code && (
                            <span className="text-[10px] font-mono text-muted-foreground block">
                              Code: {subj.code}
                            </span>
                          )}
                        </div>
                        {subj.term_name && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 bg-muted/40">
                            {subj.term_name}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        {unitList.length > 0 ? (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {unitList.length} Units • {chapCount} Ch • {lesCount} Les
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/70 italic">
                            No syllabus configured
                          </span>
                        )}
                        <ChevronRight className={`h-3.5 w-3.5 ${isSelected ? "text-primary" : "text-muted-foreground/40"}`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Save All Shortcut */}
            <div className="p-3 border-t border-border/80 bg-background">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveAllSubjects}
                disabled={saving || loading || subjects.length === 0}
                className="w-full text-xs font-semibold gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 text-primary" />}
                Save All Subjects Syllabi
              </Button>
            </div>
          </div>

          {/* Right Column: Syllabus Hierarchy Editor (8 cols) */}
          <div className="md:col-span-8 flex flex-col h-full min-h-0 bg-background">
            {activeSubject ? (
              <>
                {/* Active Subject Bar */}
                <div className="p-4 border-b border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <BookMarked className="h-4 w-4 text-primary" />
                        {activeSubject.name}
                      </h3>
                      {activeSubject.code && (
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {activeSubject.code}
                        </Badge>
                      )}
                      {activeSubject.term_name && (
                        <Badge variant="outline" className="text-[10px] bg-background">
                          {activeSubject.term_name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Subject ID: <code className="font-mono">{activeSubject.id}</code> • {currentUnits.length} Units defined
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setAddingUnitForSubject(true)}
                      className="h-8 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Unit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveActiveSubject}
                      disabled={saving}
                      className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save Subject
                    </Button>
                  </div>
                </div>

                {/* Units, Chapters, Lessons Scrollable View */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {/* Inline Add Unit Form */}
                  {addingUnitForSubject && (
                    <Card className="border-2 border-primary/40 bg-primary/5 shadow-sm rounded-2xl animate-in fade-in duration-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                            <Plus className="h-3.5 w-3.5" /> Add New Unit (Unit {currentUnits.length + 1})
                          </Label>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => setAddingUnitForSubject(false)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Unit Title (e.g. Mechanics & Laws of Motion, Linear Algebra...)"
                          value={newUnitTitle}
                          onChange={(e) => setNewUnitTitle(e.target.value)}
                          className="h-8 text-xs bg-background"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddUnit();
                          }}
                        />
                        <Textarea
                          placeholder="Optional unit description / learning objectives..."
                          value={newUnitDesc}
                          onChange={(e) => setNewUnitDesc(e.target.value)}
                          rows={2}
                          className="text-xs bg-background"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setAddingUnitForSubject(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs bg-primary text-primary-foreground font-semibold"
                            onClick={handleAddUnit}
                            disabled={!newUnitTitle.trim()}
                          >
                            Add Unit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Empty State */}
                  {currentUnits.length === 0 && !addingUnitForSubject && (
                    <div className="border border-dashed border-border/80 rounded-2xl p-10 text-center space-y-3 bg-muted/10">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <FolderTree className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground">No syllabus units yet for {activeSubject.name}</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          Start adding units, chapters, and lessons to build out the full structured curriculum.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setAddingUnitForSubject(true)}
                        className="bg-primary text-primary-foreground font-semibold text-xs gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add First Unit
                      </Button>
                    </div>
                  )}

                  {/* Render Unit Cards */}
                  {currentUnits.map((unit, unitIdx) => {
                    const isUnitCollapsed = !!collapsedUnits[unit.id];
                    const chapters = unit.chapters || [];

                    return (
                      <div
                        key={unit.id}
                        className="border border-border/80 rounded-2xl bg-card shadow-2xs overflow-hidden transition-all hover:border-primary/30"
                      >
                        {/* Unit Header */}
                        <div className="p-3 bg-muted/30 border-b border-border/60 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedUnits((prev) => ({
                                  ...prev,
                                  [unit.id]: !prev[unit.id],
                                }))
                              }
                              className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              {isUnitCollapsed ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>

                            <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0">
                              Unit {unit.unit_number || unitIdx + 1}
                            </Badge>

                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-xs text-foreground block truncate">
                                {unit.title}
                              </span>
                              {unit.description && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {unit.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Unit Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              title="Move Unit Up"
                              disabled={unitIdx === 0}
                              onClick={() => handleMoveUnit(unitIdx, "up")}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              title="Move Unit Down"
                              disabled={unitIdx === currentUnits.length - 1}
                              onClick={() => handleMoveUnit(unitIdx, "down")}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] font-semibold gap-1 px-2 border-primary/30 text-primary hover:bg-primary/10"
                              onClick={() => setAddingChapterForUnitId(unit.id)}
                            >
                              <Plus className="h-3 w-3" /> Add Chapter
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Edit Unit"
                              onClick={() =>
                                setEditingNode({
                                  type: "unit",
                                  unitId: unit.id,
                                  title: unit.title,
                                  description: unit.description,
                                })
                              }
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Delete Unit"
                              onClick={() => handleDeleteUnit(unit.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Unit Body (Chapters) */}
                        {!isUnitCollapsed && (
                          <div className="p-3.5 space-y-2.5 bg-background/50">
                            {/* Inline Add Chapter Form */}
                            {addingChapterForUnitId === unit.id && (
                              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2.5 animate-in fade-in duration-200 ml-4">
                                <div className="flex items-center justify-between">
                                  <Label className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                    <Plus className="h-3 w-3" /> Add Chapter under Unit {unit.unit_number || unitIdx + 1}
                                  </Label>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground"
                                    onClick={() => setAddingChapterForUnitId(null)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                  <Input
                                    placeholder="Chapter Title (e.g. Newton's Laws of Motion)..."
                                    value={newChapterTitle}
                                    onChange={(e) => setNewChapterTitle(e.target.value)}
                                    className="sm:col-span-3 h-8 text-xs bg-background"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleAddChapter(unit.id);
                                    }}
                                  />
                                  <Input
                                    placeholder="Est. Hours (e.g. 6h)"
                                    value={newChapterHours}
                                    onChange={(e) => setNewChapterHours(e.target.value)}
                                    className="h-8 text-xs bg-background"
                                  />
                                </div>
                                <Textarea
                                  placeholder="Optional chapter description / concepts covered..."
                                  value={newChapterDesc}
                                  onChange={(e) => setNewChapterDesc(e.target.value)}
                                  rows={2}
                                  className="text-xs bg-background"
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setAddingChapterForUnitId(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                                    onClick={() => handleAddChapter(unit.id)}
                                    disabled={!newChapterTitle.trim()}
                                  >
                                    Add Chapter
                                  </Button>
                                </div>
                              </div>
                            )}

                            {chapters.length === 0 && addingChapterForUnitId !== unit.id ? (
                              <div className="py-4 text-center border border-dashed rounded-xl text-muted-foreground text-xs ml-4">
                                <span>No chapters in this unit yet. </span>
                                <button
                                  type="button"
                                  onClick={() => setAddingChapterForUnitId(unit.id)}
                                  className="text-primary font-semibold hover:underline ml-1"
                                >
                                  + Add Chapter
                                </button>
                              </div>
                            ) : (
                              chapters.map((chap, chapIdx) => {
                                const isChapCollapsed = !!collapsedChapters[chap.id];
                                const lessons = chap.lessons || [];

                                return (
                                  <div
                                    key={chap.id}
                                    className="ml-3 sm:ml-5 border border-border/70 rounded-xl bg-card overflow-hidden shadow-2xs"
                                  >
                                    {/* Chapter Header */}
                                    <div className="p-2.5 bg-muted/20 border-b border-border/50 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setCollapsedChapters((prev) => ({
                                              ...prev,
                                              [chap.id]: !prev[chap.id],
                                            }))
                                          }
                                          className="p-0.5 rounded text-muted-foreground hover:bg-muted"
                                        >
                                          {isChapCollapsed ? (
                                            <ChevronRight className="h-3.5 w-3.5" />
                                          ) : (
                                            <ChevronDown className="h-3.5 w-3.5" />
                                          )}
                                        </button>

                                        <Badge
                                          variant="secondary"
                                          className="text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0 shrink-0"
                                        >
                                          Ch {chap.chapter_number || `${unit.unit_number || unitIdx + 1}.${chapIdx + 1}`}
                                        </Badge>

                                        <div className="min-w-0 flex-1">
                                          <span className="font-semibold text-xs text-foreground block truncate">
                                            {chap.title}
                                          </span>
                                          {chap.description && (
                                            <p className="text-[10px] text-muted-foreground truncate">
                                              {chap.description}
                                            </p>
                                          )}
                                        </div>

                                        {chap.estimated_hours && (
                                          <Badge variant="outline" className="text-[9px] gap-1 shrink-0 bg-background">
                                            <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                                            {chap.estimated_hours}
                                          </Badge>
                                        )}
                                      </div>

                                      {/* Chapter Actions */}
                                      <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                                          title="Move Chapter Up"
                                          disabled={chapIdx === 0}
                                          onClick={() => handleMoveChapter(unit.id, chapIdx, "up")}
                                        >
                                          <ArrowUp className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                                          title="Move Chapter Down"
                                          disabled={chapIdx === chapters.length - 1}
                                          onClick={() => handleMoveChapter(unit.id, chapIdx, "down")}
                                        >
                                          <ArrowDown className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-6 text-[10px] font-semibold gap-1 px-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                          onClick={() => setAddingLessonForChapterId(chap.id)}
                                        >
                                          <Plus className="h-2.5 w-2.5" /> Add Lesson
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                          title="Edit Chapter"
                                          onClick={() =>
                                            setEditingNode({
                                              type: "chapter",
                                              unitId: unit.id,
                                              chapterId: chap.id,
                                              title: chap.title,
                                              description: chap.description,
                                              hoursOrMins: chap.estimated_hours !== undefined && chap.estimated_hours !== null ? String(chap.estimated_hours) : undefined,
                                            })
                                          }
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                          title="Delete Chapter"
                                          onClick={() => handleDeleteChapter(unit.id, chap.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Chapter Body (Lessons) */}
                                    {!isChapCollapsed && (
                                      <div className="p-2.5 space-y-1.5 bg-background">
                                        {/* Inline Add Lesson Form */}
                                        {addingLessonForChapterId === chap.id && (
                                          <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2 ml-4 animate-in fade-in duration-200">
                                            <div className="flex items-center justify-between">
                                              <Label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <Plus className="h-2.5 w-2.5" /> Add Lesson / Topic
                                              </Label>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-4 text-muted-foreground"
                                                onClick={() => setAddingLessonForChapterId(null)}
                                              >
                                                <X className="h-2.5 w-2.5" />
                                              </Button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                              <Input
                                                placeholder="Lesson Title (e.g. First Law of Motion)..."
                                                value={newLessonTitle}
                                                onChange={(e) => setNewLessonTitle(e.target.value)}
                                                className="sm:col-span-3 h-7 text-xs bg-background"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") handleAddLesson(unit.id, chap.id);
                                                }}
                                              />
                                              <Input
                                                placeholder="Duration (e.g. 45m)"
                                                value={newLessonMins}
                                                onChange={(e) => setNewLessonMins(e.target.value)}
                                                className="h-7 text-xs bg-background"
                                              />
                                            </div>
                                            <Input
                                              placeholder="Key learning outcomes / topics covered..."
                                              value={newLessonOutcomes}
                                              onChange={(e) => setNewLessonOutcomes(e.target.value)}
                                              className="h-7 text-xs bg-background"
                                            />
                                            <div className="flex justify-end gap-2">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-6 text-[11px]"
                                                onClick={() => setAddingLessonForChapterId(null)}
                                              >
                                                Cancel
                                              </Button>
                                              <Button
                                                type="button"
                                                size="sm"
                                                className="h-6 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                                onClick={() => handleAddLesson(unit.id, chap.id)}
                                                disabled={!newLessonTitle.trim()}
                                              >
                                                Add Lesson
                                              </Button>
                                            </div>
                                          </div>
                                        )}

                                        {lessons.length === 0 && addingLessonForChapterId !== chap.id ? (
                                          <div className="py-2 px-3 text-[11px] text-muted-foreground/80 italic ml-4">
                                            No lessons yet.{" "}
                                            <button
                                              type="button"
                                              onClick={() => setAddingLessonForChapterId(chap.id)}
                                              className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                                            >
                                              + Add Lesson
                                            </button>
                                          </div>
                                        ) : (
                                          lessons.map((les) => (
                                            <div
                                              key={les.id}
                                              className="ml-4 p-2 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors"
                                            >
                                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                  <span className="font-medium text-xs text-foreground block truncate">
                                                    {les.title}
                                                  </span>
                                                  {les.learning_outcomes && (
                                                    <p className="text-[10px] text-muted-foreground truncate">
                                                      {les.learning_outcomes}
                                                    </p>
                                                  )}
                                                </div>
                                                {les.duration_mins && (
                                                  <Badge
                                                    variant="secondary"
                                                    className="text-[9px] px-1.5 py-0 shrink-0 font-mono"
                                                  >
                                                    {les.duration_mins}
                                                  </Badge>
                                                )}
                                              </div>

                                              <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                                  title="Edit Lesson"
                                                  onClick={() =>
                                                    setEditingNode({
                                                      type: "lesson",
                                                      unitId: unit.id,
                                                      chapterId: chap.id,
                                                      lessonId: les.id,
                                                      title: les.title,
                                                      description: les.learning_outcomes,
                                                      hoursOrMins: les.duration_mins ? String(les.duration_mins) : undefined,
                                                    })
                                                  }
                                                >
                                                  <Edit2 className="h-2.5 w-2.5" />
                                                </Button>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                                  title="Delete Lesson"
                                                  onClick={() =>
                                                    handleDeleteLesson(unit.id, chap.id, les.id)
                                                  }
                                                >
                                                  <Trash2 className="h-2.5 w-2.5" />
                                                </Button>
                                              </div>
                                            </div>
                                          ))
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
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground space-y-2">
                <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-semibold text-foreground">Select a Subject from the left list</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Choose any course subject to view and edit its units, chapters, and lessons.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-3 bg-muted/40 border-t border-border flex items-center justify-between sm:justify-between w-full shrink-0">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Course ID: #{course?.id}</span>
            <span>•</span>
            <span>{subjects.length} total subjects in curriculum</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold"
            >
              Done / Close
            </Button>
            {activeSubject && (
              <Button
                type="button"
                size="sm"
                onClick={handleSaveActiveSubject}
                disabled={saving}
                className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save {activeSubject.name} Syllabus
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Edit Node Modal (Unit / Chapter / Lesson) */}
      <Dialog open={!!editingNode} onOpenChange={(val) => !val && setEditingNode(null)}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" />
              Edit {editingNode?.type === "unit" ? "Unit" : editingNode?.type === "chapter" ? "Chapter" : "Lesson"}
            </DialogTitle>
          </DialogHeader>

          {editingNode && (
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Title *</Label>
                <Input
                  value={editingNode.title}
                  onChange={(e) => setEditingNode({ ...editingNode, title: e.target.value })}
                  className="h-8 text-xs"
                  autoFocus
                />
              </div>

              {editingNode.type !== "unit" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    {editingNode.type === "chapter" ? "Estimated Hours" : "Duration"}
                  </Label>
                  <Input
                    placeholder={editingNode.type === "chapter" ? "e.g. 5 hours" : "e.g. 45 mins"}
                    value={editingNode.hoursOrMins || ""}
                    onChange={(e) =>
                      setEditingNode({ ...editingNode, hoursOrMins: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  {editingNode.type === "lesson" ? "Learning Outcomes / Topics" : "Description"}
                </Label>
                <Textarea
                  value={editingNode.description || ""}
                  onChange={(e) =>
                    setEditingNode({ ...editingNode, description: e.target.value })
                  }
                  rows={3}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingNode(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveNodeEdit}
                  disabled={!editingNode.title.trim()}
                  className="bg-primary text-primary-foreground font-semibold"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

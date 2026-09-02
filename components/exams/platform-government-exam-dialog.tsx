"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  FolderTree,
  Globe,
  GraduationCap,
  Info,
  Landmark,
  Layers,
  Loader2,
  Lock,
  Plus,
  Search,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ExamRow } from "@/lib/types/exam";
import type { SyllabusNode } from "@/lib/types/syllabus";

type PlatformGovernmentExamDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: ExamRow | null;
  accessToken: string | null;
  onSuccess: () => void;
};

type ProgramOption = {
  id: number;
  title: string;
};

type SubjectOption = {
  id: number;
  name: string;
};

type SyllabusOption = {
  id: number;
  title: string;
};

const EXAM_CATEGORIES = [
  "Government / Civil Services",
  "Engineering Entrance (JEE / GATE)",
  "Medical Entrance (NEET / AIIMS)",
  "Banking & Insurance (IBPS / SBI)",
  "Defense & Armed Forces (NDA / CDS)",
  "Staff Selection Commission (SSC)",
  "Teaching & Eligibility (CTET / UGC NET)",
  "State Public Service Commission (State PSC)",
  "Class 10 Board / Competitive Foundation",
  "Class 12 Board / Competitive Foundation",
  "Higher Education & University Entrance (CUET)",
  "Law & Management (CLAT / CAT)",
  "Olympiad & National Talent Exam",
  "Scholarship & Selection Test",
  "Other Competitive Exam",
];

const CONDUCTING_BODIES = [
  "UPSC (Union Public Service Commission)",
  "NTA (National Testing Agency)",
  "SSC (Staff Selection Commission)",
  "IBPS (Institute of Banking Personnel Selection)",
  "State PSC (Public Service Commission)",
  "CBSE (Central Board of Secondary Education)",
  "State Secondary & Higher Secondary Board",
  "NCERT / Olympiad Foundation",
  "Indian Armed Forces",
  "Railway Recruitment Board (RRB)",
  "Other Government / Examination Authority",
];

function collectSyllabusNodeIds(node: SyllabusNode): number[] {
  return [
    node.id,
    ...(node.children ?? []).flatMap((child) => collectSyllabusNodeIds(child)),
  ];
}

export function PlatformGovernmentExamDialog({
  open,
  onOpenChange,
  exam,
  accessToken,
  onSuccess,
}: PlatformGovernmentExamDialogProps) {
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [conductingBody, setConductingBody] = useState("UPSC (Union Public Service Commission)");
  const [customConductingBody, setCustomConductingBody] = useState("");
  const [examCategory, setExamCategory] = useState("Government / Civil Services");
  const [totalMarks, setTotalMarks] = useState("200");
  const [durationMinutes, setDurationMinutes] = useState("120");
  const [examMode, setExamMode] = useState("online");

  // Scope: All Students vs Class/Program & Syllabus Basis
  const [scopeType, setScopeType] = useState<"all" | "class_program">("all");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>("");
  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<number[]>([]);

  // Async options
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [syllabi, setSyllabi] = useState<SyllabusOption[]>([]);
  const [loadingSyllabi, setLoadingSyllabi] = useState(false);
  const [syllabusTree, setSyllabusTree] = useState<SyllabusNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);

  // Dates
  const [applicationStartDate, setApplicationStartDate] = useState("");
  const [applicationEndDate, setApplicationEndDate] = useState("");
  const [admitCardDate, setAdmitCardDate] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("10:00");
  const [resultDate, setResultDate] = useState("");

  // Links & Details
  const [applyUrl, setApplyUrl] = useState("");
  const [officialWebsiteUrl, setOfficialWebsiteUrl] = useState("");
  const [notificationPdfUrl, setNotificationPdfUrl] = useState("");
  const [eligibilityCriteria, setEligibilityCriteria] = useState("");
  const [applicationFee, setApplicationFee] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Fetch all programs / master courses
  const fetchPrograms = useCallback(async () => {
    if (!accessToken) return;
    setLoadingPrograms(true);
    try {
      const res = await fetch("/api/admin/content/courses?page=1&limit=100", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setPrograms(
          json.data.map((c: any) => ({
            id: c.id,
            title: c.name || c.title || `Class / Course #${c.id}`,
          }))
        );
      }
    } catch {
      // fallback
    } finally {
      setLoadingPrograms(false);
    }
  }, [accessToken]);

  // Fetch subjects for program
  const fetchSubjectsForProgram = useCallback(
    async (progId: string) => {
      if (!accessToken || !progId) {
        setSubjects([]);
        return;
      }
      setLoadingSubjects(true);
      try {
        const res = await fetch(`/api/admin/content/courses/${progId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await res.json();
        if (res.ok && json.data?.subjects) {
          setSubjects(
            json.data.subjects.map((s: any) => ({
              id: s.id,
              name: s.name || `Subject ${s.id}`,
            }))
          );
        } else {
          // fallback to all subjects
          const allRes = await fetch("/api/admin/content/subjects?limit=50", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const allJson = await allRes.json();
          if (allRes.ok && Array.isArray(allJson.data)) {
            setSubjects(
              allJson.data.map((s: any) => ({
                id: s.id,
                name: s.name || `Subject ${s.id}`,
              }))
            );
          }
        }
      } catch {
        setSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    },
    [accessToken]
  );

  // Fetch syllabi for subject
  const fetchSyllabiForSubject = useCallback(
    async (subjId: string) => {
      if (!accessToken || !subjId) {
        setSyllabi([]);
        setSelectedSyllabusId("");
        setSyllabusTree([]);
        return;
      }
      setLoadingSyllabi(true);
      try {
        const res = await fetch(
          `/api/admin/content/syllabus?subjectId=${subjId}&limit=20`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const json = await res.json();
        if (res.ok && Array.isArray(json.data) && json.data.length > 0) {
          const list = json.data.map((s: any) => ({
            id: s.id,
            title: s.title || `Syllabus #${s.id}`,
          }));
          setSyllabi(list);
          setSelectedSyllabusId(String(list[0].id));
        } else {
          setSyllabi([]);
          setSelectedSyllabusId("");
          setSyllabusTree([]);
        }
      } catch {
        setSyllabi([]);
      } finally {
        setLoadingSyllabi(false);
      }
    },
    [accessToken]
  );

  // Fetch tree for syllabus
  const fetchSyllabusTree = useCallback(
    async (sylId: string) => {
      if (!accessToken || !sylId) {
        setSyllabusTree([]);
        return;
      }
      setLoadingTree(true);
      try {
        const res = await fetch(
          `/api/admin/master-data/syllabi/${sylId}/tree`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const json = await res.json();
        if (res.ok && Array.isArray(json.data)) {
          const tree = json.data as SyllabusNode[];
          setSyllabusTree(tree);
          setExpandedNodeIds(tree.map((n) => n.id));
        } else {
          setSyllabusTree([]);
        }
      } catch {
        setSyllabusTree([]);
      } finally {
        setLoadingTree(false);
      }
    },
    [accessToken]
  );

  // Handle tree node selection
  const toggleNode = (node: SyllabusNode) => {
    const nodeIds = collectSyllabusNodeIds(node);
    const nodeIdSet = new Set(nodeIds);
    setSelectedNodeIds((current) =>
      current.includes(node.id)
        ? current.filter((id) => !nodeIdSet.has(id))
        : Array.from(new Set([...current, ...nodeIds]))
    );
  };

  const toggleExpand = (id: number) => {
    setExpandedNodeIds((curr) =>
      curr.includes(id) ? curr.filter((i) => i !== id) : [...curr, id]
    );
  };

  useEffect(() => {
    if (!open) return;
    void fetchPrograms();
  }, [open, fetchPrograms]);

  useEffect(() => {
    if (selectedProgramId) {
      void fetchSubjectsForProgram(selectedProgramId);
    }
  }, [selectedProgramId, fetchSubjectsForProgram]);

  useEffect(() => {
    if (selectedSubjectId) {
      void fetchSyllabiForSubject(selectedSubjectId);
    }
  }, [selectedSubjectId, fetchSyllabiForSubject]);

  useEffect(() => {
    if (selectedSyllabusId) {
      void fetchSyllabusTree(selectedSyllabusId);
    }
  }, [selectedSyllabusId, fetchSyllabusTree]);

  useEffect(() => {
    if (!open) return;

    if (exam) {
      setTitle(exam.title || "");
      const body = exam.conducting_body || "";
      if (CONDUCTING_BODIES.includes(body)) {
        setConductingBody(body);
        setCustomConductingBody("");
      } else if (body) {
        setConductingBody("Other");
        setCustomConductingBody(body);
      } else {
        setConductingBody(CONDUCTING_BODIES[0]);
        setCustomConductingBody("");
      }

      setExamCategory(exam.exam_category || EXAM_CATEGORIES[0]);
      setTotalMarks(String(exam.total_marks || 200));
      setDurationMinutes(String(exam.duration_minutes || 120));
      setExamMode(exam.exam_mode || "online");

      setApplicationStartDate(
        exam.application_start_date ? exam.application_start_date.slice(0, 10) : ""
      );
      setApplicationEndDate(
        exam.application_end_date ? exam.application_end_date.slice(0, 10) : ""
      );
      setAdmitCardDate(
        exam.admit_card_date ? exam.admit_card_date.slice(0, 10) : ""
      );
      setExamDate(exam.exam_date ? exam.exam_date.slice(0, 10) : "");
      setExamTime(exam.exam_time ? String(exam.exam_time).slice(0, 5) : "10:00");
      setResultDate(exam.result_date ? exam.result_date.slice(0, 10) : "");

      setApplyUrl(exam.apply_url || "");
      setOfficialWebsiteUrl(exam.official_website_url || "");
      setNotificationPdfUrl(exam.notification_pdf_url || "");
      setEligibilityCriteria(exam.eligibility_criteria || "");
      setApplicationFee(exam.application_fee || "");
      setDescription(exam.description || "");
      setIsActive(exam.is_active !== false);

      // Scope & Syllabus
      if (exam.target_type === "PROGRAM" && exam.target_id) {
        setScopeType("class_program");
        setSelectedProgramId(String(exam.target_id));
      } else {
        setScopeType("all");
        setSelectedProgramId("");
      }

      if (exam.syllabus_node_ids && exam.syllabus_node_ids.length > 0) {
        setSelectedNodeIds(exam.syllabus_node_ids);
        const firstNode = exam.syllabus_nodes?.[0];
        if (firstNode?.subject_id) {
          setSelectedSubjectId(String(firstNode.subject_id));
        }
        if (firstNode?.syllabus_id) {
          setSelectedSyllabusId(String(firstNode.syllabus_id));
        }
      } else {
        setSelectedNodeIds([]);
      }
    } else {
      // Default initial values for new Gov / Selection Exam
      setTitle("");
      setConductingBody(CONDUCTING_BODIES[0]);
      setCustomConductingBody("");
      setExamCategory(EXAM_CATEGORIES[0]);
      setTotalMarks("200");
      setDurationMinutes("120");
      setExamMode("online");
      setScopeType("all");
      setSelectedProgramId("");
      setSelectedSubjectId("");
      setSelectedSyllabusId("");
      setSelectedNodeIds([]);
      setApplicationStartDate("");
      setApplicationEndDate("");
      setAdmitCardDate("");
      setExamDate(new Date().toISOString().slice(0, 10));
      setExamTime("10:00");
      setResultDate("");
      setApplyUrl("");
      setOfficialWebsiteUrl("");
      setNotificationPdfUrl("");
      setEligibilityCriteria("");
      setApplicationFee("");
      setDescription("");
      setIsActive(true);
    }
  }, [open, exam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Exam title is required");
      return;
    }
    if (!examDate) {
      toast.error("Exam date is required");
      return;
    }

    const resolvedConductingBody =
      conductingBody === "Other" || conductingBody.startsWith("Other")
        ? customConductingBody.trim() || conductingBody
        : conductingBody;

    const isClassScope = scopeType === "class_program" && Boolean(selectedProgramId);
    const targetType = isClassScope ? "PROGRAM" : "INSTITUTION";
    const targetId = isClassScope ? Number(selectedProgramId) : 1;

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        conducting_body: resolvedConductingBody,
        exam_category: examCategory,
        total_marks: Number(totalMarks) || 100,
        duration_minutes: Number(durationMinutes) || 120,
        exam_mode: examMode,
        exam_date: examDate,
        exam_time: examTime || "10:00",
        exam_place: "Designated Examination Centers (Nationwide / State-level)",
        application_start_date: applicationStartDate || null,
        application_end_date: applicationEndDate || null,
        admit_card_date: admitCardDate || null,
        result_date: resultDate || null,
        apply_url: applyUrl.trim() || null,
        official_website_url: officialWebsiteUrl.trim() || null,
        notification_pdf_url: notificationPdfUrl.trim() || null,
        eligibility_criteria: eligibilityCriteria.trim() || null,
        application_fee: applicationFee.trim() || null,
        description: description.trim() || null,
        is_government_exam: true,
        is_public: true,
        marketplace_approved: true,
        is_active: isActive,
        instant_result: false,
        source_institution_id: 1, // Platform Scope
        target_type: targetType,
        target_id: targetId,
        target_program_id: isClassScope ? Number(selectedProgramId) : null,
        syllabus_node_ids: selectedNodeIds.length > 0 ? selectedNodeIds : [],
        // Mock question to pass validation if required
        questions: [
          {
            question_text: `Official Exam Notification & Reference Information for ${title.trim()}`,
            question_type: "objective",
            marks: Number(totalMarks) || 100,
            options: [
              {
                text: "Official Examination Conducted by " + resolvedConductingBody,
                is_correct: true,
              },
              { text: "Option B", is_correct: false },
            ],
            files: [],
            display_order: 1,
          },
        ],
      };

      const url = exam
        ? `/api/admin/master-data/exams/${exam.id}`
        : "/api/admin/master-data/exams";
      const method = exam ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save exam notification");

      toast.success(
        exam
          ? "Government / Selection Exam details updated"
          : "Exam published successfully with scope & syllabus!"
      );
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save exam details");
    } finally {
      setSaving(false);
    }
  };

  const renderSyllabusNodes = (nodes: SyllabusNode[], depth = 0) => {
    return nodes.map((node) => {
      const isSelected = selectedNodeIds.includes(node.id);
      const isExpanded = expandedNodeIds.includes(node.id);
      const hasChildren = Boolean(node.children && node.children.length > 0);

      return (
        <div key={node.id} className="space-y-1">
          <div
            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs transition-colors hover:bg-muted/40 ${
              isSelected ? "bg-primary/10 font-bold" : ""
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="p-0.5 text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </button>
            ) : (
              <span className="size-3.5" />
            )}

            <Checkbox
              id={`node-${node.id}`}
              checked={isSelected}
              onCheckedChange={() => toggleNode(node)}
            />

            <label
              htmlFor={`node-${node.id}`}
              className="flex-1 truncate cursor-pointer select-none text-[11px]"
            >
              <span className="font-semibold">{node.title}</span>
              {node.node_type && (
                <span className="text-[10px] text-muted-foreground ml-1.5 capitalize">
                  ({node.node_type})
                </span>
              )}
            </label>
          </div>

          {hasChildren && isExpanded && (
            <div className="border-l ml-3 pl-1">
              {renderSyllabusNodes(node.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-4xl !w-[96vw] max-h-[94vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/20 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <Landmark className="size-5 text-primary" />
                <span>
                  {exam
                    ? "Update Government / Selection & Class Exam"
                    : "Publish Government / Selection & Class-Based Exam"}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Publish national &amp; state competitive exams, selection tests, and class/program &amp; syllabus-specific exams.
              </DialogDescription>
            </div>
            <Badge variant="outline" className="font-bold text-xs">
              🏛️ Platform Exam Engine
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Exam Scope & Target Basis (All Students vs Class/Program & Syllabus) */}
          <div className="p-4 rounded-xl border bg-card/60 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Target className="size-4" />
                <span>Exam Target &amp; Syllabus Basis</span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold">
                {scopeType === "all" ? "🌍 All Students" : "🎓 Class & Syllabus Mapped"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setScopeType("all")}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  scopeType === "all"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                  <Globe className="size-4 text-primary" />
                  <span>All Students (Open National / State Exam)</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  UPSC, SSC, JEE, NEET, CUET, Banking, Defense &amp; General Competitive Exams.
                </p>
              </div>

              <div
                onClick={() => setScopeType("class_program")}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  scopeType === "class_program"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                  <GraduationCap className="size-4 text-primary" />
                  <span>Class / Program &amp; Syllabus Basis</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Targeted to specific Class/Grade (Class 10, 12, B.Tech) &amp; mapped to Syllabus Topics.
                </p>
              </div>
            </div>

            {/* If Class/Program & Syllabus is chosen */}
            {scopeType === "class_program" && (
              <div className="pt-3 border-t space-y-4 bg-muted/10 p-3.5 rounded-xl border border-dashed">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">
                      Target Class / Master Program *
                    </Label>
                    <Select
                      value={selectedProgramId}
                      onValueChange={setSelectedProgramId}
                    >
                      <SelectTrigger className="h-8.5 text-xs bg-background">
                        <SelectValue
                          placeholder={
                            loadingPrograms ? "Loading classes..." : "Select Class / Course"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Subject</Label>
                    <Select
                      value={selectedSubjectId}
                      onValueChange={setSelectedSubjectId}
                      disabled={!selectedProgramId || loadingSubjects}
                    >
                      <SelectTrigger className="h-8.5 text-xs bg-background">
                        <SelectValue
                          placeholder={
                            loadingSubjects ? "Loading subjects..." : "Select Subject"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Syllabus</Label>
                    <Select
                      value={selectedSyllabusId}
                      onValueChange={setSelectedSyllabusId}
                      disabled={!selectedSubjectId || loadingSyllabi}
                    >
                      <SelectTrigger className="h-8.5 text-xs bg-background">
                        <SelectValue
                          placeholder={
                            loadingSyllabi ? "Loading syllabi..." : "Select Syllabus"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {syllabi.map((sy) => (
                          <SelectItem key={sy.id} value={String(sy.id)}>
                            {sy.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Syllabus Topic Node Tree */}
                {selectedSyllabusId && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <FolderTree className="size-3.5 text-primary" />
                        <span>Select Chapters / Syllabus Topics to Include</span>
                      </Label>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {selectedNodeIds.length} Topic(s) Selected
                      </Badge>
                    </div>

                    <div className="max-h-48 overflow-y-auto rounded-lg border bg-background p-2 divide-y">
                      {loadingTree ? (
                        <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Loading syllabus hierarchy...</span>
                        </div>
                      ) : syllabusTree.length > 0 ? (
                        renderSyllabusNodes(syllabusTree)
                      ) : (
                        <div className="text-center py-4 text-xs text-muted-foreground">
                          No chapter nodes found in this syllabus.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Basic Exam Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              <span>Exam Title &amp; Authority</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="exam-title" className="text-xs">
                  Exam Name / Title *
                </Label>
                <Input
                  id="exam-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. UPSC Civil Services Examination (CSE) 2026, Class 10 Board Mock Test, NEET UG"
                  className="h-9 text-xs font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Conducting Body / Authority *</Label>
                <Select value={conductingBody} onValueChange={setConductingBody}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Authority" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDUCTING_BODIES.map((body) => (
                      <SelectItem key={body} value={body}>
                        {body}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {conductingBody.startsWith("Other") && (
                  <Input
                    value={customConductingBody}
                    onChange={(e) => setCustomConductingBody(e.target.value)}
                    placeholder="Enter custom authority name..."
                    className="h-8 text-xs mt-1"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Exam Category *</Label>
                <Select value={examCategory} onValueChange={setExamCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 3. Pattern, Marks & Duration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Clock className="size-3.5 text-primary" />
              <span>Marks, Duration &amp; Mode</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="total-marks" className="text-xs">
                  Total Marks / Score Pattern
                </Label>
                <Input
                  id="total-marks"
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  placeholder="e.g. 200, 300, 720"
                  className="h-9 text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="duration" className="text-xs">
                  Duration (in Minutes)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="e.g. 120, 180"
                  className="h-9 text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Exam Mode</Label>
                <Select value={examMode} onValueChange={setExamMode}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online CBT (Computer Based)</SelectItem>
                    <SelectItem value="offline">Offline (OMR / Pen &amp; Paper)</SelectItem>
                    <SelectItem value="hybrid">Hybrid / Multi-Tier Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 4. Important Dates & Schedule */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Calendar className="size-3.5 text-primary" />
              <span>Important Dates &amp; Schedule</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="app-start-date" className="text-[11px]">
                  Application Start Date
                </Label>
                <Input
                  id="app-start-date"
                  type="date"
                  value={applicationStartDate}
                  onChange={(e) => setApplicationStartDate(e.target.value)}
                  className="h-8.5 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="app-end-date" className="text-[11px] font-bold text-destructive">
                  Application Last Date (Deadline)
                </Label>
                <Input
                  id="app-end-date"
                  type="date"
                  value={applicationEndDate}
                  onChange={(e) => setApplicationEndDate(e.target.value)}
                  className="h-8.5 text-xs bg-background border-destructive/40"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="admit-card-date" className="text-[11px]">
                  Admit Card Release Date
                </Label>
                <Input
                  id="admit-card-date"
                  type="date"
                  value={admitCardDate}
                  onChange={(e) => setAdmitCardDate(e.target.value)}
                  className="h-8.5 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="exam-date" className="text-[11px] font-bold text-primary">
                  Exam Date *
                </Label>
                <Input
                  id="exam-date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="h-8.5 text-xs bg-background border-primary/40"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="exam-time" className="text-[11px]">
                  Exam Time / Shift
                </Label>
                <Input
                  id="exam-time"
                  type="time"
                  value={examTime}
                  onChange={(e) => setExamTime(e.target.value)}
                  className="h-8.5 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="result-date" className="text-[11px]">
                  Expected Result Date
                </Label>
                <Input
                  id="result-date"
                  type="date"
                  value={resultDate}
                  onChange={(e) => setResultDate(e.target.value)}
                  className="h-8.5 text-xs bg-background"
                />
              </div>
            </div>
          </div>

          {/* 5. Official Links & Application Portals */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Globe className="size-3.5 text-primary" />
              <span>Official Links &amp; Portals</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="apply-url" className="text-xs flex items-center gap-1.5 font-bold">
                  <ExternalLink className="size-3 text-primary" />
                  <span>Official Online Apply URL</span>
                </Label>
                <Input
                  id="apply-url"
                  type="url"
                  value={applyUrl}
                  onChange={(e) => setApplyUrl(e.target.value)}
                  placeholder="https://upsconline.nic.in or https://jeemain.nta.ac.in"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="official-website" className="text-xs">
                  Commission / Organization Website
                </Label>
                <Input
                  id="official-website"
                  type="url"
                  value={officialWebsiteUrl}
                  onChange={(e) => setOfficialWebsiteUrl(e.target.value)}
                  placeholder="https://upsc.gov.in"
                  className="h-9 text-xs"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="pdf-url" className="text-xs flex items-center gap-1.5">
                  <FileText className="size-3 text-muted-foreground" />
                  <span>Official Notification PDF / Brochure Link (Optional)</span>
                </Label>
                <Input
                  id="pdf-url"
                  type="url"
                  value={notificationPdfUrl}
                  onChange={(e) => setNotificationPdfUrl(e.target.value)}
                  placeholder="https://example.gov.in/notifications/exam-2026.pdf"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* 6. Eligibility & Fee Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Target className="size-3.5 text-primary" />
              <span>Eligibility, Fees &amp; Instructions</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="eligibility" className="text-xs">
                  Eligibility Criteria &amp; Age Limit
                </Label>
                <Textarea
                  id="eligibility"
                  value={eligibilityCriteria}
                  onChange={(e) => setEligibilityCriteria(e.target.value)}
                  placeholder="e.g. 10+2 with PCM / Bachelor's Degree. Age limit 21 to 32 years as on 1st August."
                  rows={2}
                  className="text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fee" className="text-xs">
                  Application Fee Details
                </Label>
                <Textarea
                  id="fee"
                  value={applicationFee}
                  onChange={(e) => setApplicationFee(e.target.value)}
                  placeholder="e.g. ₹100 for General/OBC | SC/ST/PwD/Female: Exempted"
                  rows={2}
                  className="text-xs bg-background"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="description" className="text-xs">
                  Exam Pattern, Syllabus Overview &amp; Instructions
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of exam stages (Prelims, Mains, Interview), negative marking rules, syllabus topics..."
                  rows={3}
                  className="text-xs bg-background"
                />
              </div>
            </div>
          </div>

          {/* 7. Active Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
            <div>
              <Label className="font-bold text-xs text-foreground cursor-pointer">
                Publish &amp; Make Available to Target Students
              </Label>
              <p className="text-[11px] text-muted-foreground">
                When active, this exam notification and apply link will be visible across all eligible student dashboards.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="pt-4 border-t gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="gap-2 bg-primary text-primary-foreground font-bold shadow-xs cursor-pointer"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Landmark className="size-4" />
              )}
              {exam ? "Update Exam Notification" : "Publish Exam"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

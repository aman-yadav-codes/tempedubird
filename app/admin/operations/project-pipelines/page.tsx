"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  GitFork,
  FolderKanban,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Layers,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  ShieldCheck,
  Check,
  Star,
  Users,
  ChevronRight,
  Sparkles,
  Info,
  Copy,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuthStore } from "@/store";

export interface PipelinePhase {
  id: string;
  name: string;
  description?: string;
  order: number;
  estimated_duration_hours?: number;
  assigned_role?: string;
  is_mandatory?: boolean;
  requires_approval?: boolean;
}

export interface ProjectPipelineItem {
  id: number;
  project_type_id: number;
  project_type_name?: string;
  project_type_icon?: string;
  name: string;
  description?: string | null;
  status: "active" | "inactive";
  is_default: boolean;
  phases: PipelinePhase[];
  phases_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectTypeOption {
  id: number;
  name: string;
  icon?: string;
  status: string;
}

const DEFAULT_ROLES = [
  "Project Leader",
  "Business Analyst",
  "UI/UX Designer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "QA / Tester",
  "DevOps Engineer",
  "Digital Marketer",
  "Content Writer",
  "Video Editor",
  "Account Manager",
  "Client Approval",
];

export default function ProjectPipelinesPage() {
  const { user } = useAuthStore();
  const [pipelines, setPipelines] = useState<ProjectPipelineItem[]>([]);
  const [projectTypes, setProjectTypes] = useState<ProjectTypeOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<ProjectPipelineItem | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pipelineToDelete, setPipelineToDelete] = useState<ProjectPipelineItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formProjectTypeId, setFormProjectTypeId] = useState<number | "">("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formPhases, setFormPhases] = useState<PipelinePhase[]>([]);

  // Load project types for select dropdowns
  const fetchProjectTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/operations/project-types?status=active");
      if (res.ok) {
        const data = await res.json();
        setProjectTypes(data.project_types || []);
      }
    } catch (err) {
      console.error("Error fetching project types:", err);
    }
  }, []);

  // Load pipelines
  const fetchPipelines = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("project_type_id", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/operations/project-pipelines?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPipelines(data.pipelines || []);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to load pipelines");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load pipelines");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search]);

  useEffect(() => {
    fetchProjectTypes();
    fetchPipelines();
  }, [fetchProjectTypes, fetchPipelines]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPipeline(null);
    setFormName("");
    setFormProjectTypeId(projectTypes[0]?.id || "");
    setFormDescription("");
    setFormStatus("active");
    setFormIsDefault(false);
    setFormPhases([
      {
        id: "phase_1",
        name: "Requirement Gathering",
        description: "Analyze initial scope, client goals, and technical deliverables",
        order: 1,
        estimated_duration_hours: 8,
        assigned_role: "Business Analyst",
        is_mandatory: true,
        requires_approval: false,
      },
      {
        id: "phase_2",
        name: "Design & Planning",
        description: "Architecture blueprint, wireframes, and approval",
        order: 2,
        estimated_duration_hours: 16,
        assigned_role: "UI/UX Designer",
        is_mandatory: true,
        requires_approval: true,
      },
      {
        id: "phase_3",
        name: "Implementation",
        description: "Active development and sprint deliveries",
        order: 3,
        estimated_duration_hours: 40,
        assigned_role: "Full Stack Developer",
        is_mandatory: true,
        requires_approval: false,
      },
      {
        id: "phase_4",
        name: "Quality Assurance & Testing",
        description: "Functional testing, bug fixes, and performance check",
        order: 4,
        estimated_duration_hours: 12,
        assigned_role: "QA / Tester",
        is_mandatory: true,
        requires_approval: true,
      },
      {
        id: "phase_5",
        name: "Deployment & Completion",
        description: "Final client review, sign-off, and live launch",
        order: 5,
        estimated_duration_hours: 4,
        assigned_role: "Project Leader",
        is_mandatory: true,
        requires_approval: true,
      },
    ]);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p: ProjectPipelineItem) => {
    setEditingPipeline(p);
    setFormName(p.name);
    setFormProjectTypeId(p.project_type_id);
    setFormDescription(p.description || "");
    setFormStatus(p.status);
    setFormIsDefault(Boolean(p.is_default));
    const sorted = Array.isArray(p.phases)
      ? [...p.phases].sort((a, b) => (a.order || 0) - (b.order || 0))
      : [];
    setFormPhases(sorted);
    setModalOpen(true);
  };

  // Duplicate Pipeline
  const handleDuplicatePipeline = (p: ProjectPipelineItem) => {
    setEditingPipeline(null);
    setFormName(`${p.name} (Copy)`);
    setFormProjectTypeId(p.project_type_id);
    setFormDescription(p.description ? `${p.description} (Cloned)` : "");
    setFormStatus("active");
    setFormIsDefault(false);
    const copiedPhases = Array.isArray(p.phases)
      ? p.phases.map((ph, idx) => ({
          ...ph,
          id: `phase_${Date.now()}_${idx}`,
          order: idx + 1,
        }))
      : [];
    setFormPhases(copiedPhases);
    setModalOpen(true);
  };

  // Phase builders
  const handleAddPhase = () => {
    const nextOrder = formPhases.length + 1;
    const newPhase: PipelinePhase = {
      id: `phase_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `Phase ${nextOrder}`,
      description: "",
      order: nextOrder,
      estimated_duration_hours: 8,
      assigned_role: "Project Leader",
      is_mandatory: true,
      requires_approval: false,
    };
    setFormPhases((prev) => [...prev, newPhase]);
  };

  const handleUpdatePhase = (index: number, field: keyof PipelinePhase, value: any) => {
    setFormPhases((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemovePhase = (index: number) => {
    setFormPhases((prev) => {
      const copy = prev.filter((_, i) => i !== index);
      return copy.map((p, i) => ({ ...p, order: i + 1 }));
    });
  };

  const handleMovePhase = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === formPhases.length - 1) return;
    setFormPhases((prev) => {
      const copy = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((p, i) => ({ ...p, order: i + 1 }));
    });
  };

  // Save Pipeline
  const handleSavePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Pipeline Name is required");
      return;
    }
    if (!formProjectTypeId) {
      toast.error("Please select a Project Type");
      return;
    }
    if (formPhases.length === 0) {
      toast.error("A pipeline must have at least one phase");
      return;
    }

    try {
      setSubmitting(true);
      const normalizedPhases = formPhases.map((p, idx) => ({
        ...p,
        order: idx + 1,
        name: p.name.trim() || `Phase ${idx + 1}`,
        estimated_duration_hours: Number(p.estimated_duration_hours || 0),
        is_mandatory: Boolean(p.is_mandatory),
        requires_approval: Boolean(p.requires_approval),
      }));

      const payload = {
        name: formName.trim(),
        project_type_id: Number(formProjectTypeId),
        description: formDescription.trim() || null,
        status: formStatus,
        is_default: formIsDefault,
        phases: normalizedPhases,
      };

      let res;
      if (editingPipeline) {
        res = await fetch("/api/admin/operations/project-pipelines", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingPipeline.id, ...payload }),
        });
      } else {
        res = await fetch("/api/admin/operations/project-pipelines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save pipeline");
      }

      toast.success(
        editingPipeline
          ? `Pipeline "${payload.name}" updated successfully`
          : `Pipeline "${payload.name}" created successfully`
      );
      setModalOpen(false);
      fetchPipelines();
    } catch (err: any) {
      toast.error(err.message || "Failed to save pipeline");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Default
  const handleToggleDefault = async (p: ProjectPipelineItem) => {
    if (p.is_default) {
      toast.info("This is already the default pipeline for this project type");
      return;
    }
    try {
      const res = await fetch("/api/admin/operations/project-pipelines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: p.id,
          name: p.name,
          project_type_id: p.project_type_id,
          is_default: true,
          status: "active",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set default");
      toast.success(`"${p.name}" is now the default pipeline for ${p.project_type_name}`);
      fetchPipelines();
    } catch (err: any) {
      toast.error(err.message || "Failed to set default pipeline");
    }
  };

  // Delete Pipeline
  const handleDeletePipeline = async () => {
    if (!pipelineToDelete) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/operations/project-pipelines?id=${pipelineToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete pipeline");
      toast.success(data.message || "Pipeline removed");
      setDeleteModalOpen(false);
      setPipelineToDelete(null);
      fetchPipelines();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete pipeline");
    } finally {
      setSubmitting(false);
    }
  };

  // Total Duration Calculation for Form
  const totalBuilderHours = useMemo(() => {
    return formPhases.reduce(
      (sum, p) => sum + (parseFloat(String(p.estimated_duration_hours || 0)) || 0),
      0
    );
  }, [formPhases]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1 font-medium">
            <Link href="/admin/operations/tasks" className="hover:underline flex items-center gap-1">
              Operations
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/admin/operations/project-types" className="hover:underline flex items-center gap-1">
              Project Types
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-semibold">Project Pipelines</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <GitFork className="w-7 h-7 text-primary" />
            Project Pipelines
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Design multi-phase production workflows and assign default milestone templates per project type.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link href="/admin/operations/project-types">
            <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs font-semibold cursor-pointer">
              <FolderKanban className="w-3.5 h-3.5 text-primary" />
              Manage Types
            </Button>
          </Link>
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="gap-1.5 h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Pipeline
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pipelines or phase names..."
            className="pl-9 h-9 text-xs rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap justify-end">
          {/* Project Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 text-xs rounded-lg border bg-background px-2.5 outline-none font-medium cursor-pointer"
            >
              <option value="all">All Project Types</option>
              {projectTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs rounded-lg border bg-background px-2.5 outline-none font-medium cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchPipelines()}
            title="Refresh"
            className="h-9 w-9 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : "text-muted-foreground"}`} />
          </Button>
        </div>
      </div>

      {/* Pipeline Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary opacity-60 mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">Loading pipeline templates...</p>
        </div>
      ) : pipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border border-dashed p-8">
          <GitFork className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-bold text-foreground">No Project Pipelines Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            {search || typeFilter !== "all" || statusFilter !== "all"
              ? "No pipelines match your current filters. Try resetting the filters."
              : "Get started by creating your first milestone pipeline template."}
          </p>
          <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 text-xs font-semibold cursor-pointer">
            <Plus className="w-4 h-4" /> Create Pipeline
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pipelines.map((pipeline) => {
            const phases = Array.isArray(pipeline.phases) ? pipeline.phases : [];
            const totalHours = phases.reduce(
              (acc, ph) => acc + (parseFloat(String(ph.estimated_duration_hours || 0)) || 0),
              0
            );

            return (
              <div
                key={pipeline.id}
                className="bg-card rounded-xl border p-4 sm:p-5 shadow-2xs hover:border-primary/40 transition-all space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <GitFork className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-foreground">{pipeline.name}</h3>
                        <Badge
                          variant="secondary"
                          className="bg-muted font-semibold text-[11px] gap-1 px-2 py-0.5"
                        >
                          <FolderKanban className="w-3 h-3 text-primary" />
                          {pipeline.project_type_name || "Unassigned Type"}
                        </Badge>
                        {pipeline.is_default && (
                          <Badge className="bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30 font-bold text-[10px] gap-1">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Default Pipeline
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold gap-1 ${
                            pipeline.status === "active"
                              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                              : "bg-muted text-muted-foreground border-muted-foreground/30"
                          }`}
                        >
                          {pipeline.status === "active" ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {pipeline.status.toUpperCase()}
                        </Badge>
                      </div>

                      {pipeline.description && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                          {pipeline.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {!pipeline.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleDefault(pipeline)}
                        className="h-8 text-xs font-medium gap-1 text-muted-foreground hover:text-amber-600 cursor-pointer"
                        title="Set as default template for this project type"
                      >
                        <Star className="w-3.5 h-3.5" /> Make Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicatePipeline(pipeline)}
                      className="h-8 text-xs font-medium gap-1 cursor-pointer"
                      title="Clone this pipeline"
                    >
                      <Copy className="w-3.5 h-3.5" /> Clone
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(pipeline)}
                      className="h-8 text-xs font-medium gap-1 text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPipelineToDelete(pipeline);
                        setDeleteModalOpen(true);
                      }}
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 cursor-pointer"
                      title="Delete pipeline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Pipeline Phases Visual Stepper */}
                <div className="bg-muted/30 rounded-xl p-3 border space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b pb-2">
                    <span className="flex items-center gap-1.5 font-bold text-foreground">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      Phases Workflow Sequence ({phases.length} Steps)
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3 text-amber-500" />
                      Est. Total: {totalHours} hrs
                    </span>
                  </div>

                  {/* Horizontal visual stepper */}
                  <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
                    {phases.map((ph, idx) => (
                      <div key={ph.id || idx} className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col bg-card border rounded-lg p-2.5 min-w-[170px] max-w-[210px] shadow-2xs hover:border-primary/40 transition-colors">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.2 rounded bg-primary/10">
                              #{idx + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              {ph.requires_approval && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                                  title="Requires Approval"
                                >
                                  Approval
                                </Badge>
                              )}
                              {ph.is_mandatory && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/30"
                                  title="Mandatory"
                                >
                                  Req
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-foreground truncate" title={ph.name}>
                            {ph.name}
                          </span>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 pt-1 border-t">
                            <span className="truncate max-w-[100px]" title={ph.assigned_role || "Unassigned"}>
                              {ph.assigned_role || "Any"}
                            </span>
                            <span className="font-mono text-[10px] font-semibold">
                              {ph.estimated_duration_hours ? `${ph.estimated_duration_hours}h` : "—"}
                            </span>
                          </div>
                        </div>
                        {idx < phases.length - 1 && (
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT PIPELINE BUILDER DIALOG */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <GitFork className="w-5 h-5 text-primary" />
              {editingPipeline ? `Edit Pipeline: ${editingPipeline.name}` : "Create Project Pipeline Template"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePipeline} className="space-y-5 py-2">
            {/* General Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Pipeline Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Standard E-commerce Pipeline"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Project Type *</Label>
                <select
                  value={formProjectTypeId}
                  onChange={(e) => setFormProjectTypeId(Number(e.target.value))}
                  className="h-9 text-xs w-full rounded-md border bg-background px-3 outline-none font-medium cursor-pointer"
                  required
                >
                  <option value="" disabled>
                    Select Project Type
                  </option>
                  {projectTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold">Description</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe when this pipeline should be applied and any key constraints..."
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              <div className="flex items-center gap-6 md:col-span-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Set as Default Pipeline for this Project Type</span>
                </label>

                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs font-bold">Status:</span>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "active" | "inactive")}
                    className="h-8 text-xs rounded-md border bg-background px-2 font-medium cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Phase Builder Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Interactive Phase Builder ({formPhases.length} Phases)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Define phases in sequence order. You can reorder, configure duration, roles, and approval gates.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-muted-foreground">
                    Total: {totalBuilderHours}h
                  </span>
                  <Button
                    type="button"
                    onClick={handleAddPhase}
                    size="sm"
                    className="h-8 text-xs font-semibold gap-1 bg-primary text-primary-foreground cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Phase
                  </Button>
                </div>
              </div>

              {formPhases.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-xl bg-card">
                  <p className="text-xs text-muted-foreground">No phases added yet. Click &quot;Add Phase&quot; above.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {formPhases.map((phase, idx) => (
                    <div
                      key={phase.id || idx}
                      className="bg-card rounded-xl border p-3.5 shadow-2xs space-y-2.5 hover:border-input transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            Step {idx + 1}
                          </span>
                          <Input
                            value={phase.name}
                            onChange={(e) => handleUpdatePhase(idx, "name", e.target.value)}
                            placeholder="Phase Name (e.g. Client Feedback)"
                            className="h-8 text-xs font-bold w-60"
                            required
                          />
                        </div>

                        {/* Order & Remove Controls */}
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={idx === 0}
                            onClick={() => handleMovePhase(idx, "up")}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={idx === formPhases.length - 1}
                            onClick={() => handleMovePhase(idx, "down")}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePhase(idx)}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer ml-1"
                            title="Remove Phase"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Phase Configurations Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        {/* Assigned Role */}
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Assigned Role / Dept</Label>
                          <input
                            list={`roles-list-${idx}`}
                            value={phase.assigned_role || ""}
                            onChange={(e) => handleUpdatePhase(idx, "assigned_role", e.target.value)}
                            placeholder="Role (e.g. UI/UX Designer)"
                            className="h-8 text-xs w-full rounded-md border bg-background px-2.5 outline-none font-medium"
                          />
                          <datalist id={`roles-list-${idx}`}>
                            {DEFAULT_ROLES.map((r) => (
                              <option key={r} value={r} />
                            ))}
                          </datalist>
                        </div>

                        {/* Estimated Duration */}
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Estimated Duration (Hours)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={phase.estimated_duration_hours ?? 0}
                            onChange={(e) =>
                              handleUpdatePhase(idx, "estimated_duration_hours", parseFloat(e.target.value) || 0)
                            }
                            className="h-8 text-xs font-mono"
                          />
                        </div>

                        {/* Toggles: Mandatory & Approval */}
                        <div className="flex items-center gap-4 pt-4">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={phase.is_mandatory ?? true}
                              onChange={(e) => handleUpdatePhase(idx, "is_mandatory", e.target.checked)}
                              className="rounded border-input text-primary h-3.5 w-3.5"
                            />
                            <span className="font-medium text-[11px]">Mandatory</span>
                          </label>

                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={phase.requires_approval ?? false}
                              onChange={(e) => handleUpdatePhase(idx, "requires_approval", e.target.checked)}
                              className="rounded border-input text-amber-600 h-3.5 w-3.5"
                            />
                            <span className="font-medium text-[11px] text-amber-700 dark:text-amber-400">
                              Requires Sign-off
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Phase Description */}
                      <div className="pt-0.5">
                        <Input
                          value={phase.description || ""}
                          onChange={(e) => handleUpdatePhase(idx, "description", e.target.value)}
                          placeholder="Brief description / deliverables expected in this phase..."
                          className="h-7 text-[11px] bg-muted/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-primary text-primary-foreground font-semibold cursor-pointer"
              >
                {submitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                )}
                {editingPipeline ? "Update Pipeline" : "Create Pipeline"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Delete Pipeline Template
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground space-y-2">
            <p>
              Are you sure you want to remove pipeline <strong>{pipelineToDelete?.name}</strong>?
            </p>
            <p className="bg-muted/40 p-2.5 rounded-lg border text-[11px]">
              Note: Existing projects created using this pipeline will preserve their snapshot workflow phases intact.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={submitting}
              onClick={handleDeletePipeline}
              className="cursor-pointer"
            >
              {submitting ? "Deleting..." : "Delete Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


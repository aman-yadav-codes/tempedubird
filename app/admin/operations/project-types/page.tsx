"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Globe,
  Smartphone,
  Palette,
  Video,
  Database,
  TrendingUp,
  Code,
  Layers,
  Layout,
  Cpu,
  Box,
  GitFork,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
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

export const ICON_MAP: Record<string, React.ElementType> = {
  FolderKanban,
  Globe,
  Smartphone,
  Palette,
  Video,
  Database,
  TrendingUp,
  Code,
  Layers,
  Layout,
  Cpu,
  Box,
  GitFork,
};

export interface ProjectTypeItem {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  pipelines_count?: number;
  pipelines?: Array<{
    id: number;
    name: string;
    is_default: boolean;
    status: string;
    phases_count: number;
  }>;
}

export default function ProjectTypesPage() {
  const { accessToken } = useAuthStore();
  const [projectTypes, setProjectTypes] = useState<ProjectTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProjectTypeItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIcon, setFormIcon] = useState("FolderKanban");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
  const [saving, setSaving] = useState(false);

  // Fetch Project Types
  const fetchProjectTypes = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/operations/project-types", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.project_types)) {
        setProjectTypes(json.project_types);
      } else {
        toast.error(json.error || "Failed to load project types");
      }
    } catch {
      toast.error("Network error loading project types");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchProjectTypes();
  }, [fetchProjectTypes]);

  const filteredTypes = useMemo(() => {
    return projectTypes.filter((pt) => {
      const matchesSearch =
        pt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pt.description && pt.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === "all" || pt.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projectTypes, searchQuery, statusFilter]);

  const handleOpenCreate = () => {
    setEditingType(null);
    setFormName("");
    setFormDescription("");
    setFormIcon("FolderKanban");
    setFormStatus("active");
    setModalOpen(true);
  };

  const handleOpenEdit = (pt: ProjectTypeItem) => {
    setEditingType(pt);
    setFormName(pt.name);
    setFormDescription(pt.description || "");
    setFormIcon(pt.icon || "FolderKanban");
    setFormStatus(pt.status);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter a project type name");
      return;
    }

    setSaving(true);
    try {
      const url = "/api/admin/operations/project-types";
      const method = editingType ? "PUT" : "POST";
      const body: any = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        icon: formIcon,
        status: formStatus,
      };
      if (editingType) {
        body.id = editingType.id;
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (res.ok) {
        toast.success(editingType ? "Project type updated successfully" : "Project type created successfully");
        setModalOpen(false);
        fetchProjectTypes();
      } else {
        toast.error(json.error || "Failed to save project type");
      }
    } catch {
      toast.error("Network error saving project type");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (pt: ProjectTypeItem) => {
    const nextStatus = pt.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch("/api/admin/operations/project-types", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: pt.id,
          name: pt.name,
          status: nextStatus,
        }),
      });
      if (res.ok) {
        toast.success(`Project type "${pt.name}" is now ${nextStatus}`);
        setProjectTypes((prev) =>
          prev.map((item) => (item.id === pt.id ? { ...item, status: nextStatus } : item))
        );
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to update status");
      }
    } catch {
      toast.error("Network error updating status");
    }
  };

  const handleDelete = async (pt: ProjectTypeItem) => {
    if (!confirm(`Are you sure you want to remove project type "${pt.name}"? If it has existing projects, it will be safely deactivated.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/operations/project-types?id=${pt.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok) {
        if (json.action === "deactivated") {
          toast.info(json.message || "Project type deactivated to protect existing project records.");
        } else {
          toast.success("Work type deleted successfully");
        }
        fetchProjectTypes();
      } else {
        toast.error(json.error || "Failed to delete work type");
      }
    } catch {
      toast.error("Network error deleting work type");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-primary/10 via-background to-blue-500/5 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold">
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Operations Configuration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Work Type Management
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Define the classification of work your organization handles. Each work type can be linked with specialized workflow pipelines.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Link href="/admin/operations/project-pipelines">
              <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5 cursor-pointer">
                <GitFork className="w-3.5 h-3.5 text-primary" />
                <span>Manage Pipelines</span>
              </Button>
            </Link>
            <Button
              onClick={handleOpenCreate}
              size="sm"
              className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Work Type</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border/80 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search work types by name or description..."
            className="pl-9 text-xs h-9 bg-background"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-input text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                statusFilter === "all" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({projectTypes.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                statusFilter === "active" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active ({projectTypes.filter((p) => p.status === "active").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                statusFilter === "inactive" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Inactive ({projectTypes.filter((p) => p.status === "inactive").length})
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchProjectTypes}
            title="Refresh list"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Project Types Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl border bg-card p-5 animate-pulse space-y-3" />
          ))}
        </div>
      ) : filteredTypes.length === 0 ? (
        <div className="text-center py-16 px-4 bg-muted/10 border border-dashed rounded-2xl space-y-3">
          <FolderKanban className="w-12 h-12 text-muted-foreground/50 mx-auto" />
          <h3 className="font-bold text-sm text-foreground">No work types found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? `No project types match "${searchQuery}". Try clearing the search.`
              : "No project types available. Click \"Create Project Type\" to add your first one."}
          </p>
          {searchQuery && (
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="text-xs">
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTypes.map((pt) => {
            const IconComponent = ICON_MAP[pt.icon || "FolderKanban"] || FolderKanban;
            const pipelines = Array.isArray(pt.pipelines) ? pt.pipelines : [];
            const defaultPipe = pipelines.find((p) => p.is_default);

            return (
              <div
                key={pt.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all bg-card hover:shadow-md ${
                  pt.status === "active" ? "border-border/80 hover:border-primary/50" : "border-border/40 opacity-75 bg-muted/10"
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header: Icon, Name, Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground leading-tight flex items-center gap-1.5">
                          <span>{pt.name}</span>
                        </h3>
                        <span className="text-[10px] text-muted-foreground font-mono">ID: #{pt.id}</span>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold h-5 shrink-0 ${
                        pt.status === "active"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {pt.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[32px]">
                    {pt.description || "No description provided for this project type."}
                  </p>

                  {/* Associated Pipelines pill */}
                  <div className="pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <GitFork className="w-3.5 h-3.5 text-primary" />
                        <span>Workflows:</span>
                        <strong className="text-foreground">{pt.pipelines_count || pipelines.length}</strong>
                      </span>
                      {defaultPipe ? (
                        <span className="text-[10px] text-primary font-medium truncate max-w-[140px]" title={`Default: ${defaultPipe.name}`}>
                          ★ {defaultPipe.name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">No default workflow</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 mt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/operations/project-pipelines?project_type_id=${pt.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <span>View Pipelines</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(pt)}
                      title={pt.status === "active" ? "Deactivate project type" : "Activate project type"}
                      className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {pt.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(pt)}
                      title="Edit project type"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(pt)}
                      title="Delete or deactivate"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit Project Type */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md w-[94vw] p-0 overflow-hidden shadow-2xl border">
          <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/20">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-primary" />
              <span>{editingType ? "Edit Work Type" : "Create New Work Type"}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Work Type Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Website Development, Mobile App..."
                required
                className="text-xs h-9 bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Icon</Label>
              <div className="grid grid-cols-6 gap-2 pt-1">
                {Object.keys(ICON_MAP).map((iconKey) => {
                  const IconComp = ICON_MAP[iconKey];
                  const isSelected = formIcon === iconKey;
                  return (
                    <button
                      key={iconKey}
                      type="button"
                      onClick={() => setFormIcon(iconKey)}
                      className={`h-9 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs scale-105"
                          : "bg-background text-muted-foreground hover:bg-muted/80 border-input"
                      }`}
                      title={iconKey}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description (Optional)</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Briefly describe what kind of deliverables and work fall under this category..."
                rows={3}
                className="text-xs bg-background resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status</Label>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="type_status"
                    checked={formStatus === "active"}
                    onChange={() => setFormStatus("active")}
                    className="accent-primary"
                  />
                  <span>Active</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="type_status"
                    checked={formStatus === "inactive"}
                    onChange={() => setFormStatus("inactive")}
                    className="accent-primary"
                  />
                  <span>Inactive</span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)} className="text-xs font-semibold">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving} className="text-xs font-bold bg-primary text-primary-foreground">
                {saving ? "Saving..." : editingType ? "Update Project Type" : "Create Project Type"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


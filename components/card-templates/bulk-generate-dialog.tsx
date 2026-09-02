"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Building,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
  Users,
  Zap,
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
import { Skeleton } from "@/components/ui/skeleton";
import type { CardCategoryRow, DocumentTemplateRow } from "@/lib/types/document-template";

type BulkGenerateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
  templates: DocumentTemplateRow[];
  categories: CardCategoryRow[];
  institutionId?: number | null;
  onSuccess?: () => void;
  onViewDocuments?: () => void;
};

type RecipientPreview = {
  id: number;
  enrollmentId?: number;
  name: string;
  email?: string;
  phone?: string;
  identifier: string;
  subtext: string;
  avatarUrl?: string;
  institutionName?: string;
};

type OptionItem = {
  id: number;
  name: string;
  code?: string;
};

export function BulkGenerateDialog({
  open,
  onOpenChange,
  accessToken,
  templates,
  categories,
  institutionId,
  onSuccess,
  onViewDocuments,
}: BulkGenerateDialogProps) {
  const [audience, setAudience] = useState<"student" | "staff">("student");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Scope selection
  const [scopeType, setScopeType] = useState<"all" | "program" | "section" | "role">("all");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>("");

  // Options state
  const [programs, setPrograms] = useState<OptionItem[]>([]);
  const [sections, setSections] = useState<OptionItem[]>([]);
  const [roles, setRoles] = useState<{ id: number; code: string; name: string }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Recipients preview
  const [recipients, setRecipients] = useState<RecipientPreview[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<number>>(new Set());
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Progress & Execution
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationDone, setGenerationDone] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);

  // Filter Categories by Audience
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => (c.target_audience || "student") === audience);
  }, [categories, audience]);

  // Filter Templates by Audience & Selected Category
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchAudience = (t.category_target_audience || "student") === audience;
      if (!matchAudience) return false;
      if (selectedCategoryId !== "all" && String(t.card_category_id) !== selectedCategoryId) {
        return false;
      }
      return true;
    });
  }, [templates, audience, selectedCategoryId]);

  // Auto select first template if none selected or invalid
  useEffect(() => {
    if (filteredTemplates.length > 0) {
      if (!selectedTemplateId || !filteredTemplates.some((t) => t.id === selectedTemplateId)) {
        setSelectedTemplateId(filteredTemplates[0].id);
      }
    } else {
      setSelectedTemplateId(null);
    }
  }, [filteredTemplates, selectedTemplateId]);

  // Fetch Options (Programs, Sections, Roles)
  const fetchOptions = useCallback(async () => {
    if (!accessToken) return;
    setLoadingOptions(true);
    try {
      const params = new URLSearchParams();
      if (institutionId) params.set("institutionId", String(institutionId));
      const res = await fetch(`/api/admin/generate/bulk?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok) {
        setPrograms(json.programs || []);
        setSections(json.sections || []);
        setRoles(json.roles || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingOptions(false);
    }
  }, [accessToken, institutionId]);

  useEffect(() => {
    if (open) {
      void fetchOptions();
      setGenerationDone(false);
      setProgress(0);
    }
  }, [open, fetchOptions]);

  // Fetch Matching Recipients Preview
  const fetchRecipientsPreview = useCallback(async () => {
    if (!accessToken) return;
    setLoadingPreview(true);
    try {
      const payload = {
        action: "preview",
        audience,
        scopeType,
        programId: selectedProgramId ? Number(selectedProgramId) : undefined,
        sectionId: selectedSectionId ? Number(selectedSectionId) : undefined,
        roleCode: selectedRoleCode || undefined,
        institutionId: institutionId || undefined,
      };

      const res = await fetch("/api/admin/generate/bulk", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.recipients)) {
        setRecipients(json.recipients);
        setSelectedRecipientIds(new Set(json.recipients.map((r: any) => r.id)));
      } else {
        setRecipients([]);
        setSelectedRecipientIds(new Set());
      }
    } catch {
      setRecipients([]);
      setSelectedRecipientIds(new Set());
    } finally {
      setLoadingPreview(false);
    }
  }, [accessToken, audience, institutionId, scopeType, selectedProgramId, selectedRoleCode, selectedSectionId]);

  useEffect(() => {
    if (open) {
      void fetchRecipientsPreview();
    }
  }, [open, fetchRecipientsPreview]);

  // Handle Select All / None
  const handleToggleSelectAll = () => {
    if (selectedRecipientIds.size === recipients.length) {
      setSelectedRecipientIds(new Set());
    } else {
      setSelectedRecipientIds(new Set(recipients.map((r) => r.id)));
    }
  };

  const handleToggleRecipient = (id: number) => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered recipients by local search
  const visibleRecipients = useMemo(() => {
    if (!searchFilter.trim()) return recipients;
    const q = searchFilter.toLowerCase().trim();
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.identifier.toLowerCase().includes(q) ||
        r.subtext.toLowerCase().includes(q)
    );
  }, [recipients, searchFilter]);

  // Execute Bulk Generation
  const handleExecuteBulkGenerate = async () => {
    if (!selectedTemplateId) {
      toast.error("Please select a template to generate");
      return;
    }
    const ids = Array.from(selectedRecipientIds);
    if (ids.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    setGenerating(true);
    setProgress(15);
    try {
      const payload = {
        action: "generate",
        audience,
        templateId: selectedTemplateId,
        recipientIds: ids,
        institutionId: institutionId || undefined,
      };

      setProgress(40);
      const res = await fetch("/api/admin/generate/bulk", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      setProgress(85);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Bulk generation failed");

      setProgress(100);
      setGeneratedCount(json.count || ids.length);
      setGenerationDone(true);
      toast.success(`Successfully generated ${json.count || ids.length} documents!`);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Bulk generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId);
  }, [templates, selectedTemplateId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-4xl !w-[94vw] max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/20 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <Zap className="size-5 text-primary" />
                <span>Bulk Document &amp; Card Generator</span>
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Generate and save ID cards, certificates, and letters in bulk for entire institute, classes, or sections.
              </DialogDescription>
            </div>
            <Badge variant="outline" className="font-bold text-xs">
              ⚡ Batch Generator
            </Badge>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {generationDone ? (
            /* SUCCESS CELEBRATION SCREEN */
            <div className="py-12 text-center space-y-4">
              <div className="size-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                <Check className="size-8 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-foreground">
                  {generatedCount} Documents Generated Successfully!
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  All generated cards and documents for selected {audience === "student" ? "students" : "staff"} have been saved into your Documents history.
                </p>
              </div>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    onViewDocuments?.();
                  }}
                  className="gap-2 bg-primary text-primary-foreground font-bold shadow-xs cursor-pointer"
                >
                  <FileText className="size-4" />
                  View in Documents
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setGenerationDone(false);
                    setProgress(0);
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <RefreshCw className="size-4" />
                  Generate More
                </Button>
              </div>
            </div>
          ) : (
            /* STEP-BY-STEP WIZARD */
            <>
              {/* STEP 1: AUDIENCE SELECTOR */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Step 1: Choose Target Audience
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAudience("student");
                      setScopeType("all");
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                      audience === "student"
                        ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/30"
                        : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg ${audience === "student" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      <GraduationCap className="size-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">Students &amp; Learners</p>
                      <p className="text-[11px] text-muted-foreground">ID Cards, Certificates, Marksheets, Bonafide</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAudience("staff");
                      setScopeType("all");
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                      audience === "staff"
                        ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/30"
                        : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg ${audience === "staff" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      <Users className="size-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">Staff &amp; Teachers</p>
                      <p className="text-[11px] text-muted-foreground">Staff ID, Offer Letters, Salary Slips, Experience</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* STEP 2: CATEGORY & TEMPLATE SELECTION */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Step 2: Select Category &amp; Template
                  </Label>
                  <div className="w-full sm:w-64">
                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All {audience === "student" ? "Student" : "Staff"} Categories</SelectItem>
                        {filteredCategories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredTemplates.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                    No active templates available in this category.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-1">
                    {filteredTemplates.map((t) => {
                      const isSelected = t.id === selectedTemplateId;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTemplateId(t.id)}
                          className={`group relative flex flex-col rounded-xl border bg-card p-2.5 transition-all cursor-pointer hover:border-primary/60 hover:shadow-xs ${
                            isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg bg-muted border mb-2">
                            {t.thumbnail_url ? (
                              <Image
                                src={t.thumbnail_url}
                                alt={t.name}
                                fill
                                sizes="160px"
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-muted-foreground">
                                <FileText className="size-6 opacity-40" />
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                                <Check className="size-3 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          <p className="font-bold text-xs text-foreground line-clamp-1">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{t.category_name}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STEP 3: SCOPE & TARGET CRITERIA */}
              <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Step 3: Choose Scope (Who to generate for?)
                </Label>

                {audience === "student" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setScopeType("all")}
                        className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                          scopeType === "all"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        🏢 Entire Institution
                      </button>

                      <button
                        type="button"
                        onClick={() => setScopeType("program")}
                        className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                          scopeType === "program"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        📚 Class / Program Wise
                      </button>

                      <button
                        type="button"
                        onClick={() => setScopeType("section")}
                        className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                          scopeType === "section"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        👥 Section Wise
                      </button>
                    </div>

                    {/* Class & Section Pickers */}
                    {(scopeType === "program" || scopeType === "section") && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Select Class / Program *</Label>
                          <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Choose Class / Program..." />
                            </SelectTrigger>
                            <SelectContent>
                              {programs.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {scopeType === "section" && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Select Section *</Label>
                            <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Choose Section..." />
                              </SelectTrigger>
                              <SelectContent>
                                {sections.map((s) => (
                                  <SelectItem key={s.id} value={String(s.id)}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Staff Scope Selection */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setScopeType("all")}
                        className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                          scopeType === "all"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        🏢 All Active Staff
                      </button>

                      <button
                        type="button"
                        onClick={() => setScopeType("role")}
                        className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                          scopeType === "role"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        🏷️ Role / Designation Wise
                      </button>
                    </div>

                    {scopeType === "role" && (
                      <div className="space-y-1.5 pt-2 max-w-sm">
                        <Label className="text-xs">Select Staff Role *</Label>
                        <Select value={selectedRoleCode} onValueChange={setSelectedRoleCode}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Choose Staff Role..." />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => (
                              <SelectItem key={r.id} value={r.code}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* STEP 4: RECIPIENTS PREVIEW & SELECTION */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Recipients ({selectedRecipientIds.size} / {recipients.length} Selected)
                    </Label>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {selectedRecipientIds.size} will be generated
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-48">
                      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Search list..."
                        className="h-7 pl-8 text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleToggleSelectAll}
                      className="h-7 text-xs px-2.5 cursor-pointer"
                    >
                      {selectedRecipientIds.size === recipients.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                </div>

                {loadingPreview ? (
                  <div className="flex h-36 items-center justify-center gap-2 rounded-xl border bg-card text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    Finding matching {audience === "student" ? "students" : "staff"}...
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground">
                    No active {audience === "student" ? "students" : "staff"} match the selected criteria.
                  </div>
                ) : (
                  <div className="rounded-xl border bg-card divide-y max-h-56 overflow-y-auto">
                    {visibleRecipients.map((r) => {
                      const isChecked = selectedRecipientIds.has(r.id);
                      return (
                        <div
                          key={r.id}
                          onClick={() => handleToggleRecipient(r.id)}
                          className={`flex items-center justify-between p-2.5 text-xs transition-colors cursor-pointer hover:bg-muted/40 ${
                            isChecked ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Checkbox checked={isChecked} onCheckedChange={() => handleToggleRecipient(r.id)} />
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate">{r.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {r.identifier} • {r.subtext}
                              </p>
                            </div>
                          </div>

                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {r.subtext}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* GENERATION PROGRESS BAR */}
              {generating && (
                <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4 animate-pulse">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      Generating {selectedRecipientIds.size} documents in bulk...
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!generationDone && (
          <DialogFooter className="px-6 py-3 border-t bg-muted/20 shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExecuteBulkGenerate}
              disabled={generating || selectedRecipientIds.size === 0 || !selectedTemplateId}
              className="gap-2 bg-primary text-primary-foreground font-bold shadow-xs cursor-pointer"
            >
              {generating ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              Generate {selectedRecipientIds.size} Documents
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

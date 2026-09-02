"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Sparkles,
  GraduationCap,
  Users,
  IdCard,
  FileText,
  Filter,
  CheckCircle2,
  X,
  RefreshCw,
  Layers,
  UserCheck,
  ChevronRight,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { BulkGenerateDialog } from "@/components/card-templates/bulk-generate-dialog";
import { CardTemplateTryout } from "@/components/card-templates/card-template-tryout";
import { GeneratedDocumentsDialog } from "@/components/card-templates/generated-documents-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import type { DocumentTemplateRow } from "@/lib/types/document-template";
import { useAuthStore } from "@/store";

type TargetAudience = "student" | "staff";

type CardCategory = {
  id: number;
  name: string;
  slug?: string;
  target_audience?: "student" | "staff";
};

type SelectedPerson = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  identifier?: string | null; // Roll number or employee code
  subtext?: string | null; // Class/Program or Designation
  avatarUrl?: string | null;
  institutionName?: string | null;
};

export default function AdminGenerateDocumentPage() {
  useAdminGuard();
  const { user, accessToken } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);

  // Audience & Category State
  // Platform Admin defaults to staff only (no platform student records)
  const [audience, setAudience] = useState<TargetAudience>(isPlatformAdmin ? "staff" : "student");
  const [categories, setCategories] = useState<CardCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    if (isPlatformAdmin) {
      setAudience("staff");
    }
  }, [isPlatformAdmin]);

  // Person (Student or Staff) Search & Selection State
  const [personSearch, setPersonSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<SelectedPerson | null>(null);
  const [personSearchResults, setPersonSearchResults] = useState<SelectedPerson[]>([]);
  const [searchingPeople, setSearchingPeople] = useState(false);
  const [personDropdownOpen, setPersonDropdownOpen] = useState(false);

  // Templates State
  const [templates, setTemplates] = useState<DocumentTemplateRow[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplateRow | null>(null);
  const [generatorModalOpen, setGeneratorModalOpen] = useState(false);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [, setDetailLoading] = useState(false);

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch("/api/admin/master-data/card-categories?limit=100", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setCategories(json.data);
      }
    } catch {
      // ignore
    }
  }, [accessToken]);

  // Fetch Templates
  const fetchTemplates = useCallback(async () => {
    if (!accessToken) return;
    setLoadingTemplates(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "100",
        view: "generate",
      });
      if (activeInstitutionId && !isPlatformAdmin) {
        params.set("institutionId", String(activeInstitutionId));
      }

      const res = await fetch(`/api/admin/master-data/card-templates?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setTemplates(json.data);
      } else {
        setTemplates([]);
      }
    } catch {
      toast.error("Failed to load document templates");
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, [accessToken, activeInstitutionId, isPlatformAdmin]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Search Students or Staff
  useEffect(() => {
    if (!accessToken || !personSearch.trim()) {
      setPersonSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingPeople(true);
      try {
        if (audience === "student" && !isPlatformAdmin) {
          const params = new URLSearchParams({
            search: personSearch.trim(),
            limit: "10",
          });
          if (activeInstitutionId) params.set("institutionId", String(activeInstitutionId));

          const res = await fetch(`/api/admin/students?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const json = await res.json();
          if (res.ok && Array.isArray(json.data)) {
            const mapped: SelectedPerson[] = json.data.map((s: any) => ({
              id: s.id,
              name: s.full_name || s.name || "Student",
              email: s.email,
              phone: s.phone,
              role: "Student",
              identifier: s.admission_number || s.roll_number || `STU-${s.id}`,
              subtext: s.program_name ? `${s.program_name}${s.section_name ? ` (${s.section_name})` : ""}` : "Student",
              avatarUrl: s.avatar_url || s.photo_url || s.image_url,
              institutionName: s.institution_name,
            }));
            setPersonSearchResults(mapped);
          }
        } else {
          // Staff Search - for platform admin, returns ONLY staff added by platform admin
          const params = new URLSearchParams({
            search: personSearch.trim(),
            staffScope: "all",
            limit: "10",
          });
          if (activeInstitutionId && !isPlatformAdmin) {
            params.set("institutionId", String(activeInstitutionId));
          }

          const res = await fetch(`/api/admin/users?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const json = await res.json();
          if (res.ok && Array.isArray(json.data)) {
            const mapped: SelectedPerson[] = json.data.map((u: any) => ({
              id: u.id,
              name: u.full_name || "Staff Member",
              email: u.email,
              phone: u.phone,
              role: u.role_name || u.role_code || (Array.isArray(u.roles) && u.roles[0]) || "Staff",
              identifier: u.employee_code || `EMP-${u.id}`,
              subtext: u.designation_name || (Array.isArray(u.roles) && u.roles[0]) || "Staff",
              avatarUrl: u.avatar_url || u.photo_url || u.image_url,
              institutionName: u.institution_name,
            }));
            setPersonSearchResults(mapped);
          }
        }
      } catch {
        // ignore
      } finally {
        setSearchingPeople(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [accessToken, activeInstitutionId, audience, isPlatformAdmin, personSearch]);

  // Categories filtered by Audience
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (!c.target_audience) return true;
      return c.target_audience === audience;
    });
  }, [audience, categories]);

  // Filtered Templates
  const displayedTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      // Check audience
      const tplAudience = tpl.category_target_audience || "student";
      if (tplAudience !== audience) return false;

      // Check category
      if (selectedCategory !== "all" && String(tpl.card_category_id) !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [audience, selectedCategory, templates]);

  // Handle Opening Generator
  const handleOpenGenerator = async (template: DocumentTemplateRow) => {
    if (!accessToken) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/master-data/card-templates?action=detail&id=${template.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setSelectedTemplate(json.data);
      } else {
        setSelectedTemplate(template);
      }
      setGeneratorModalOpen(true);
    } catch {
      setSelectedTemplate(template);
      setGeneratorModalOpen(true);
    } finally {
      setDetailLoading(false);
    }
  };

  const selectedCategoryObj = useMemo(() => {
    if (selectedCategory === "all") return null;
    return categories.find((c) => String(c.id) === selectedCategory);
  }, [categories, selectedCategory]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-amber-500/5 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Document & Card Generator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Document Generator
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              {isPlatformAdmin
                ? "Select a card category, choose a staff member, and generate live staff ID cards, offer letters, certificates, and salary slips."
                : "Choose student or staff audience, select a card category, choose a template, and generate live ID cards, certificates, letters, and documents."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              className="text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
            >
              <Zap className="w-4 h-4" /> Bulk Generate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchCategories();
                fetchTemplates();
              }}
              className="text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* Audience Switcher Pills (Only shown for Institution Admin who has students) */}
        {!isPlatformAdmin && (
          <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-border/40">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">
              Generate For:
            </span>
            <button
              type="button"
              onClick={() => {
                setAudience("student");
                setSelectedCategory("all");
                setSelectedPerson(null);
                setPersonSearch("");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                audience === "student"
                  ? "bg-primary text-primary-foreground shadow-md scale-102 ring-2 ring-primary/30"
                  : "bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground border border-border/80"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Students ({templates.filter((t) => (t.category_target_audience || "student") === "student").length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAudience("staff");
                setSelectedCategory("all");
                setSelectedPerson(null);
                setPersonSearch("");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                audience === "staff"
                  ? "bg-primary text-primary-foreground shadow-md scale-102 ring-2 ring-primary/30"
                  : "bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground border border-border/80"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff & Teachers ({templates.filter((t) => t.category_target_audience === "staff").length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters & Action Bar: Category, Select Staff/Student, Choose Template Button */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-card p-4 rounded-xl border border-border/60 shadow-xs">
        {/* 1. Category Filter */}
        <div className="md:col-span-4 space-y-1.5">
          <Label className="text-xs font-bold flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-primary" />
            <span>Card / Document Category</span>
          </Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">
                <span className="font-semibold">All {audience === "student" ? "Student" : "Staff"} Categories</span>
              </SelectItem>
              {filteredCategories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 2. Person (Staff Member / Student) Filter */}
        <div className="md:col-span-5 space-y-1.5 relative">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-primary" />
              <span>Select {audience === "student" ? "Student" : "Staff Member"} (Optional)</span>
            </Label>
            {selectedPerson && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPerson(null);
                  setPersonSearch("");
                }}
                className="text-[10px] text-destructive hover:underline font-semibold"
              >
                Clear selection
              </button>
            )}
          </div>

          {selectedPerson ? (
            <div className="flex items-center justify-between h-9 px-3 rounded-md border border-primary/40 bg-primary/5 text-xs">
              <div className="flex items-center gap-2 truncate">
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                  {selectedPerson.name.charAt(0)}
                </div>
                <span className="font-bold text-foreground truncate">{selectedPerson.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">({selectedPerson.identifier})</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPerson(null)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Input
                value={personSearch}
                onChange={(e) => {
                  setPersonSearch(e.target.value);
                  setPersonDropdownOpen(true);
                }}
                onFocus={() => setPersonDropdownOpen(true)}
                placeholder={
                  audience === "student"
                    ? "Search student name or roll no..."
                    : "Search staff name or designation..."
                }
                className="h-9 text-xs bg-background pr-8"
              />
              {searchingPeople && (
                <div className="absolute right-2.5 top-2.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Autocomplete Dropdown */}
              {personDropdownOpen && personSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto divide-y divide-border/40">
                  {personSearchResults.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => {
                        setSelectedPerson(person);
                        setPersonSearch(person.name);
                        setPersonDropdownOpen(false);
                      }}
                      className="w-full text-left p-2.5 hover:bg-muted/80 transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-foreground">{person.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {person.identifier} • {person.subtext}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Select
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Documents Button */}
        <div className="md:col-span-3 space-y-1.5 flex flex-col justify-end">
          <Label className="text-xs font-bold flex items-center gap-1.5 opacity-0 pointer-events-none hidden md:flex">
            <span>Documents</span>
          </Label>
          <Button
            type="button"
            onClick={() => setDocumentsModalOpen(true)}
            className="h-9 w-full text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Documents</span>
          </Button>
        </div>
      </div>

      {/* Selected Person Banner if chosen */}
      {selectedPerson && (
        <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-base shadow-2xs">
              {selectedPerson.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-foreground">{selectedPerson.name}</h3>
                <Badge className="text-[10px] h-4.5 bg-primary text-primary-foreground font-semibold">
                  {selectedPerson.role || (audience === "student" ? "Student" : "Staff")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                ID: <span className="font-mono font-bold text-foreground">{selectedPerson.identifier}</span> • {selectedPerson.subtext}
                {selectedPerson.email ? ` • ${selectedPerson.email}` : ""}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-semibold text-primary">Data will auto-fill into template</p>
            <span className="text-[10px] text-muted-foreground">Choose any template below to generate</span>
          </div>
        </div>
      )}

      {/* Templates Gallery Section */}
      <div id="templates-gallery-section" className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>
                Available {selectedCategoryObj ? `"${selectedCategoryObj.name}"` : (audience === "student" ? "Student" : "Staff")} Templates
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Showing {displayedTemplates.length} document & card template{displayedTemplates.length === 1 ? "" : "s"} in {selectedCategoryObj ? selectedCategoryObj.name : "all categories"}
            </p>
          </div>
        </div>

        {loadingTemplates ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl border border-border/60 bg-card p-4 space-y-3">
                <Skeleton className="h-36 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : displayedTemplates.length === 0 ? (
          <div className="text-center py-16 px-4 bg-muted/20 border border-dashed rounded-2xl space-y-3">
            <IdCard className="w-12 h-12 text-muted-foreground mx-auto stroke-[1.5]" />
            <h3 className="font-bold text-sm text-foreground">No document templates found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No active templates match the selected {audience} category. Try selecting "All Categories".
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCategory("all");
              }}
              className="text-xs font-semibold"
            >
              Show All Categories
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedTemplates.map((template) => (
              <Card
                key={template.id}
                className="group relative overflow-hidden border border-border/60 hover:border-primary/50 transition-all hover:shadow-md flex flex-col justify-between bg-card"
              >
                <div>
                  {/* Thumbnail / Live Preview Box */}
                  <div className="relative h-44 w-full bg-muted/40 border-b border-border/40 overflow-hidden flex items-center justify-center p-2 group-hover:bg-muted/60 transition">
                    {template.thumbnail_url ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={template.thumbnail_url}
                          alt={template.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          className="object-contain rounded transition duration-200 group-hover:scale-103"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-1.5 p-4 text-center">
                        <IdCard className="w-10 h-10 text-primary/40" />
                        <span className="text-[11px] font-medium text-foreground/80 line-clamp-1">{template.name}</span>
                        <span className="text-[9px] text-muted-foreground">Click to preview and generate</span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <Badge className="text-[9px] font-bold h-4.5 bg-background/90 text-foreground border border-border/80 shadow-2xs backdrop-blur-xs">
                        {template.category_name || "General"}
                      </Badge>
                    </div>

                    <div className="absolute top-2 right-2">
                      <Badge
                        variant={template.category_target_audience === "staff" ? "secondary" : "default"}
                        className="text-[9px] font-semibold h-4.5"
                      >
                        {template.category_target_audience === "staff" ? "Staff" : "Student"}
                      </Badge>
                    </div>
                  </div>

                  {/* Body Info */}
                  <CardHeader className="p-3.5 pb-2">
                    <CardTitle className="text-sm font-black text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground line-clamp-1">
                      {template.category_name} • {template.field_count || 0} fields
                    </CardDescription>
                  </CardHeader>
                </div>

                {/* Footer Action */}
                <CardFooter className="p-3.5 pt-0">
                  <Button
                    onClick={() => handleOpenGenerator(template)}
                    className="w-full text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer h-9"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Document</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Full Screen Live Generator Modal */}
      <Dialog open={generatorModalOpen} onOpenChange={setGeneratorModalOpen}>
        <DialogContent className="!max-w-[96vw] sm:!max-w-[96vw] md:!max-w-[96vw] lg:!max-w-[96vw] xl:!max-w-[96vw] !w-[96vw] sm:!w-[96vw] md:!w-[96vw] h-[94vh] max-h-[94vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-5 py-3 border-b bg-muted/30 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-black flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Generate Document: {selectedTemplate?.name}</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedTemplate?.category_name} • {selectedTemplate?.category_target_audience === "staff" ? "Staff Document" : "Student Document"}
                  {selectedPerson ? ` • Mapped to: ${selectedPerson.name} (${selectedPerson.identifier})` : ""}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden p-0 bg-background min-h-0">
            {selectedTemplate && (
              <CardTemplateTryout
                template={selectedTemplate}
                accessToken={accessToken}
                institutionId={activeInstitutionId || undefined}
                isInstitutionTryout={true}
                initialStudentId={selectedPerson?.id}
                initialStudentName={selectedPerson?.name}
                lockStudentSelection={false}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Generated Documents History Modal */}
      <GeneratedDocumentsDialog
        open={documentsModalOpen}
        onOpenChange={setDocumentsModalOpen}
        accessToken={accessToken}
        audience={audience}
        categories={categories}
        institutionId={activeInstitutionId || undefined}
      />

      {/* Bulk Document & Card Generator Modal */}
      <BulkGenerateDialog
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        accessToken={accessToken}
        templates={templates}
        categories={categories}
        institutionId={activeInstitutionId || undefined}
        onSuccess={() => {
          fetchTemplates();
        }}
        onViewDocuments={() => {
          setDocumentsModalOpen(true);
        }}
      />
    </div>
  );
}

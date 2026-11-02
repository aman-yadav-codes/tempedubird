"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Building2,
  FileText,
  Filter,
  X,
  RefreshCw,
  Layers,
  UserCheck,
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
import type { DocumentTemplateRow } from "@/lib/types/document-template";
import { useAuthStore } from "@/store";

type CardCategory = {
  id: number;
  name: string;
  slug?: string;
  target_audience?: "student" | "staff" | "client";
};

type SelectedClient = {
  id: number;
  name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  identifier?: string | null;
  subtext?: string | null;
  avatarUrl?: string | null;
};

interface AdminGenerateDocumentPageProps {
  sourceSection?: "operation" | "administration" | "sales";
}

export default function AdminGenerateDocumentPage({
  sourceSection: propSourceSection,
}: AdminGenerateDocumentPageProps = {}) {
  useAdminGuard();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Determine section: operation vs administration vs sales
  const section: "operation" | "administration" | "sales" = useMemo(() => {
    if (propSourceSection) return propSourceSection;
    if (pathname?.includes("/administration/")) return "administration";
    if (pathname?.includes("/sales/")) return "sales";
    if (pathname?.includes("/operations/")) return "operation";
    const q = searchParams?.get("section");
    if (q === "administration" || q === "sales" || q === "operation") return q;
    return "operation";
  }, [propSourceSection, pathname, searchParams]);

  const isOperation = section === "operation";
  const isAdministration = section === "administration";

  const { user, accessToken } = useAuthStore();
  const {
    institutions,
    activeInstitution,
    activeInstitutionId,
    setActiveInstitutionId,
  } = useActiveInstitution();
  const currentInstitutionId = activeInstitutionId ?? activeInstitution?.id ?? (institutions.length > 0 ? institutions[0].id : null);
  const currentInstitution = institutions.find((i) => i.id === currentInstitutionId) ?? activeInstitution ?? institutions[0] ?? null;

  // Categories State
  const [categories, setCategories] = useState<CardCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Client Search & Selection State (Exclusively Clients, never students or staff)
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const [clientSearchResults, setClientSearchResults] = useState<SelectedClient[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  // Templates State
  const [templates, setTemplates] = useState<DocumentTemplateRow[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplateRow | null>(null);
  const [generatorModalOpen, setGeneratorModalOpen] = useState(false);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [, setDetailLoading] = useState(false);

  // Find Project Documentation Category for Operations
  const projDocCategory = useMemo(() => {
    return categories.find((c) => c.slug === "project-documentation" || c.name.toLowerCase() === "project documentation");
  }, [categories]);

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
      if (currentInstitutionId) {
        params.set("institutionId", String(currentInstitutionId));
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
  }, [accessToken, currentInstitutionId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Search Clients (Clients ONLY, never students or staff)
  useEffect(() => {
    if (!accessToken) {
      setClientSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingClients(true);
      try {
        const params = new URLSearchParams({
          limit: "25",
        });
        if (clientSearch.trim()) params.set("search", clientSearch.trim());
        if (currentInstitutionId) params.set("institution_id", String(currentInstitutionId));

        const res = await fetch(`/api/admin/sales/clients?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await res.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json.clients) ? json.clients : [];
        const mapped: SelectedClient[] = list.map((c: any) => ({
          id: c.id,
          name: c.name || c.company_name || `Client #${c.id}`,
          company_name: c.company_name,
          email: c.email,
          phone: c.phone,
          role: c.company_name ? `${c.company_name} (Client)` : "Client",
          identifier: `CLI-${c.id}`,
          subtext: c.company_name ? `${c.company_name} • ${c.email || c.phone || ""}` : (c.email || c.phone || "Client Partner"),
          avatarUrl: c.profile_image,
        }));
        setClientSearchResults(mapped);
      } catch {
        // ignore
      } finally {
        setSearchingClients(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [accessToken, currentInstitutionId, clientSearch]);

  // Filtered Categories based on section
  const availableCategories = useMemo(() => {
    if (isOperation) {
      // Operation section: category is Project Documentation
      return projDocCategory ? [projDocCategory] : categories.filter((c) => c.slug === "project-documentation");
    }
    // Administration & Sales section: all existing available document categories
    return categories.filter((c) => c.slug !== "project-documentation");
  }, [isOperation, categories, projDocCategory]);

  // Filtered Templates
  const displayedTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      if (selectedCategory !== "all" && String(tpl.card_category_id) !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [selectedCategory, templates]);

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
              <span>
                {isOperation
                  ? "Operation • Document Generator"
                  : isAdministration
                  ? "Administration • Document Generator"
                  : "Sales • Document Generator"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {isOperation
                ? "Generate Project Documentation"
                : isAdministration
                ? "Generate Administrative Documents"
                : "Generate Sales Documents"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              {isOperation
                ? "Generate client project documentation, deliverables, and official records. All documents generated here are automatically categorised as Project Documentation for clients."
                : "Generate administrative letters, certificates, agreements, and official records using existing system categories exclusively for clients."}
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

        {/* Exclusively For Clients Badge Strip */}
        <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-border/40">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">
            Document For:
          </span>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-xs">
            <Building2 className="w-4 h-4" />
            <span>Clients Only</span>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium ml-2">
            <span>Category:</span>
            <Badge variant="outline" className="font-bold text-xs bg-background/80">
              {isOperation
                ? "Project Documentation (Auto-Assigned)"
                : "Existing System Categories"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Filters & Action Bar: Category, Select Client, Documents Button */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-card p-4 rounded-xl border border-border/60 shadow-xs">
        {/* 1. Category Filter */}
        <div className="md:col-span-4 space-y-1.5">
          <Label className="text-xs font-bold flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-primary" />
            <span>Document Category</span>
          </Label>
          {isOperation ? (
            <div className="h-9 px-3 rounded-md border border-primary/30 bg-primary/5 flex items-center text-xs font-bold text-primary">
              Project Documentation
            </div>
          ) : (
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="All Available Categories" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">
                  <span className="font-semibold">All Available Categories</span>
                </SelectItem>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* 2. Client Selection (Exclusively Clients, never students or staff) */}
        <div className="md:col-span-5 space-y-1.5 relative">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-primary" />
              <span>Select Client (Optional)</span>
            </Label>
            {selectedClient && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClient(null);
                  setClientSearch("");
                }}
                className="text-[10px] text-destructive hover:underline font-semibold"
              >
                Clear selection
              </button>
            )}
          </div>

          {selectedClient ? (
            <div className="flex items-center justify-between h-9 px-3 rounded-md border border-primary/40 bg-primary/5 text-xs">
              <div className="flex items-center gap-2 truncate">
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                  {selectedClient.name.charAt(0)}
                </div>
                <span className="font-bold text-foreground truncate">{selectedClient.name}</span>
                {selectedClient.company_name && (
                  <span className="text-[10px] text-muted-foreground">({selectedClient.company_name})</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClient(null)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Input
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setClientDropdownOpen(true);
                }}
                onFocus={() => setClientDropdownOpen(true)}
                onBlur={() => setTimeout(() => setClientDropdownOpen(false), 250)}
                placeholder="Search client by name, company, email..."
                className="h-9 text-xs bg-background pr-8"
              />
              {searchingClients && (
                <div className="absolute right-2.5 top-2.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Autocomplete Dropdown */}
              {clientDropdownOpen && clientSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto divide-y divide-border/40">
                  {clientSearchResults.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setSelectedClient(client);
                        setClientSearch(client.name);
                        setClientDropdownOpen(false);
                      }}
                      className="w-full text-left p-2.5 hover:bg-muted/80 transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-foreground">{client.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {client.subtext}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Select Client
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
            <span>Generated Documents</span>
          </Button>
        </div>
      </div>

      {/* Selected Client Banner if chosen */}
      {selectedClient && (
        <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-base shadow-2xs">
              {selectedClient.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-foreground">{selectedClient.name}</h3>
                <Badge className="text-[10px] h-4.5 bg-primary text-primary-foreground font-semibold">
                  Client Partner
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Company: <span className="font-semibold text-foreground">{selectedClient.company_name || selectedClient.name}</span>
                {selectedClient.email ? ` • ${selectedClient.email}` : ""}
                {selectedClient.phone ? ` • ${selectedClient.phone}` : ""}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-semibold text-primary">Client details will auto-fill into template</p>
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
                Available Templates for Clients
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Showing {displayedTemplates.length} document template{displayedTemplates.length === 1 ? "" : "s"} ready for client document generation
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
            <FileText className="w-12 h-12 text-muted-foreground mx-auto stroke-[1.5]" />
            <h3 className="font-bold text-sm text-foreground">No document templates found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No active templates match the selected filter. Try selecting "All Categories".
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
                        <FileText className="w-10 h-10 text-primary/40" />
                        <span className="text-[11px] font-medium text-foreground/80 line-clamp-1">{template.name}</span>
                        <span className="text-[9px] text-muted-foreground">Click to preview and generate</span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <Badge className="text-[9px] font-bold h-4.5 bg-background/90 text-foreground border border-border/80 shadow-2xs backdrop-blur-xs">
                        {isOperation ? "Project Documentation" : (template.category_name || "General")}
                      </Badge>
                    </div>

                    <div className="absolute top-2 right-2">
                      <Badge
                        variant="outline"
                        className="text-[9px] font-bold h-4.5 bg-primary/10 text-primary border-primary/30"
                      >
                        Client
                      </Badge>
                    </div>
                  </div>

                  {/* Body Info */}
                  <CardHeader className="p-3.5 pb-2">
                    <CardTitle className="text-sm font-black text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground line-clamp-1">
                      {isOperation ? "Project Documentation" : template.category_name} • {template.field_count || 0} fields
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
                  Category: {isOperation ? "Project Documentation" : (selectedTemplate?.category_name || "General")} • Document For: Client
                  {selectedClient ? ` • Client: ${selectedClient.name} (${selectedClient.company_name || selectedClient.identifier})` : ""}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden p-0 bg-background min-h-0">
            {selectedTemplate && (
              <CardTemplateTryout
                template={selectedTemplate}
                accessToken={accessToken}
                institutionId={currentInstitutionId || undefined}
                isInstitutionTryout={true}
                initialStudentId={selectedClient?.id}
                initialStudentName={selectedClient?.name}
                lockStudentSelection={false}
                recipientType="client"
                sourceSection={section}
                overrideCategoryId={isOperation ? (projDocCategory?.id || 70) : (selectedCategory !== "all" ? Number(selectedCategory) : null)}
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
        audience="client"
        sourceSection={section}
        categories={categories}
        institutionId={currentInstitutionId || undefined}
      />

      {/* Bulk Document & Card Generator Modal */}
      <BulkGenerateDialog
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        accessToken={accessToken}
        templates={templates}
        categories={categories}
        institutionId={currentInstitutionId || undefined}
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

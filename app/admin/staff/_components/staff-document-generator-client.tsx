"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Printer,
  Download,
  Eye,
  Trash2,
  Sparkles,
  ChevronRight,
  Check,
  Loader2,
  Building2,
  Users,
  ShieldCheck,
  LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAdminGuard } from "@/hooks/use-admin-guard";

export type StaffDocType =
  | "experience_letter"
  | "offer_letter"
  | "salary_slip"
  | "certificate"
  | "appreciation_certificate";

export type StaffOption = {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  institution_id: number;
  institution_name: string;
  institution_address?: string | null;
  institution_email?: string | null;
  institution_phone?: string | null;
  institution_logo?: string | null;
  role_label: string;
  role_code: string;
  designation_name?: string | null;
  joining_date: string;
};

export type DocTemplate = {
  id: number;
  name: string;
  html_template: string;
  version: number;
  category_name: string;
  category_slug: string;
  fields?: { field_name: string; label: string; field_type: string; is_required: boolean }[];
};

export type GeneratedDocRow = {
  id: number;
  institution_id: number;
  institution_name: string;
  staff_user_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  template_id: number;
  template_name: string;
  card_category_id: number;
  category_name: string;
  title: string;
  letter_type: string;
  rendered_html: string;
  field_values: Record<string, string>;
  image_url: string | null;
  pdf_url: string | null;
  created_at: string;
  generated_by_name: string | null;
};

function getLogoSrc(logo?: string | null, name?: string) {
  if (logo && logo.trim().length > 0 && !logo.includes("{{")) return logo.trim();
  const initials = (name?.trim() || "EB").slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="18" fill="#2563eb"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="44" font-weight="800" fill="#ffffff">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function renderTemplateHtml(templateHtml: string, values: Record<string, string>) {
  let output = templateHtml;

  // Replace logo with valid image source URL or SVG data URI
  const logoSrc = getLogoSrc(values.institutionLogo, values.institutionName);
  output = output.replace(/{{\s*institutionLogo\s*}}/g, logoSrc);

  // Replace all other fields
  Object.entries(values).forEach(([key, val]) => {
    if (key === "institutionLogo") return;
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    output = output.replace(regex, val || "");
  });

  return output;
}

export function formatDateDisplay(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function generateDocRefNumber(prefix: string, staffId: number) {
  const year = new Date().getFullYear();
  const rand = Math.floor(100 + Math.random() * 900);
  return `${prefix}/${year}/${staffId}-${rand}`;
}

export type StaffDocumentGeneratorProps = {
  docType: StaffDocType;
  apiEndpoint: string;
  title: string;
  subtitle: string;
  entityName: string;
  icon?: LucideIcon;
  defaultRefPrefix?: string;
  renderCustomFields: (
    form: Record<string, string>,
    setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>
  ) => React.ReactNode;
  mapStaffToDefaultFields: (
    staff: StaffOption,
    currentUser: { full_name?: string | null } | null,
    isPlatformAdmin: boolean
  ) => Record<string, string>;
};

export function StaffDocumentGeneratorClient({
  docType,
  apiEndpoint,
  title,
  subtitle,
  entityName,
  icon: PageIcon = FileText,
  defaultRefPrefix = "DOC",
  renderCustomFields,
  mapStaffToDefaultFields,
}: StaffDocumentGeneratorProps) {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const isPlatformAdmin = Boolean(user?.role_codes?.includes("platform_admin") || user?.is_super_admin);

  const authHeaders = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  const [letters, setLetters] = useState<GeneratedDocRow[]>([]);
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);

  // Preview zoom level (percentage): [20, 40, 60, 70, 80, 90, 100]
  const [zoomLevel, setZoomLevel] = useState<number>(70);

  // Generate Wizard Modal state
  const [generateOpen, setGenerateOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<DocTemplate | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [fieldForm, setFieldForm] = useState<Record<string, string>>({});
  const [savingLetter, setSavingLetter] = useState(false);

  // View / Print Modal state
  const [previewLetter, setPreviewLetter] = useState<GeneratedDocRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GeneratedDocRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const previewCanvasRef = useRef<HTMLDivElement>(null);

  // Load generated documents
  const loadLetters = useCallback(async () => {
    if (!isReady || !authHeaders) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        doc_type: docType,
      });
      if (search.trim()) params.set("search", search.trim());
      if (activeInstitution?.id && !isPlatformAdmin) {
        params.set("institutionId", String(activeInstitution.id));
      }

      const res = await fetch(`${apiEndpoint}?${params.toString()}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch documents");

      setLetters(data.data || []);
      setTotal(data.total || 0);
      setPageCount(data.pageCount || 1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [activeInstitution?.id, apiEndpoint, authHeaders, docType, isPlatformAdmin, isReady, page, search]);

  // Apply staff fields to form
  const applyStaffDetails = useCallback(
    (staff: StaffOption) => {
      const mapped = mapStaffToDefaultFields(staff, user, isPlatformAdmin);
      setFieldForm((prev) => ({
        ...prev,
        ...mapped,
        referenceNumber: mapped.referenceNumber || generateDocRefNumber(defaultRefPrefix, staff.id),
      }));
    },
    [defaultRefPrefix, isPlatformAdmin, mapStaffToDefaultFields, user]
  );

  // Load available templates and staff members
  const loadTemplatesAndStaff = useCallback(async () => {
    if (!isReady || !authHeaders) return;
    try {
      const instParam = !isPlatformAdmin && activeInstitution?.id ? `&institutionId=${activeInstitution.id}` : "";
      const [tRes, sRes] = await Promise.all([
        fetch(`${apiEndpoint}?view=templates&doc_type=${docType}`, { headers: authHeaders }),
        fetch(`${apiEndpoint}?view=staff-options${instParam}`, { headers: authHeaders }),
      ]);

      const tData = await tRes.json();
      const sData = await sRes.json();

      if (tRes.ok && Array.isArray(tData.data)) {
        setTemplates(tData.data);
      }
      if (sRes.ok && Array.isArray(sData.data)) {
        setStaffList(sData.data);
        if (sData.data.length > 0 && !selectedStaffId) {
          const first = sData.data[0];
          setSelectedStaffId(String(first.id));
          applyStaffDetails(first);
        }
      }
    } catch (err: unknown) {
      console.error("Failed to load templates or staff:", err);
    }
  }, [activeInstitution?.id, apiEndpoint, applyStaffDetails, authHeaders, docType, isPlatformAdmin, isReady, selectedStaffId]);

  useEffect(() => {
    loadLetters();
  }, [loadLetters]);

  useEffect(() => {
    loadTemplatesAndStaff();
  }, [loadTemplatesAndStaff]);

  // Handle staff selection and auto-fill
  const handleStaffSelect = (staffIdStr: string) => {
    setSelectedStaffId(staffIdStr);
    const staff = staffList.find((s) => String(s.id) === staffIdStr);
    if (!staff) return;
    applyStaffDetails(staff);
  };

  // Select a template to start generation
  const handleSelectTemplate = (template: DocTemplate) => {
    setSelectedTemplate(template);
    setStep(2);

    const targetStaff = (selectedStaffId && staffList.find((s) => String(s.id) === selectedStaffId)) || staffList[0];
    if (targetStaff) {
      setSelectedStaffId(String(targetStaff.id));
      applyStaffDetails(targetStaff);
    }
  };

  // Preview HTML computed in real-time
  const computedHtml = useMemo(() => {
    if (!selectedTemplate) return "";
    return renderTemplateHtml(selectedTemplate.html_template, fieldForm);
  }, [selectedTemplate, fieldForm]);

  // Save generated document
  const handleSaveDocument = async () => {
    if (!selectedTemplate || !selectedStaffId) {
      toast.error("Please select a template and staff member");
      return;
    }

    const staff = staffList.find((s) => String(s.id) === selectedStaffId);
    const institutionId = staff?.institution_id || activeInstitution?.id || 1;

    setSavingLetter(true);
    try {
      const title = `${entityName} - ${fieldForm.employeeName || staff?.full_name || "Staff"}`;
      const payload = {
        institutionId,
        staffUserId: Number(selectedStaffId),
        templateId: selectedTemplate.id,
        cardCategoryId: (selectedTemplate as unknown as { card_category_id?: number }).card_category_id,
        title,
        letterType: docType,
        renderedHtml: computedHtml,
        fieldValues: fieldForm,
        canvasWidth: 794,
        canvasHeight: 1080,
      };

      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save document");

      toast.success(`${entityName} generated and archived successfully!`);
      setGenerateOpen(false);
      setStep(1);
      loadLetters();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error saving document");
    } finally {
      setSavingLetter(false);
    }
  };

  // Delete generated document
  const handleDeleteDocument = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${apiEndpoint}?id=${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete document");

      toast.success(`${entityName} deleted`);
      setDeleteTarget(null);
      loadLetters();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error deleting record");
    } finally {
      setDeleting(false);
    }
  };

  // Instant Print
  const handlePrint = (html: string) => {
    if (!printFrameRef.current) return;
    const frameDoc = printFrameRef.current.contentDocument || printFrameRef.current.contentWindow?.document;
    if (!frameDoc) return;

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${entityName}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      printFrameRef.current?.contentWindow?.focus();
      printFrameRef.current?.contentWindow?.print();
    }, 400);
  };

  // Instant PDF Download
  const handleDownloadPdf = async (html: string, filename: string) => {
    const toastId = toast.loading("Generating high-resolution PDF...");
    try {
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.top = "-9999px";
      container.style.left = "-9999px";
      container.style.width = "794px";
      container.style.background = "#ffffff";
      container.innerHTML = html;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${filename.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`);

      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to generate PDF", { id: toastId });
    }
  };

  // Instant PNG Download
  const handleDownloadPng = async (html: string, filename: string) => {
    const toastId = toast.loading("Generating PNG Image...");
    try {
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.top = "-9999px";
      container.style.left = "-9999px";
      container.style.width = "794px";
      container.style.background = "#ffffff";
      container.innerHTML = html;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(container);

      const link = document.createElement("a");
      link.download = `${filename.replace(/[^a-zA-Z0-9-_]/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("PNG downloaded successfully!", { id: toastId });
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to generate PNG", { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden Print Iframe */}
      <iframe ref={printFrameRef} className="hidden" title="Print Frame" />

      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <PageIcon className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadLetters();
              loadTemplatesAndStaff();
            }}
          >
            Refresh
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/master-data/card-templates">Templates Library</Link>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              loadTemplatesAndStaff();
              setStep(1);
              setGenerateOpen(true);
            }}
            className="gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            Generate {entityName}
          </Button>
        </div>
      </div>

      {/* STATS SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Total Issued {entityName}s
            </CardTitle>
            <PageIcon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{total}</div>
            <p className="text-xs text-muted-foreground mt-1">Archived securely in database</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Card Templates Available
            </CardTitle>
            <Building2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{templates.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Under category library</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Active Staff Members
            </CardTitle>
            <Users className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{staffList.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for auto-fill</p>
          </CardContent>
        </Card>
      </div>

      {/* ARCHIVED LETTERS TABLE */}
      <Card className="shadow-xs">
        <CardHeader className="p-4 sm:p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">Issued {entityName} Archive</CardTitle>
              <CardDescription className="text-xs">
                View, print, or download issued documents at any time.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by staff name, title, email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin mb-2" />
              <p className="text-xs">Loading records...</p>
            </div>
          ) : letters.length === 0 ? (
            <div className="p-12 text-center border-t">
              <PageIcon className="size-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-foreground">No {entityName.toLowerCase()}s issued yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Choose from your templates to generate, customize, and issue official documents.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  loadTemplatesAndStaff();
                  setStep(1);
                  setGenerateOpen(true);
                }}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                Generate Now
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Document Title &amp; Template</th>
                    <th className="px-4 py-3">Issued On</th>
                    <th className="px-4 py-3">Generated By</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {letters.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-foreground">{row.full_name}</div>
                        <div className="text-xs text-muted-foreground">{row.email || row.phone || "-"}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{row.institution_name}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-foreground">{row.title}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {row.template_name}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-foreground">{formatDateDisplay(row.created_at)}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">
                        {row.generated_by_name || "Platform Admin"}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewLetter(row)}
                            title="Preview"
                            className="h-8 gap-1 px-2 text-xs"
                          >
                            <Eye className="size-3.5" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPdf(row.rendered_html, row.title)}
                            title="Download PDF"
                            className="h-8 gap-1 px-2 text-xs"
                          >
                            <Download className="size-3.5" />
                            PDF
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(row.rendered_html)}
                            title="Print"
                            className="h-8 gap-1 px-2 text-xs"
                          >
                            <Printer className="size-3.5" />
                            Print
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(row)}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GENERATE DOCUMENT WIZARD MODAL */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="!w-[96vw] !max-w-[1400px] h-[92vh] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-xl shadow-2xl">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b bg-muted/20 shrink-0">
            <div className="flex items-center justify-between pr-8">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  Generate Official {entityName}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {step === 1
                    ? `Step 1: Choose a template from your ${entityName} card category`
                    : `Step 2: Customize details for ${selectedTemplate?.name}`}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className={`px-2.5 py-1 rounded-full ${step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  1. Template
                </span>
                <ChevronRight className="size-3 text-muted-foreground" />
                <span className={`px-2.5 py-1 rounded-full ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  2. Customize &amp; Issue
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* STEP 1: SELECT TEMPLATE */}
          {step === 1 && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4 [scrollbar-width:thin]">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Available {entityName} Templates</h3>
                <p className="text-xs text-muted-foreground">
                  Select any of the templates created in your Card Categories library.
                </p>
              </div>

              {templates.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed rounded-lg">
                  <p className="text-sm font-semibold">No templates found</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Add card templates under &quot;{entityName}&quot; category in Master Data.
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/admin/master-data/card-templates">Go to Card Templates</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className="group relative cursor-pointer border rounded-xl p-4 bg-card hover:border-primary hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                            {tpl.name}
                          </h4>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            v{tpl.version}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Category: <span className="font-medium text-foreground">{tpl.category_name}</span>
                        </p>

                        {/* Mini preview container */}
                        <div className="w-full h-44 bg-muted/40 rounded-md border overflow-hidden relative flex items-center justify-center p-2">
                          <div
                            className="origin-top scale-[0.28] pointer-events-none select-none"
                            dangerouslySetInnerHTML={{
                              __html: renderTemplateHtml(tpl.html_template, {
                                institutionName: "Maa Sharda Institute",
                                employeeName: "Vikash Gupta",
                                designation: "Academic Faculty",
                                department: "Operations",
                                joiningDate: "01 Aug 2022",
                                relievingDate: "31 Aug 2026",
                                issueDate: "01 Sep 2026",
                                referenceNumber: "REF/2026/01",
                                signatoryName: "Deepak Yadav",
                                signatoryDesignation: "Director",
                                payMonth: "August",
                                payYear: "2026",
                                basicSalary: "₹35,000",
                                hraAllowance: "₹10,000",
                                grossSalary: "₹45,000",
                                netSalary: "₹42,000",
                                trainingTopic: "Advanced Pedagogical Leadership",
                                completionDate: "15 Aug 2026",
                                certificateNumber: "CERT-2026-88",
                                awardTitle: "Excellence in Teaching Award",
                                recognitionYear: "2025-2026",
                                appreciationReason: "Exemplary dedication to institutional excellence.",
                              }),
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{tpl.fields?.length || 15} Dynamic Fields</span>
                        <Button size="sm" variant="default" className="h-7 text-xs gap-1">
                          Select Template
                          <ChevronRight className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: STAFF SELECTION & DYNAMIC FORM + PREVIEW */}
          {step === 2 && selectedTemplate && (
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x">
              {/* Form Controls Column */}
              <div className="w-full md:w-[440px] lg:w-[480px] shrink-0 bg-card flex flex-col h-full overflow-hidden">
                <div className="flex-1 p-5 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground)/0.4)_transparent]">
                  <div className="space-y-4 pr-1">
                    {/* Staff Select */}
                    <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">
                        Select Staff Member *
                      </Label>
                      <Select value={selectedStaffId} onValueChange={handleStaffSelect}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Choose an employee to auto-fill..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {staffList.length === 0 ? (
                            <div className="p-3 text-xs text-center text-muted-foreground">
                              No staff members found
                            </div>
                          ) : (
                            staffList.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                <div className="flex flex-col text-left py-0.5 max-w-[360px]">
                                  <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                                    <span>{s.full_name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                      {s.role_label}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground truncate">
                                    {s.institution_name} {s.email ? `• ${s.email}` : s.phone ? `• ${s.phone}` : ""}
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dynamic Form Inputs rendered by parent */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                        Document Details
                      </h4>
                      {renderCustomFields(fieldForm, setFieldForm)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Live Preview Column */}
              <div className="flex-1 bg-slate-100 dark:bg-slate-900/60 p-4 sm:p-6 flex flex-col items-center justify-start overflow-y-auto overflow-x-auto h-full [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground)/0.4)_transparent]">
                <div className="w-full max-w-[850px] flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Eye className="size-3.5 text-primary" />
                      Live A4 Preview:
                    </span>
                    <div className="flex items-center bg-background rounded-md border p-0.5 text-xs font-medium shadow-xs">
                      <button
                        type="button"
                        onClick={() => setZoomLevel((prev) => Math.max(20, prev - 10))}
                        className="px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground font-bold hover:bg-muted"
                        title="Zoom Out"
                      >
                        -
                      </button>
                      {[20, 40, 60, 70, 80, 90, 100].map((z) => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => setZoomLevel(z)}
                          className={`px-1.5 sm:px-2 py-0.5 rounded text-[11px] transition-colors ${
                            zoomLevel === z
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {z}%
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setZoomLevel((prev) => Math.min(100, prev + 10))}
                        className="px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground font-bold hover:bg-muted"
                        title="Zoom In"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(computedHtml)}
                      className="h-8 text-xs gap-1.5 bg-background shadow-xs"
                    >
                      <Printer className="size-3.5" />
                      Print
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPdf(computedHtml, `${fieldForm.employeeName || "Staff"}-${entityName}`)}
                      className="h-8 text-xs gap-1.5 bg-background shadow-xs"
                    >
                      <Download className="size-3.5" />
                      PDF
                    </Button>
                  </div>
                </div>

                <div className="w-full flex justify-center py-2 pb-28 overflow-visible">
                  <div
                    className="border rounded-xl shadow-2xl bg-white overflow-hidden origin-top transform-gpu transition-transform duration-150 shrink-0"
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      width: "794px",
                      minHeight: "1080px",
                      marginBottom: `${Math.max(20, (zoomLevel / 100) * 80)}px`,
                    }}
                  >
                    <div
                      ref={previewCanvasRef}
                      dangerouslySetInnerHTML={{ __html: computedHtml }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="p-4 border-t bg-muted/10 shrink-0 flex items-center justify-between">
            {step === 2 ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                  &larr; Back to Templates
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPdf(computedHtml, `${fieldForm.employeeName || "Staff"}-${entityName}`)}
                  >
                    <Download className="size-3.5 mr-1" />
                    Download PDF
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveDocument}
                    disabled={savingLetter}
                    className="gap-1.5 bg-primary font-semibold"
                  >
                    {savingLetter ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    Save {entityName}
                  </Button>
                </div>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setGenerateOpen(false)}>
                Cancel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW / PREVIEW SAVED LETTER MODAL */}
      <Dialog open={Boolean(previewLetter)} onOpenChange={(open) => !open && setPreviewLetter(null)}>
        <DialogContent className="!w-[96vw] !max-w-[1100px] h-[92vh] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-xl shadow-2xl">
          <DialogHeader className="p-4 pb-2 border-b bg-muted/20 flex flex-row items-center justify-between shrink-0 pr-8">
            <div>
              <DialogTitle className="text-base font-bold">{previewLetter?.title}</DialogTitle>
              <DialogDescription className="text-xs">
                Issued for {previewLetter?.full_name} ({previewLetter?.institution_name})
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex-1 p-6 bg-slate-100 dark:bg-slate-900/60 overflow-y-auto flex justify-center [scrollbar-width:thin]">
            <div className="border rounded-lg shadow-xl bg-white overflow-hidden origin-top scale-[0.7] sm:scale-[0.85] lg:scale-[0.95] transform-gpu my-2">
              {previewLetter && (
                <div dangerouslySetInnerHTML={{ __html: previewLetter.rendered_html }} />
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/10 shrink-0 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setPreviewLetter(null)}>
              Close
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => previewLetter && handleDownloadPng(previewLetter.rendered_html, previewLetter.title)}
              >
                <Download className="size-3.5 mr-1.5" />
                PNG Image
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => previewLetter && handleDownloadPdf(previewLetter.rendered_html, previewLetter.title)}
              >
                <Download className="size-3.5 mr-1.5" />
                PDF Document
              </Button>
              <Button
                size="sm"
                onClick={() => previewLetter && handlePrint(previewLetter.rendered_html)}
                className="gap-1.5 font-semibold"
              >
                <Printer className="size-3.5" />
                Print
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {entityName}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the record for &quot;{deleteTarget?.full_name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

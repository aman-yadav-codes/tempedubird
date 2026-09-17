"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  GraduationCap,
  IdCard,
  MoreHorizontal,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

import { ResponsiveHtmlCanvas } from "@/components/card-templates/responsive-html-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { getApiErrorMessage, readJsonResponse } from "@/lib/auth/client-permission-errors";
import { formatIndianDate } from "@/lib/format-time";
import { useAuthStore } from "@/store";


export type GeneratedDocument = {
  id: number;
  title: string;
  document_kind: "id_card" | "generated_document";
  category_name: string;
  category_slug?: string;
  image_url: string | null;
  pdf_url: string | null;
  rendered_html?: string;
  canvas_width?: number | null;
  canvas_height?: number | null;
  version: number;
  status?: string;
  created_at: string;
  updated_at?: string;
  institution_name?: string;
  generated_by_name?: string | null;
};

export type UploadedDocument = {
  id: number;
  document_kind: "uploaded_document";
  document_type: string;
  document_number: string | null;
  file_url: string;
  is_verified: boolean;
  resource_type: string | null;
  created_at: string;
  updated_at?: string;
  verified_by_name: string | null;
};

type ApiResponse = {
  data?: {
    id?: number;
    title?: string;
    image_url?: string | null;
    rendered_html?: string;
    canvas_width?: number | null;
    canvas_height?: number | null;
    version?: number;
    created_at?: string;
    institution_name?: string;
    generated_by_name?: string | null;
    primaryIdCard?: GeneratedDocument | null;
    idCards?: GeneratedDocument[];
    generatedDocuments?: GeneratedDocument[];
    uploadedDocuments?: UploadedDocument[];
  } | null;
};

function downloadPng(title: string, imageUrl?: string | null) {
  if (!imageUrl) {
    toast.error("Image file not available for download");
    return;
  }
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.click();
}

function downloadPdf(title: string, imageUrl?: string | null, existingPdfUrl?: string | null) {
  if (existingPdfUrl) {
    const link = document.createElement("a");
    link.href = existingPdfUrl;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
    return;
  }
  if (!imageUrl) {
    toast.error("Document file not available for PDF download");
    return;
  }

  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => {
    try {
      const pdf = new jsPDF({
        orientation: image.width > image.height ? "landscape" : "portrait",
        unit: "px",
        format: [image.width, image.height],
      });
      pdf.addImage(imageUrl, "PNG", 0, 0, image.width, image.height);
      pdf.save(`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch {
      window.open(imageUrl, "_blank");
    }
  };
  image.onerror = () => {
    window.open(imageUrl, "_blank");
  };
  image.src = imageUrl;
}

export default function StudentIdCardPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [idCards, setIdCards] = useState<GeneratedDocument[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [primaryIdCard, setPrimaryIdCard] = useState<GeneratedDocument | null>(null);

  // Preview Dialog state
  const [previewDoc, setPreviewDoc] = useState<GeneratedDocument | UploadedDocument | null>(null);

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

  const loadDocuments = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/classroom/id-card", {
        headers: authHeader,
        cache: "no-store",
      });
      const payload = (await readJsonResponse(response)) as ApiResponse;
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to load student documents"));

      const data = payload.data;
      if (data) {
        const fetchedIdCards = Array.isArray(data.idCards) ? data.idCards : [];
        const fetchedGenDocs = Array.isArray(data.generatedDocuments) ? data.generatedDocuments : [];
        const fetchedUploadedDocs = Array.isArray(data.uploadedDocuments) ? data.uploadedDocuments : [];

        // Fallback if older API format
        const primary = data.primaryIdCard || (data.id ? (data as unknown as GeneratedDocument) : null) || fetchedIdCards[0] || null;

        setIdCards(fetchedIdCards.length > 0 ? fetchedIdCards : primary ? [primary] : []);
        setGeneratedDocs(fetchedGenDocs);
        setUploadedDocs(fetchedUploadedDocs);
        setPrimaryIdCard(primary);
      } else {
        setIdCards([]);
        setGeneratedDocs([]);
        setUploadedDocs([]);
        setPrimaryIdCard(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load documents");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void loadDocuments(), 0);
    return () => window.clearTimeout(timeout);
  }, [isReady, loadDocuments]);

  // Combined documents list
  const allDocs = useMemo(() => {
    const combined: Array<GeneratedDocument | UploadedDocument> = [
      ...idCards,
      ...generatedDocs,
      ...uploadedDocs,
    ];
    return combined;
  }, [idCards, generatedDocs, uploadedDocs]);

  // Filtered lists
  const filteredAllDocs = useMemo(() => {
    if (!searchQuery.trim()) return allDocs;
    const q = searchQuery.toLowerCase().trim();
    return allDocs.filter((doc) => {
      if ("title" in doc && doc.title?.toLowerCase().includes(q)) return true;
      if ("category_name" in doc && doc.category_name?.toLowerCase().includes(q)) return true;
      if ("document_type" in doc && doc.document_type?.toLowerCase().includes(q)) return true;
      if ("document_number" in doc && doc.document_number?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [allDocs, searchQuery]);

  const filteredIdCards = useMemo(() => {
    if (!searchQuery.trim()) return idCards;
    const q = searchQuery.toLowerCase().trim();
    return idCards.filter((c) => c.title?.toLowerCase().includes(q));
  }, [idCards, searchQuery]);

  const filteredGeneratedDocs = useMemo(() => {
    if (!searchQuery.trim()) return generatedDocs;
    const q = searchQuery.toLowerCase().trim();
    return generatedDocs.filter((d) => 
      d.title?.toLowerCase().includes(q) || d.category_name?.toLowerCase().includes(q)
    );
  }, [generatedDocs, searchQuery]);

  const filteredUploadedDocs = useMemo(() => {
    if (!searchQuery.trim()) return uploadedDocs;
    const q = searchQuery.toLowerCase().trim();
    return uploadedDocs.filter((u) => 
      u.document_type?.toLowerCase().includes(q) || u.document_number?.toLowerCase().includes(q)
    );
  }, [uploadedDocs, searchQuery]);

  if (!isReady || loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-[480px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <IdCard className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Documents & ID Cards</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                All official identity cards, generated certificates, and documents added by your institution.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadDocuments()}
            className="gap-1.5 cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer transition-all border shadow-xs hover:shadow-sm ${
            activeTab === "id-cards" ? "border-primary/60 bg-primary/5" : "bg-card"
          }`}
          onClick={() => setActiveTab("id-cards")}
        >
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-muted-foreground">Student ID Cards</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UserCheck className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold">{idCards.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active institutional identity cards</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border shadow-xs hover:shadow-sm ${
            activeTab === "generated" ? "border-primary/60 bg-primary/5" : "bg-card"
          }`}
          onClick={() => setActiveTab("generated")}
        >
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-muted-foreground">Generated Certificates & Reports</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Award className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold">{generatedDocs.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">TC, Result Cards & Certificates</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border shadow-xs hover:shadow-sm ${
            activeTab === "uploaded" ? "border-primary/60 bg-primary/5" : "bg-card"
          }`}
          onClick={() => setActiveTab("uploaded")}
        >
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold text-muted-foreground">Institutional Uploads</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold">{uploadedDocs.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Aadhar, Birth Certificate, Records</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs and Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <TabsList className="bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="all" className="gap-1.5 text-xs font-semibold">
              <span>All Documents</span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] ml-0.5">
                {allDocs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="id-cards" className="gap-1.5 text-xs font-semibold">
              <IdCard className="size-3.5" />
              <span>ID Cards</span>
              {idCards.length > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] ml-0.5">
                  {idCards.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="generated" className="gap-1.5 text-xs font-semibold">
              <Award className="size-3.5" />
              <span>Generated Certificates</span>
              {generatedDocs.length > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] ml-0.5">
                  {generatedDocs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="uploaded" className="gap-1.5 text-xs font-semibold">
              <FileCheck className="size-3.5" />
              <span>Uploaded Documents</span>
              {uploadedDocs.length > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] ml-0.5">
                  {uploadedDocs.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
        </div>

        {/* Tab 1: All Documents */}
        <TabsContent value="all" className="space-y-4">
          {filteredAllDocs.length === 0 ? (
            <EmptyDocumentsCard onRefresh={loadDocuments} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAllDocs.map((doc) =>
                doc.document_kind === "uploaded_document" ? (
                  <UploadedDocCard
                    key={`uploaded-${doc.id}`}
                    doc={doc as UploadedDocument}
                    onPreview={() => setPreviewDoc(doc)}
                  />
                ) : (
                  <GeneratedDocCard
                    key={`gen-${doc.id}-${doc.document_kind}`}
                    doc={doc as GeneratedDocument}
                    onPreview={() => setPreviewDoc(doc)}
                  />
                )
              )}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: ID Cards */}
        <TabsContent value="id-cards" className="space-y-4">
          {filteredIdCards.length === 0 ? (
            <EmptyDocumentsCard message="No identity cards have been published for this enrollment yet." onRefresh={loadDocuments} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIdCards.map((card) => (
                <GeneratedDocCard
                  key={`idcard-${card.id}`}
                  doc={card}
                  onPreview={() => setPreviewDoc(card)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Generated Certificates & Reports */}
        <TabsContent value="generated" className="space-y-4">
          {filteredGeneratedDocs.length === 0 ? (
            <EmptyDocumentsCard message="No generated certificates or report cards issued yet." onRefresh={loadDocuments} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGeneratedDocs.map((doc) => (
                <GeneratedDocCard
                  key={`gen-doc-${doc.id}`}
                  doc={doc}
                  onPreview={() => setPreviewDoc(doc)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Uploaded Documents */}
        <TabsContent value="uploaded" className="space-y-4">
          {filteredUploadedDocs.length === 0 ? (
            <EmptyDocumentsCard message="No official documents have been uploaded by the institution yet." onRefresh={loadDocuments} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUploadedDocs.map((doc) => (
                <UploadedDocCard
                  key={`upload-doc-${doc.id}`}
                  doc={doc}
                  onPreview={() => setPreviewDoc(doc)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Document Fullscreen / Preview Dialog */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between gap-3 pr-6">
              <div>
                <DialogTitle className="text-xl font-bold">
                  {previewDoc ? ("title" in previewDoc ? previewDoc.title : previewDoc.document_type) : "Document Preview"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {previewDoc && "created_at" in previewDoc && `Issued / Added on ${formatIndianDate(previewDoc.created_at)}`}
                </DialogDescription>
              </div>

              {previewDoc && (
                <div className="flex items-center gap-2">
                  {"image_url" in previewDoc && previewDoc.image_url && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadPng(previewDoc.title, previewDoc.image_url)}
                        className="gap-1.5 text-xs"
                      >
                        <Download className="size-3.5" />
                        <span>PNG</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => downloadPdf(previewDoc.title, previewDoc.image_url, previewDoc.pdf_url)}
                        className="gap-1.5 text-xs"
                      >
                        <FileText className="size-3.5" />
                        <span>PDF</span>
                      </Button>
                    </>
                  )}
                  {"file_url" in previewDoc && previewDoc.file_url && (
                    <Button
                      size="sm"
                      variant="default"
                      asChild
                      className="gap-1.5 text-xs"
                    >
                      <a href={previewDoc.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-3.5" />
                        <span>Open File</span>
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="py-4 flex justify-center items-center min-h-[360px] bg-slate-100 dark:bg-slate-900/60 rounded-xl overflow-hidden border">
            {previewDoc && "image_url" in previewDoc && previewDoc.image_url ? (
              <img
                src={previewDoc.image_url}
                alt={previewDoc.title}
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-sm"
              />
            ) : previewDoc && "rendered_html" in previewDoc && previewDoc.rendered_html ? (
              <div className="w-full flex justify-center overflow-auto p-2">
                <ResponsiveHtmlCanvas
                  html={previewDoc.rendered_html}
                  title={previewDoc.title}
                />
              </div>
            ) : previewDoc && "file_url" in previewDoc && previewDoc.file_url ? (
              <div className="text-center p-8 space-y-4">
                <FileCheck className="size-16 text-emerald-500 mx-auto" />
                <div>
                  <h3 className="text-lg font-bold">{previewDoc.document_type}</h3>
                  {previewDoc.document_number && (
                    <p className="text-xs text-muted-foreground mt-1">Number: {previewDoc.document_number}</p>
                  )}
                </div>
                <Button asChild size="sm">
                  <a href={previewDoc.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4 mr-2" />
                    Open Document in New Tab
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Document content preview is unavailable.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-component: Card for Generated Certificates & ID Cards
function GeneratedDocCard({
  doc,
  onPreview,
}: {
  doc: GeneratedDocument;
  onPreview: () => void;
}) {
  const isIdCard = doc.document_kind === "id_card" || doc.category_slug === "id-card";

  return (
    <Card className="rounded-2xl border shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group bg-card">
      <CardHeader className="p-4 pb-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold px-2 py-0.5 ${
              isIdCard
                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
            }`}
          >
            {isIdCard ? (
              <span className="flex items-center gap-1">
                <IdCard className="size-2.5" />
                <span>{doc.category_name || "ID Card"}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Award className="size-2.5" />
                <span>{doc.category_name || "Certificate"}</span>
              </span>
            )}
          </Badge>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
            v{doc.version || 1}
          </Badge>
        </div>

        <CardTitle className="text-sm font-bold truncate leading-tight" title={doc.title}>
          {doc.title}
        </CardTitle>
        <CardDescription className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Clock className="size-3" />
          <span>Issued {formatIndianDate(doc.created_at)}</span>
          {doc.generated_by_name && <span className="truncate">by {doc.generated_by_name}</span>}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {/* Preview Thumbnail */}
        <div
          onClick={onPreview}
          className="relative w-full h-36 rounded-xl bg-slate-100 dark:bg-slate-900/60 border overflow-hidden flex items-center justify-center cursor-pointer hover:border-primary/50 transition-all"
        >
          {doc.image_url ? (
            <img
              src={doc.image_url}
              alt={doc.title}
              className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
            />
          ) : doc.rendered_html ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center space-y-2 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              <Award className="size-8 text-primary opacity-60" />
              <span className="text-[11px] font-bold text-foreground line-clamp-2">{doc.title}</span>
              <span className="text-[10px] text-muted-foreground">Click to preview canvas</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground space-y-1">
              <FileText className="size-8 opacity-40" />
              <span className="text-[11px]">Official Certificate</span>
            </div>
          )}

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" className="h-8 text-xs font-bold gap-1 shadow-sm">
              <Eye className="size-3.5" />
              <span>Preview</span>
            </Button>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-0 border-t flex items-center justify-between gap-2 mt-auto bg-muted/20">
        <Button
          size="sm"
          variant="ghost"
          onClick={onPreview}
          className="h-8 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Eye className="size-3.5" />
          <span>View</span>
        </Button>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadPng(doc.title, doc.image_url)}
            disabled={!doc.image_url}
            className="h-8 text-xs font-semibold gap-1 px-2.5 cursor-pointer"
            title="Download PNG"
          >
            <Download className="size-3.5" />
            <span>PNG</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadPdf(doc.title, doc.image_url, doc.pdf_url)}
            disabled={!doc.image_url && !doc.pdf_url}
            className="h-8 text-xs font-semibold gap-1 px-2.5 cursor-pointer"
            title="Download PDF"
          >
            <FileText className="size-3.5" />
            <span>PDF</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

// Sub-component: Card for Uploaded Student Documents (Aadhar, Birth Certificate, etc.)
function UploadedDocCard({
  doc,
  onPreview,
}: {
  doc: UploadedDocument;
  onPreview: () => void;
}) {
  const isImage = Boolean(
    doc.resource_type === "image" ||
    (doc.file_url && /\.(jpe?g|png|webp|gif|svg)($|\?)/i.test(doc.file_url))
  );

  return (
    <Card className="rounded-2xl border shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group bg-card">
      <CardHeader className="p-4 pb-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 flex items-center gap-1"
          >
            <FileCheck className="size-2.5" />
            <span>Uploaded Document</span>
          </Badge>

          {doc.is_verified ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold gap-1">
              <CheckCircle2 className="size-2.5" /> Verified
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-500/10 text-slate-600 border-slate-500/20 font-semibold">
              Added
            </Badge>
          )}
        </div>

        <CardTitle className="text-sm font-bold truncate leading-tight" title={doc.document_type}>
          {doc.document_type}
        </CardTitle>
        <CardDescription className="text-[11px] text-muted-foreground flex items-center justify-between gap-1">
          <span>{doc.document_number ? `No: ${doc.document_number}` : "Institutional record"}</span>
          <span>{formatIndianDate(doc.created_at)}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <div
          onClick={onPreview}
          className="relative w-full h-36 rounded-xl bg-slate-100 dark:bg-slate-900/60 border overflow-hidden flex items-center justify-center cursor-pointer hover:border-emerald-500/50 transition-all"
        >
          {isImage ? (
            <img
              src={doc.file_url}
              alt={doc.document_type}
              className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-3 space-y-2">
              <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600">
                <FileCheck className="size-7" />
              </div>
              <span className="text-xs font-bold text-foreground line-clamp-1">{doc.document_type}</span>
              <span className="text-[10px] text-muted-foreground">Click to view document</span>
            </div>
          )}

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" className="h-8 text-xs font-bold gap-1 shadow-sm">
              <Eye className="size-3.5" />
              <span>View</span>
            </Button>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-0 border-t flex items-center justify-between gap-2 mt-auto bg-muted/20">
        <Button
          size="sm"
          variant="ghost"
          onClick={onPreview}
          className="h-8 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Eye className="size-3.5" />
          <span>View</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          asChild
          className="h-8 text-xs font-semibold gap-1.5 px-3 cursor-pointer"
        >
          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
            <Download className="size-3.5" />
            <span>Download</span>
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Sub-component: Empty State Card
function EmptyDocumentsCard({
  message = "No documents found.",
  onRefresh,
}: {
  message?: string;
  onRefresh: () => void;
}) {
  return (
    <Card className="p-12 text-center border-dashed rounded-2xl">
      <FileText className="size-12 mx-auto text-muted-foreground/40 mb-3" />
      <h3 className="text-base font-bold text-foreground">No Documents Found</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
        {message}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        className="mt-4 gap-1.5 cursor-pointer text-xs"
      >
        <RefreshCw className="size-3.5" />
        <span>Check for Updates</span>
      </Button>
    </Card>
  );
}

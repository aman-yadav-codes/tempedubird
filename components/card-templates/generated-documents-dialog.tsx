"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  FileText,
  Download,
  Printer,
  Trash2,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  Sparkles,
  Layers,
  X,
  RefreshCw,
  ExternalLink,
  IdCard,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveHtmlCanvas } from "@/components/card-templates/responsive-html-canvas";

export type GeneratedDocumentItem = {
  id: number;
  target_audience: "staff" | "student";
  card_category_id: number;
  category_name: string;
  template_id: number;
  template_name: string;
  title: string;
  recipient_id: number;
  recipient_name: string;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  recipient_avatar?: string | null;
  recipient_role?: string | null;
  rendered_html?: string | null;
  image_url?: string | null;
  pdf_url?: string | null;
  canvas_width?: number;
  canvas_height?: number;
  field_values?: Record<string, any>;
  created_at: string;
  generated_by_name?: string | null;
};

type GeneratedDocumentsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
  audience?: "staff" | "student";
  categories: Array<{ id: number; name: string; target_audience?: "staff" | "student" }>;
  institutionId?: number | null;
};

export function GeneratedDocumentsDialog({
  open,
  onOpenChange,
  accessToken,
  audience,
  categories,
  institutionId,
}: GeneratedDocumentsDialogProps) {
  const [documents, setDocuments] = useState<GeneratedDocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [previewDoc, setPreviewDoc] = useState<GeneratedDocumentItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (audience) params.set("audience", audience);
      if (institutionId) params.set("institutionId", String(institutionId));
      if (selectedCategory !== "all") params.set("categoryId", selectedCategory);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/generate/documents?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setDocuments(json.data);
      } else {
        setDocuments([]);
      }
    } catch {
      toast.error("Failed to load generated documents");
    } finally {
      setLoading(false);
    }
  }, [accessToken, audience, institutionId, selectedCategory, search]);

  useEffect(() => {
    if (open) {
      fetchDocuments();
    }
  }, [open, fetchDocuments]);

  // Delete handler
  const handleDelete = async (doc: GeneratedDocumentItem) => {
    if (!accessToken) return;
    if (!confirm(`Are you sure you want to delete "${doc.title}" for ${doc.recipient_name}?`)) return;

    setDeletingId(doc.id);
    try {
      const res = await fetch(`/api/admin/generate/documents?id=${doc.id}&audience=${doc.target_audience}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        toast.success("Document deleted successfully");
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        if (previewDoc?.id === doc.id) setPreviewDoc(null);
      } else {
        toast.error("Failed to delete document");
      }
    } catch {
      toast.error("An error occurred while deleting document");
    } finally {
      setDeletingId(null);
    }
  };

  // Download PDF handler
  const handleDownloadPdf = (doc: GeneratedDocumentItem) => {
    if (doc.image_url) {
      const img = new (window as any).Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const landscape = img.width > img.height;
        const pdf = new jsPDF({
          orientation: landscape ? "landscape" : "portrait",
          unit: "px",
          format: [img.width, img.height],
        });
        pdf.addImage(doc.image_url!, "PNG", 0, 0, img.width, img.height);
        pdf.save(`${doc.title || "generated-document"}-${doc.recipient_name}.pdf`);
        toast.success("PDF downloaded!");
      };
      img.onerror = () => {
        toast.error("Could not load image to generate PDF");
      };
      img.src = doc.image_url;
    } else if (doc.rendered_html) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(doc.rendered_html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    } else {
      toast.error("No preview available to download PDF");
    }
  };

  // Filtered documents by search & category
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (selectedCategory !== "all" && String(doc.card_category_id) !== selectedCategory) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = doc.title?.toLowerCase().includes(q);
        const matchName = doc.recipient_name?.toLowerCase().includes(q);
        const matchCategory = doc.category_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchName && !matchCategory) return false;
      }
      return true;
    });
  }, [documents, selectedCategory, search]);

  // Categories list
  const availableCategories = useMemo(() => {
    const list = audience ? categories.filter((c) => !c.target_audience || c.target_audience === audience) : categories;
    return list;
  }, [audience, categories]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-[96vw] sm:!max-w-[96vw] md:!max-w-[96vw] !w-[96vw] sm:!w-[96vw] h-[92vh] max-h-[92vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30 shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-black flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>Generated Documents History</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  View, preview, print, and download previously generated documents organized by category.
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchDocuments}
                  className="text-xs font-semibold gap-1.5 h-8"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-border/40">
              {/* Category Filter */}
              <div className="sm:col-span-6 md:col-span-4">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-8.5 text-xs bg-background">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="all">
                      <span className="font-semibold">All Categories</span>
                    </SelectItem>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Bar */}
              <div className="sm:col-span-6 md:col-span-5 relative">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, staff name, or student..."
                  className="h-8.5 text-xs bg-background pr-8"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status counter */}
              <div className="hidden md:flex md:col-span-3 items-center justify-end text-xs text-muted-foreground font-semibold">
                <span>{filteredDocs.length} Document{filteredDocs.length === 1 ? "" : "s"} Found</span>
              </div>
            </div>
          </DialogHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-background">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-xl border border-border/60 p-4 space-y-3">
                    <Skeleton className="h-36 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-20 px-4 bg-muted/20 border border-dashed rounded-2xl space-y-3">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto stroke-[1.5]" />
                <h3 className="font-bold text-sm text-foreground">No generated documents found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {selectedCategory !== "all" || search
                    ? "No documents match the selected category and search filters."
                    : "No documents have been generated yet. Use the generator to create and save documents."}
                </p>
                {(selectedCategory !== "all" || search) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCategory("all");
                      setSearch("");
                    }}
                    className="text-xs font-semibold"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="group relative rounded-xl border border-border/60 bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Document Preview Box */}
                      <div className="relative h-48 bg-muted/40 border-b border-border/40 overflow-hidden flex items-center justify-center p-2 group-hover:bg-muted/60 transition">
                        {doc.image_url ? (
                          <div className="relative w-full h-full">
                            <Image
                              src={doc.image_url}
                              alt={doc.title}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                              className="object-contain rounded transition duration-200 group-hover:scale-102"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-muted-foreground gap-1.5 p-4 text-center">
                            <FileText className="w-10 h-10 text-primary/40" />
                            <span className="text-[11px] font-medium text-foreground/80 line-clamp-1">{doc.title}</span>
                          </div>
                        )}

                        <div className="absolute top-2 left-2">
                          <Badge className="text-[9px] font-bold h-4.5 bg-background/90 text-foreground border border-border/80 shadow-2xs backdrop-blur-xs">
                            {doc.category_name}
                          </Badge>
                        </div>

                        <div className="absolute top-2 right-2">
                          <Badge
                            variant={doc.target_audience === "staff" ? "secondary" : "default"}
                            className="text-[9px] font-semibold h-4.5"
                          >
                            {doc.target_audience === "staff" ? "Staff" : "Student"}
                          </Badge>
                        </div>
                      </div>

                      {/* Info Body */}
                      <div className="p-3.5 space-y-2">
                        <div>
                          <h4 className="font-bold text-xs text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {doc.title}
                          </h4>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-primary" />
                            <span className="font-semibold text-foreground">{doc.recipient_name}</span>
                            {doc.recipient_role ? ` • ${doc.recipient_role}` : ""}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(doc.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          {doc.generated_by_name && (
                            <span className="truncate max-w-[110px]" title={`By ${doc.generated_by_name}`}>
                              By {doc.generated_by_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="p-3 pt-0 flex items-center gap-1.5 border-t border-border/20 mt-1">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => setPreviewDoc(doc)}
                        className="flex-1 text-[11px] font-semibold h-8 gap-1 bg-primary text-primary-foreground cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPdf(doc)}
                        className="text-[11px] font-semibold h-8 px-2.5 gap-1 cursor-pointer"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-primary" />
                        <span>PDF</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc)}
                        disabled={deletingId === doc.id}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Detail / Full Preview Modal */}
      {previewDoc && (
        <Dialog open={Boolean(previewDoc)} onOpenChange={(open) => !open && setPreviewDoc(null)}>
          <DialogContent className="!max-w-[90vw] sm:!max-w-[90vw] md:!max-w-[90vw] !w-[90vw] sm:!w-[90vw] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 py-3 border-b bg-muted/30 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-black flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>{previewDoc.title}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {previewDoc.category_name} • For {previewDoc.recipient_name}
                    {previewDoc.recipient_email ? ` (${previewDoc.recipient_email})` : ""}
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPdf(previewDoc)}
                    className="text-xs font-semibold gap-1.5 h-8"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    <span>Download PDF</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (previewDoc.rendered_html) {
                        const win = window.open("", "_blank");
                        if (win) {
                          win.document.write(previewDoc.rendered_html);
                          win.document.close();
                          win.focus();
                          win.print();
                        }
                      } else if (previewDoc.image_url) {
                        const win = window.open("", "_blank");
                        if (win) {
                          win.document.write(`<img src="${previewDoc.image_url}" style="max-width:100%;" onload="window.print()"/>`);
                          win.document.close();
                        }
                      }
                    }}
                    className="text-xs font-semibold gap-1.5 h-8"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-hidden p-4 bg-muted/20 flex items-center justify-center">
              {previewDoc.rendered_html ? (
                <div className="w-full h-full flex items-center justify-center overflow-auto">
                  <ResponsiveHtmlCanvas
                    html={previewDoc.rendered_html}
                    title={previewDoc.title}
                  />
                </div>
              ) : previewDoc.image_url ? (
                <div className="relative w-full h-full flex items-center justify-center p-4">
                  <img
                    src={previewDoc.image_url}
                    alt={previewDoc.title}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg border"
                  />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No preview available</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

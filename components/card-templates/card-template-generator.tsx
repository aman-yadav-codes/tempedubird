"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import {
  Braces,
  Download,
  FileText,
  ImageIcon,
  Loader2,
  MoreHorizontal,
  Save,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import {
  TemplateResizableHandle,
  TemplateResizablePanel,
  TemplateResizablePanelGroup,
} from "@/components/card-templates/template-resizable";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentTemplateField } from "@/lib/types/document-template";
import type { TemplateCanvasExport } from "@/components/card-templates/template-canvas-preview";
import { renderTemplateHtmlToPng } from "@/components/card-templates/render-template-preview";

const TemplateCanvasPreview = dynamic(
  () => import("@/components/card-templates/template-canvas-preview"),
  { ssr: false }
);

type CategoryOption = {
  id: number;
  name: string;
  target_audience?: "student" | "staff";
};

type GeneratedField = {
  name: string;
  label: string;
  type: DocumentTemplateField["field_type"];
  isRequired: boolean;
  sampleValue: string;
};

type GeneratedTemplate = {
  templateName: string;
  html: string;
  fields: GeneratedField[];
};

type CardTemplateGeneratorProps = {
  accessToken: string | null;
  categories: CategoryOption[];
  onSaved: () => void;
};

type GeneratorStatus = "idle" | "generating" | "rendering" | "success" | "error";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function applyFieldValues(
  html: string,
  fields: GeneratedField[],
  values: Record<string, string>
) {
  return fields.reduce((result, field) => {
    const replacement = field.type === "image"
      ? values[field.name] || ""
      : escapeHtml(values[field.name] || field.label);
    return result.replaceAll(`{{${field.name}}}`, replacement);
  }, html);
}

function defaultFieldValue(field: GeneratedField, selectedImage: string | null) {
  if (field.type === "image") return selectedImage ?? "";
  if (field.sampleValue.trim()) return field.sampleValue.trim();
  if (field.type === "date") return new Date().toISOString().slice(0, 10);
  if (field.type === "number") return "101";
  if (field.type === "email") return "student@example.com";
  if (field.type === "phone") return "9876543210";
  return field.label;
}

async function uploadThumbnail(dataUrl: string, accessToken: string) {
  const blob = await fetch(dataUrl).then((response) => response.blob());
  const formData = new FormData();
  formData.append("file", new File([blob], "document-template.png", { type: "image/png" }));
  formData.append("folder", "document_templates");

  const res = await fetch("/api/admin/uploads/image", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Template thumbnail upload failed");
  return String(json.data.url);
}

export function CardTemplateGenerator({
  accessToken,
  categories,
  onSaved,
}: CardTemplateGeneratorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [generated, setGenerated] = useState<GeneratedTemplate | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [canvasImageSrc, setCanvasImageSrc] = useState<string | null>(null);
  const [currentCanvasExport, setCurrentCanvasExport] = useState<(() => TemplateCanvasExport | null) | null>(null);
  const [status, setStatus] = useState<GeneratorStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((category) => String(category.id) === categoryId) ?? null,
    [categories, categoryId]
  );

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const previewHtml = useMemo(
    () => generated
      ? applyFieldValues(generated.html, generated.fields, fieldValues)
      : null,
    [fieldValues, generated]
  );

  useEffect(() => {
    if (!previewHtml || status !== "rendering") return;
    let active = true;
    const timeout = window.setTimeout(() => {
      renderTemplateHtmlToPng(previewHtml)
        .then((dataUrl) => {
          if (!active) return;
          setCanvasImageSrc(dataUrl);
          setStatus("success");
        })
        .catch((err: unknown) => {
          if (!active) return;
          console.error("[card-template-generator] Template rendering failed", err);
          setErrorMessage(
            err instanceof Error
              ? `Template rendering failed: ${err.message}`
              : "Template rendering failed"
          );
          setStatus("error");
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [previewHtml, status]);

  function selectFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Select an image file");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Image must be 6MB or smaller");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(String(reader.result));
      setGenerated(null);
      setCanvasImageSrc(null);
      setFieldValues({});
      setStatus("idle");
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  }

  async function generateTemplate() {
    if (!accessToken) return;
    if (!selectedImage) {
      toast.error("Upload a reference image");
      return;
    }
    if (!selectedCategory) {
      toast.error("Select a card category");
      return;
    }

    setStatus("generating");
    setErrorMessage(null);
    setCanvasImageSrc(null);
    try {
      const res = await fetch("/api/admin/master-data/card-templates/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: selectedImage,
          categoryName: selectedCategory.name,
          categoryAudience: selectedCategory.target_audience ?? "student",
          templateName: templateName.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Template generation failed");
      const next = json.data as GeneratedTemplate;
      setGenerated(next);
      setTemplateName(next.templateName);
      setFieldValues(
        Object.fromEntries(
          next.fields.map((field) => [
            field.name,
            defaultFieldValue(field, selectedImage),
          ])
        )
      );
      setStatus("rendering");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Template generation failed");
      setStatus("error");
    }
  }

  async function refreshPreview() {
    if (!generated) return;
    setStatus("rendering");
  }

  function downloadPng() {
    if (!canvasImageSrc) return;
    const link = document.createElement("a");
    link.href = canvasImageSrc;
    link.download = `${templateName || "document-template"}.png`;
    link.click();
  }

  function downloadPdf() {
    if (!canvasImageSrc) return;
    const image = new Image();
    image.onload = () => {
      const landscape = image.width > image.height;
      const pdf = new jsPDF({
        orientation: landscape ? "landscape" : "portrait",
        unit: "px",
        format: [image.width, image.height],
      });
      pdf.addImage(canvasImageSrc, "PNG", 0, 0, image.width, image.height);
      pdf.save(`${templateName || "document-template"}.pdf`);
    };
    image.src = canvasImageSrc;
  }

  function downloadCurrentSizePng() {
    const exported = currentCanvasExport?.();
    if (!exported) return;
    const link = document.createElement("a");
    link.href = exported.dataUrl;
    link.download = `${templateName || "document-template"}-${exported.width}x${exported.height}.png`;
    link.click();
  }

  function downloadCurrentSizePdf() {
    const exported = currentCanvasExport?.();
    if (!exported) return;
    const landscape = exported.width > exported.height;
    const pdf = new jsPDF({
      orientation: landscape ? "landscape" : "portrait",
      unit: "px",
      format: [exported.width, exported.height],
    });
    pdf.addImage(exported.dataUrl, "PNG", 0, 0, exported.width, exported.height);
    pdf.save(`${templateName || "document-template"}-${exported.width}x${exported.height}.pdf`);
  }

  async function saveTemplate() {
    if (!accessToken || !generated || !canvasImageSrc || !selectedCategory) return;
    if (!templateName.trim()) {
      toast.error("Template name is required");
      return;
    }

    setSaving(true);
    try {
      const thumbnailUrl = await uploadThumbnail(canvasImageSrc, accessToken);
      const res = await fetch("/api/admin/master-data/card-templates", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          card_category_id: selectedCategory.id,
          name: templateName.trim(),
          thumbnail_url: thumbnailUrl,
          html_template: generated.html,
          is_public: isPublic,
          fields: generated.fields.map((field, index) => ({
            field_name: field.name,
            label: field.label,
            field_type: field.type,
            is_required: field.isRequired,
            sort_order: index,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Template save failed");
      toast.success("Card template saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Template save failed");
    } finally {
      setSaving(false);
    }
  }

  const loading = status === "generating" || status === "rendering";

  return (
    <div className="h-full w-full overflow-hidden bg-background text-foreground">
      <TemplateResizablePanelGroup
        id={`card-template-generator-${isMobile ? "mobile" : "desktop"}`}
        direction={isMobile ? "vertical" : "horizontal"}
        className="h-full w-full"
      >
        <TemplateResizablePanel
          id={`card-template-upload-${isMobile ? "mobile" : "desktop"}`}
          defaultSize={isMobile ? "46%" : "30%"}
          minSize={isMobile ? "32%" : "22%"}
        >
          <div className="flex h-full flex-col gap-5 overflow-y-auto p-5 md:p-7">
            <div>
              <h2 className="text-xl font-bold">Upload Asset</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a reference image and category for AI analysis.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Card Category *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      <span className="flex items-center gap-2">
                        <span>{category.name}</span>
                        <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                          {category.target_audience === "staff" ? "Staff" : "Student"}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCategory && (
              <div className="space-y-2">
                <Label htmlFor="ai-template-name">Template Name</Label>
                <Input
                  id="ai-template-name"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="Leave blank for AI to generate"
                  className="bg-background"
                  maxLength={150}
                />
              </div>
            )}

            <button
              type="button"
              className="flex min-h-72 flex-1 cursor-pointer items-center justify-center rounded-md border-2 border-dashed bg-muted/20 p-5 transition-colors hover:border-primary/60 hover:bg-muted/40"
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) selectFile(file);
                }}
              />
              {selectedImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedImage}
                  alt="Template reference"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border bg-muted">
                    <ImageIcon className="size-5" />
                  </span>
                  <p className="font-medium text-foreground">Click to upload</p>
                  <p className="mt-1 text-xs">PNG, JPG, WebP, SVG or GIF</p>
                </div>
              )}
            </button>

            <Button
              type="button"
              onClick={() => void generateTemplate()}
              disabled={!selectedImage || !categoryId || loading}
              className="h-11 w-full font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating Design...
                </>
              ) : (
                <>
                  <UploadCloud className="size-4" />
                  Generate Design
                </>
              )}
            </Button>

            {errorMessage && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}
          </div>
        </TemplateResizablePanel>

        <TemplateResizableHandle
          id={`card-template-separator-${isMobile ? "mobile" : "desktop"}`}
        />

        <TemplateResizablePanel
          id={`card-template-preview-${isMobile ? "mobile" : "desktop"}`}
          defaultSize={isMobile ? "54%" : "70%"}
        >
          <div className="relative h-full min-w-0 bg-muted/20">
            {generated && status === "success" && (
              <div className="absolute right-5 top-4 z-30 flex items-center overflow-hidden rounded-md border bg-background/95 text-foreground shadow-xl backdrop-blur">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-none"
                  onClick={() => void saveTemplate()}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-none border-l"
                    >
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Download options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem onClick={downloadCurrentSizePng}>
                      <Download className="size-4" />
                      <span className="whitespace-nowrap">Download Current Size PNG</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={downloadCurrentSizePdf}>
                      <FileText className="size-4" />
                      <span className="whitespace-nowrap">Download Current Size PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={downloadPng}>
                      <Download className="size-4" />
                      <span className="whitespace-nowrap">Download Original PNG</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={downloadPdf}>
                      <FileText className="size-4" />
                      <span className="whitespace-nowrap">Download Original PDF</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center p-10">
                <div className="w-full max-w-2xl space-y-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="size-14 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </div>
                  <Skeleton className="aspect-[4/3] max-h-[55vh] w-full" />
                </div>
              </div>
            ) : (
              <TemplateCanvasPreview
                imageSrc={canvasImageSrc}
                renderMode="persisted"
                onCurrentExportChange={(exporter) =>
                  setCurrentCanvasExport(() => exporter)
                }
              />
            )}

            {generated && status === "success" && (
              <div className="absolute bottom-5 right-5 z-30">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="shadow-xl"
                      title="Template fields"
                    >
                      <Braces className="size-4" />
                      <span className="sr-only">Open template fields</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="end"
                    collisionPadding={12}
                    className="h-[min(70dvh,560px)] max-h-[var(--radix-popover-content-available-height)] w-[min(22rem,calc(100vw-2rem))] overflow-hidden p-0"
                  >
                    <PopoverHeader className="shrink-0 border-b px-4 py-4">
                      <PopoverTitle>Template Fields</PopoverTitle>
                      <PopoverDescription>
                        Preview the dynamic values detected by AI.
                      </PopoverDescription>
                    </PopoverHeader>
                    <div
                      className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-4 py-4"
                      style={{ scrollbarGutter: "stable" }}
                      onWheel={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.currentTarget.scrollTop += event.deltaY;
                      }}
                    >
                      <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Template Name</Label>
                        <Input
                          value={templateName}
                          onChange={(event) => setTemplateName(event.target.value)}
                        />
                      </div>
                      {generated.fields.map((field) => (
                        <div key={field.name} className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Label htmlFor={`preview-${field.name}`}>{field.label}</Label>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {`{{${field.name}}}`}
                            </span>
                          </div>
                          {field.type === "textarea" ? (
                            <Textarea
                              id={`preview-${field.name}`}
                              value={fieldValues[field.name] ?? ""}
                              onChange={(event) =>
                                setFieldValues((current) => ({
                                  ...current,
                                  [field.name]: event.target.value,
                                }))
                              }
                            />
                          ) : (
                            <Input
                              id={`preview-${field.name}`}
                              type={field.type === "image" ? "url" : field.type}
                              value={fieldValues[field.name] ?? ""}
                              onChange={(event) =>
                                setFieldValues((current) => ({
                                  ...current,
                                  [field.name]: event.target.value,
                                }))
                              }
                            />
                          )}
                        </div>
                      ))}
                      </div>
                    </div>
                    <div className="shrink-0 space-y-3 border-t px-4 py-4">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={isPublic}
                          onCheckedChange={(value) => setIsPublic(Boolean(value))}
                        />
                        Publish to marketplace
                      </label>
                      <Button
                        type="button"
                        className="w-full"
                        onClick={() => void refreshPreview()}
                      >
                        Update Preview
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </TemplateResizablePanel>
      </TemplateResizablePanelGroup>
    </div>
  );
}

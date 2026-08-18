"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, MoreHorizontal, RefreshCw } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

import type { TemplateCanvasExport } from "@/components/card-templates/template-canvas-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { getApiErrorMessage, readJsonResponse } from "@/lib/auth/client-permission-errors";
import { formatIndianDate } from "@/lib/format-time";
import { useAuthStore } from "@/store";

const TemplateCanvasPreview = dynamic(
  () => import("@/components/card-templates/template-canvas-preview"),
  { ssr: false }
);

type StudentIdCard = {
  id: number;
  title: string;
  image_url: string | null;
  rendered_html: string;
  canvas_width: number | null;
  canvas_height: number | null;
  version: number;
  created_at: string;
  institution_name: string;
  generated_by_name: string | null;
};

function downloadPng(card: StudentIdCard, imageUrl = card.image_url) {
  if (!imageUrl) return;
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = "student-id-card.png";
  link.click();
}

function downloadPdf(card: StudentIdCard, imageUrl = card.image_url) {
  if (!imageUrl) return;
  const image = new Image();
  image.onload = () => {
    const pdf = new jsPDF({
      orientation: image.width > image.height ? "landscape" : "portrait",
      unit: "px",
      format: [image.width, image.height],
    });
    pdf.addImage(imageUrl, "PNG", 0, 0, image.width, image.height);
    pdf.save("student-id-card.pdf");
  };
  image.src = imageUrl;
}

export default function StudentIdCardPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const [card, setCard] = useState<StudentIdCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentCanvasExport, setCurrentCanvasExport] = useState<(() => TemplateCanvasExport | null) | null>(null);
  const currentExport = currentCanvasExport?.() ?? null;
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

  const loadCard = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/classroom/id-card", {
        headers: authHeader,
        cache: "no-store",
      });
      const payload = await readJsonResponse(response) as { data?: StudentIdCard | null };
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to load ID card"));
      setCard(payload.data ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load ID card");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void loadCard(), 0);
    return () => window.clearTimeout(timeout);
  }, [isReady, loadCard]);

  if (!isReady || loading) {
    return <div className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-[calc(100dvh-10rem)] min-h-[520px]" /></div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ID Card</h1>
          <p className="text-muted-foreground">
            {card
              ? `Saved ${formatIndianDate(card.created_at)}${card.generated_by_name ? ` by ${card.generated_by_name}` : ""}`
              : "Your current student ID card."}
          </p>
        </div>
      </div>

      <Card className="h-[calc(100dvh-10rem)] min-h-[620px] w-full overflow-hidden py-0">
        <CardContent className="relative h-full p-0">
          <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
            {card && <Badge variant="outline">v{card.version}</Badge>}
            {card?.image_url && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 w-12 px-0" aria-label="Download options">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem disabled={!currentExport} onClick={() => currentExport && downloadPng(card, currentExport.dataUrl)}>
                    <Download className="size-4" /> Download Current Size PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!currentExport} onClick={() => currentExport && downloadPdf(card, currentExport.dataUrl)}>
                    <FileText className="size-4" /> Download Current Size PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => downloadPng(card)}>
                    <Download className="size-4" /> Download Original PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadPdf(card)}>
                    <FileText className="size-4" /> Download Original PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="outline" size="icon" onClick={() => void loadCard()} aria-label="Refresh ID card">
              <RefreshCw className="size-4" />
            </Button>
          </div>
          <TemplateCanvasPreview
            imageSrc={card?.image_url ?? null}
            renderMode="persisted"
            emptyMessage="No ID card has been published yet."
            onCurrentExportChange={(exporter) => setCurrentCanvasExport(() => exporter)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

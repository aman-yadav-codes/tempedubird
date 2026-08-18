"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Maximize2, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { renderTemplateHtmlToPng } from "@/components/card-templates/render-template-preview";

type ResponsiveHtmlCanvasProps = {
  html: string;
  title: string;
};

type Size = {
  width: number;
  height: number;
};

const DEFAULT_TEMPLATE_SIZE: Size = {
  width: 794,
  height: 1123,
};

export function ResponsiveHtmlCanvas({
  html,
  title,
}: ResponsiveHtmlCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });
  const [templateSize, setTemplateSize] = useState<Size>(DEFAULT_TEMPLATE_SIZE);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let ignore = false;
    const timeout = window.setTimeout(() => {
      setRendering(true);
      setImageSrc(null);
      renderTemplateHtmlToPng(html)
        .then((src) => {
          if (!ignore) setImageSrc(src);
        })
        .finally(() => {
          if (!ignore) setRendering(false);
        });
    }, 0);
    return () => {
      ignore = true;
      window.clearTimeout(timeout);
    };
  }, [html]);

  const fitScale =
    containerSize.width > 0 && containerSize.height > 0
      ? Math.min(
          Math.max(containerSize.width - 56, 1) / templateSize.width,
          Math.max(containerSize.height - 88, 1) / templateSize.height,
          1.5
        )
      : 1;
  const renderedScale = fitScale * zoom;

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative h-[min(65dvh,620px)] min-h-[360px] w-full touch-none overscroll-contain overflow-hidden rounded-md border bg-muted/30 ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      onWheel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
        if ((event.target as HTMLElement).closest("[data-canvas-toolbar]")) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const pointer = {
          x: event.clientX - rect.left - rect.width / 2,
          y: event.clientY - rect.top - rect.height / 2,
        };
        const nextZoom = Math.min(
          2.5,
          Math.max(0.35, zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1))
        );
        if (nextZoom === zoom) return;
        const scaleRatio = nextZoom / zoom;
        setPan({
          x: pointer.x - (pointer.x - pan.x) * scaleRatio,
          y: pointer.y - (pointer.y - pan.y) * scaleRatio,
        });
        setZoom(nextZoom);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          panX: pan.x,
          panY: pan.y,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsDragging(true);
      }}
      onPointerMove={(event) => {
        if (!isDragging || dragRef.current.pointerId !== event.pointerId) return;
        setPan({
          x: dragRef.current.panX + event.clientX - dragRef.current.startX,
          y: dragRef.current.panY + event.clientY - dragRef.current.startY,
        });
      }}
      onPointerUp={(event) => {
        if (dragRef.current.pointerId !== event.pointerId) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dragRef.current.pointerId = -1;
        setIsDragging(false);
      }}
      onPointerCancel={() => {
        dragRef.current.pointerId = -1;
        setIsDragging(false);
      }}
    >
      {rendering && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Rendering preview...
        </div>
      )}
      {imageSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={title}
          title={title}
          onLoad={(event) => {
            const image = event.currentTarget;
            setTemplateSize({
              width: Math.max(image.naturalWidth, 1),
              height: Math.max(image.naturalHeight, 1),
            });
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="pointer-events-none absolute object-contain drop-shadow-2xl"
          style={{
            left: `calc(50% + ${pan.x}px)`,
            top: `calc(50% + ${pan.y}px)`,
            width: templateSize.width,
            height: templateSize.height,
            transform: `translate(-50%, -50%) scale(${renderedScale})`,
            transformOrigin: "center",
          }}
        />
      )}

      <div
        data-canvas-toolbar
        className="absolute bottom-4 left-1/2 flex -translate-x-1/2 cursor-default items-center rounded-md border bg-background/95 p-1 shadow-xl backdrop-blur"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setZoom((value) => Math.max(0.35, value - 0.1))}
          title="Zoom out"
        >
          <Minus className="size-4" />
          <span className="sr-only">Zoom out</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetView}
          title="Fit template"
          className="min-w-20"
        >
          <Maximize2 className="size-4" />
          {Math.round(renderedScale * 100)}%
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setZoom((value) => Math.min(2.5, value + 0.1))}
          title="Zoom in"
        >
          <Plus className="size-4" />
          <span className="sr-only">Zoom in</span>
        </Button>
      </div>
    </div>
  );
}

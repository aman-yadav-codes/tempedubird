"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { IdCard } from "lucide-react";
import { Image as KonvaImage, Layer, Stage } from "react-konva";
import useImage from "use-image";

export type TemplateCanvasExport = {
  dataUrl: string;
  width: number;
  height: number;
};

type TemplateCanvasPreviewProps = {
  imageSrc: string | null;
  renderMode?: "interactive" | "persisted";
  emptyMessage?: string;
  onCurrentExportChange?: (exporter: (() => TemplateCanvasExport | null) | null) => void;
};

function PersistedImageCanvas({
  imageSrc,
  onCurrentExportChange,
}: {
  imageSrc: string;
  onCurrentExportChange?: (exporter: (() => TemplateCanvasExport | null) | null) => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const exportCurrentSize = useCallback(() => {
    const image = imageRef.current;
    if (!image || !image.naturalWidth || !image.naturalHeight) return null;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL("image/png"), width, height };
  }, [scale]);

  useEffect(() => {
    if (!onCurrentExportChange || !naturalSize.width) return;
    onCurrentExportChange(exportCurrentSize);
    return () => onCurrentExportChange(null);
  }, [exportCurrentSize, naturalSize.width, onCurrentExportChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: globalThis.WheelEvent) => {
      if (!(event.target instanceof Node) || !container.contains(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      setScale((current) => Math.min(5, Math.max(0.2, event.deltaY > 0 ? current / 1.1 : current * 1.1)));
    };

    document.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    return () => document.removeEventListener("wheel", handleWheel, { capture: true });
  }, []);

  function resetView() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function zoom(nextScale: number) {
    setScale(Math.min(5, Math.max(0.2, nextScale)));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current;
    if (!start) return;
    setOffset({
      x: start.offsetX + event.clientX - start.x,
      y: start.offsetY + event.clientY - start.y,
    });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
    setDragging(false);
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full touch-none select-none items-center justify-center overflow-hidden bg-muted/30 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={imageSrc}
        alt="Card preview"
        decoding="sync"
        draggable={false}
        onLoad={(event) => setNaturalSize({
          width: event.currentTarget.naturalWidth,
          height: event.currentTarget.naturalHeight,
        })}
        className="max-h-[72%] max-w-[72%] object-contain shadow-2xl"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
      />

      {naturalSize.width > 0 && (
        <div className="pointer-events-none absolute left-4 top-4 rounded-md border bg-background/90 px-3 py-2 text-xs shadow-xl backdrop-blur">
          <div className="font-mono font-semibold">
            {Math.max(1, Math.round(naturalSize.width * scale))} x {Math.max(1, Math.round(naturalSize.height * scale))}px
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">Drag to pan and scroll to zoom</div>
        </div>
      )}

      <div
        className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background/90 px-3 py-2 shadow-xl backdrop-blur"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button type="button" onClick={() => zoom(scale / 1.1)} className="size-8 text-lg" aria-label="Zoom out">-</button>
        <button type="button" onClick={resetView} className="border-x px-3 py-1 text-xs font-semibold">Reset View</button>
        <span className="min-w-12 text-center font-mono text-xs">{Math.round(scale * 100)}%</span>
        <button type="button" onClick={() => zoom(scale * 1.1)} className="size-8 text-lg" aria-label="Zoom in">+</button>
      </div>
    </div>
  );
}

export default function TemplateCanvasPreview({
  imageSrc,
  renderMode = "interactive",
  emptyMessage,
  onCurrentExportChange,
}: TemplateCanvasPreviewProps) {
  const [image] = useImage(imageSrc || "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [centeredImageSrc, setCenteredImageSrc] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const currentPixelSize = {
    width: image ? Math.max(1, Math.round(image.width * stageScale)) : 0,
    height: image ? Math.max(1, Math.round(image.height * stageScale)) : 0,
  };

  const exportCurrentSize = useCallback(() => {
    if (!image) return null;
    const width = Math.max(1, Math.round(image.width * stageScale));
    const height = Math.max(1, Math.round(image.height * stageScale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);
    return {
      dataUrl: canvas.toDataURL("image/png"),
      width,
      height,
    };
  }, [image, stageScale]);

  function clampStagePosition(
    position: { x: number; y: number },
    scale = stageScale
  ) {
    if (!image) return position;

    const renderedWidth = image.width * scale;
    const renderedHeight = image.height * scale;
    const visibleX = Math.min(96, renderedWidth * 0.35);
    const visibleY = Math.min(96, renderedHeight * 0.35);
    const minX = visibleX - (imagePosition.x + image.width) * scale;
    const maxX = stageSize.width - visibleX - imagePosition.x * scale;
    const minY = visibleY - (imagePosition.y + image.height) * scale;
    const maxY = stageSize.height - visibleY - imagePosition.y * scale;

    return {
      x: Math.min(maxX, Math.max(minX, position.x)),
      y: Math.min(maxY, Math.max(minY, position.y)),
    };
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setStageSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!image || !imageSrc || stageSize.width === 0 || stageSize.height === 0) return;
    if (centeredImageSrc === imageSrc) return;

    const timeout = window.setTimeout(() => {
      const availableWidth = stageSize.width * 0.72;
      const availableHeight = stageSize.height * 0.72;
      const fitScale = Math.min(
        availableWidth / image.width,
        availableHeight / image.height,
        1
      );
      setImagePosition({
        x: (stageSize.width / fitScale - image.width) / 2,
        y: (stageSize.height / fitScale - image.height) / 2,
      });
      setStageScale(fitScale);
      setStagePosition({ x: 0, y: 0 });
      setCenteredImageSrc(imageSrc);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [centeredImageSrc, image, imageSrc, stageSize.height, stageSize.width]);

  useEffect(() => {
    if (renderMode !== "interactive") return;
    if (!onCurrentExportChange) return;
    if (!image) {
      onCurrentExportChange(null);
      return;
    }
    onCurrentExportChange(exportCurrentSize);
    return () => onCurrentExportChange(null);
  }, [exportCurrentSize, image, onCurrentExportChange, renderMode]);

  if (!imageSrc) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center overflow-hidden bg-background text-muted-foreground dark:bg-[#080f1d]"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in oklab, var(--destructive) 70%, transparent) 1px, transparent 1px)",
          backgroundSize: "19px 19px",
        }}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-24 items-center justify-center rounded-full border border-dashed border-muted-foreground/45 bg-background/70 text-muted-foreground shadow-[0_0_45px_rgba(15,23,42,0.16)] backdrop-blur-sm dark:bg-[#0b1324]/75 dark:shadow-[0_0_45px_rgba(0,0,0,0.28)]">
            <IdCard className="size-12" />
          </div>
          {emptyMessage ? (
            <p className="text-sm font-medium text-foreground/80">{emptyMessage}</p>
          ) : (
            <>
              <p className="text-lg font-semibold text-foreground/80">Canvas Area</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload and generate to start editing
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (renderMode === "persisted") {
    return <PersistedImageCanvas imageSrc={imageSrc} onCurrentExportChange={onCurrentExportChange} />;
  }

  if (!image) {
    return (
      <div className="flex h-full w-full items-center justify-center overflow-hidden bg-muted/30 p-6">
        {/* A native image keeps persisted data URLs visible while Konva decodes them. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt="Card preview"
          className="max-h-full max-w-full object-contain shadow-2xl"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-muted/30 ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        draggable
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePosition.x}
        y={stagePosition.y}
        dragBoundFunc={(position) => clampStagePosition(position)}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(event) => {
          setIsDragging(false);
          setStagePosition(
            clampStagePosition({ x: event.target.x(), y: event.target.y() })
          );
        }}
        onWheel={(event) => {
          if (!event.evt.ctrlKey && !event.evt.metaKey) return;
          event.evt.preventDefault();
          event.evt.stopPropagation();
          const stage = event.target.getStage();
          const pointer = stage?.getPointerPosition();
          if (!stage || !pointer) return;
          const oldScale = stage.scaleX();
          const direction = event.evt.deltaY > 0 ? -1 : 1;
          const nextScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1;
          if (nextScale < 0.1 || nextScale > 5) return;
          const point = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
          };
          const nextPosition = clampStagePosition(
            {
              x: pointer.x - point.x * nextScale,
              y: pointer.y - point.y * nextScale,
            },
            nextScale
          );
          setStageScale(nextScale);
          setStagePosition(nextPosition);
        }}
      >
        <Layer>
          {image && (
            <KonvaImage
              image={image}
              x={imagePosition.x}
              y={imagePosition.y}
              width={image.width}
              height={image.height}
              shadowColor="black"
              shadowBlur={20}
              shadowOpacity={0.25}
            />
          )}
        </Layer>
      </Stage>

      {image && (
        <div className="absolute left-4 top-4 z-20 rounded-md border bg-background/90 px-3 py-2 text-xs shadow-xl backdrop-blur">
          <div className="font-mono font-semibold">
            {currentPixelSize.width} x {currentPixelSize.height}px
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            Ctrl + wheel to resize export
          </div>
        </div>
      )}

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border bg-background/90 px-5 py-2.5 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={() => {
            setCenteredImageSrc(null);
            setStagePosition({ x: 0, y: 0 });
          }}
          className="rounded-md bg-muted px-3 py-1.5 text-xs font-semibold hover:bg-muted/80"
        >
          Reset View
        </button>
        <span className="h-5 w-px bg-border" />
        <span className="font-mono text-xs">{Math.round(stageScale * 100)}%</span>
      </div>
    </div>
  );
}

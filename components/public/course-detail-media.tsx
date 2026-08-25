"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

import { cn } from "@/lib/utils";

export type CourseDetailMediaItem = {
  id: number;
  url: string;
  mediaType?: "image" | "video";
};

function isVideo(item: CourseDetailMediaItem) {
  return item.mediaType === "video" || /\.(mp4|webm|mov|m4v|ogg|mkv)(\?|#|$)/i.test(item.url);
}

export function CourseDetailMedia({
  items,
  title,
}: {
  items: CourseDetailMediaItem[];
  title: string;
}) {
  const orderedItems = useMemo(
    () => [...items].sort((a, b) => Number(isVideo(b)) - Number(isVideo(a))),
    [items],
  );
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playingVideoIndex, setPlayingVideoIndex] = useState<number | null>(null);
  const active = orderedItems[activeIndex];
  const activeIsVideo = active ? isVideo(active) : false;
  const videoPlaying = activeIsVideo && playingVideoIndex === activeIndex;

  useEffect(() => {
    if (orderedItems.length <= 1) return;
    if (activeIsVideo && videoPlaying) return;

    const timeout = window.setTimeout(
      () => setActiveIndex((current) => (current + 1) % orderedItems.length),
      3500,
    );

    return () => window.clearTimeout(timeout);
  }, [activeIndex, activeIsVideo, orderedItems.length, videoPlaying]);

  useEffect(() => {
    thumbnailRefs.current[activeIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeIndex]);

  if (!active || orderedItems.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="relative aspect-video overflow-hidden bg-black">
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {orderedItems.map((item, index) => {
            const itemIsVideo = isVideo(item);
            const isActive = index === activeIndex;

            return (
              <div key={`${item.id}-${item.url}`} className="relative h-full min-w-full bg-black">
                {itemIsVideo && isActive ? (
                  <video
                    src={item.url}
                    className="h-full w-full object-contain"
                    controls
                    autoPlay
                    muted
                    playsInline
                    preload="metadata"
                    onPlay={() => setPlayingVideoIndex(index)}
                    onPause={() => setPlayingVideoIndex((current) => (current === index ? null : current))}
                    onEnded={() => setPlayingVideoIndex((current) => (current === index ? null : current))}
                  />
                ) : itemIsVideo ? (
                  <div className="flex h-full w-full items-center justify-center text-white">
                    <Play className="h-10 w-10 fill-current opacity-80" />
                  </div>
                ) : (
                  <Image
                    src={item.url}
                    alt={title}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 1024px) 100vw, 820px"
                    className="object-cover"
                  />
                )}
              </div>
            );
          })}
        </div>

        {orderedItems.length > 1 && (
          <>
            <button
              aria-label="Previous media"
              onClick={() => setActiveIndex((current) => (current - 1 + orderedItems.length) % orderedItems.length)}
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm transition hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              aria-label="Next media"
              onClick={() => setActiveIndex((current) => (current + 1) % orderedItems.length)}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm transition hover:bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {orderedItems.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-border bg-card p-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {orderedItems.map((item, index) => {
            const itemIsVideo = isVideo(item);

            return (
              <button
                key={`${item.id}-${item.url}`}
                ref={(node) => {
                  thumbnailRefs.current[index] = node;
                }}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "relative h-14 w-24 shrink-0 overflow-hidden rounded-md border bg-muted transition sm:h-16 sm:w-28",
                  activeIndex === index ? "border-primary" : "border-border opacity-75 hover:opacity-100",
                )}
              >
                {itemIsVideo ? (
                  <div className="flex h-full w-full items-center justify-center bg-black text-white">
                    <Play className="h-5 w-5 fill-current" />
                  </div>
                ) : (
                  <Image src={item.url} alt={`${title} ${index + 1}`} fill sizes="112px" className="object-cover" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

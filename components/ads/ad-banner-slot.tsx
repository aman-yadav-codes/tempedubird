"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdBannerSlot({
  slot = "home_hero_banner",
  className = "",
}: {
  slot: string;
  className?: string;
}) {
  const [ad, setAd] = useState<{
    id: number;
    title: string;
    banner_image_url: string;
    target_url: string;
    call_to_action: string;
    sponsor_name?: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/public/ads?slot=${encodeURIComponent(slot)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ad) setAd(data.ad);
      })
      .catch(() => {});
  }, [slot]);

  if (!ad) return null;

  const handleClick = () => {
    fetch("/api/public/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ad.id }),
    }).catch(() => {});
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-primary/5 p-4 shadow-sm ${className}`}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-muted border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ad.banner_image_url} alt={ad.title} className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" />
              <span>Sponsored {ad.sponsor_name ? `• ${ad.sponsor_name}` : ""}</span>
            </div>
            <h4 className="text-sm font-bold text-foreground leading-snug">{ad.title}</h4>
          </div>
        </div>

        <a
          href={ad.target_url}
          target="_blank"
          rel="noreferrer"
          onClick={handleClick}
          className="shrink-0"
        >
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 shadow-sm">
            {ad.call_to_action || "Learn More"}
            <ExternalLink className="h-3 w-3" />
          </Button>
        </a>
      </div>
    </div>
  );
}

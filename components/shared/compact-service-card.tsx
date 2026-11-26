"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Info, ExternalLink, Calendar, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuthStore } from "@/store";
import { isUserStoreOwner } from "@/lib/auth/store-ownership";
import { buildServiceSeoUrl } from "@/lib/utils/seo-slug";

interface CompactServiceCardProps {
  service: any;
  business?: any;
  isHighlighted?: boolean;
  onBook?: (service: any) => void;
  onOpenDetails?: (service: any) => void;
  className?: string;
}

export function CompactServiceCard({
  service: s,
  business,
  isHighlighted = false,
  onBook,
  onOpenDetails,
  className = "",
}: CompactServiceCardProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveBusiness = business || {
    id: s.business_id || s.seller_info?.business_id || s.business_profile_id,
    name: s.business_name || s.seller_info?.business_name || s.brand_name || "Service Provider",
    slug: s.business_slug || s.seller_info?.business_slug || "",
    institution_profile_id: s.institution_id || s.seller_info?.institution_id,
    user_id: s.business_user_id || s.seller_info?.user_id,
  };

  const isOwner = useMemo(() => isUserStoreOwner(user, effectiveBusiness), [user, effectiveBusiness]);

  const basePrice = Number(
    (s.discounted_price !== undefined && s.discounted_price !== null && Number(s.discounted_price) > 0)
      ? s.discounted_price
      : (s.price !== undefined && s.price !== null && Number(s.price) > 0)
      ? s.price
      : (s.suggested_price_inr !== undefined && s.suggested_price_inr !== null && Number(s.suggested_price_inr) > 0)
      ? s.suggested_price_inr
      : (s.suggested_price !== undefined && s.suggested_price !== null && Number(s.suggested_price) > 0)
      ? s.suggested_price
      : (s.regular_price !== undefined && s.regular_price !== null && Number(s.regular_price) > 0)
      ? s.regular_price
      : 0
  );

  const pricingModel = s.pricing_model || "Service";
  const durationText = s.duration_minutes
    ? `${s.duration_minutes} ${s.duration_unit || "min"}`
    : s.duration || "";

  const subtitle = [pricingModel, durationText, effectiveBusiness.name].filter(Boolean).slice(0, 2).join(" • ");

  const serviceTitle = s.name || s.title || "Service";
  const imageUrl = s.default_image_url || s.image_url;
  const serviceSlugOrId = s.slug || s.id;
  const serviceDetailUrl = buildServiceSeoUrl({ ...s, seller_info: effectiveBusiness }) || `/services/${serviceSlugOrId}`;

  const handleOpenDetails = (e: React.MouseEvent) => {
    if (onOpenDetails) {
      e.preventDefault();
      onOpenDetails(s);
    }
  };

  const handleThumbnailClick = (e: React.MouseEvent) => {
    if (onOpenDetails) {
      e.preventDefault();
      onOpenDetails(s);
    } else {
      router.push(serviceDetailUrl);
    }
  };

  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBook) {
      onBook(s);
    } else {
      router.push(serviceDetailUrl);
    }
  };

  return (
    <div
      id={`service-compact-${s.id}`}
      onClick={(e) => {
        if (!e.defaultPrevented) {
          if (onOpenDetails) {
            onOpenDetails(s);
          } else {
            router.push(serviceDetailUrl);
          }
        }
      }}
      className={`p-3 rounded-xl border transition-all flex items-center gap-3.5 group relative bg-card hover:bg-muted/30 cursor-pointer ${
        isHighlighted
          ? "ring-2 ring-primary border-primary bg-primary/10 shadow-sm"
          : "shadow-2xs hover:shadow-xs border-border/70"
      } ${className}`}
    >
      {/* 1. Left Thumbnail Image */}
      <Link
        href={serviceDetailUrl}
        onClick={handleOpenDetails}
        className="relative size-16 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 shrink-0 overflow-hidden border flex items-center justify-center cursor-pointer group/img block"
        title={`View ${serviceTitle}`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={serviceTitle}
            fill
            sizes="64px"
            className="object-cover group-hover/img:scale-105 transition-transform"
          />
        ) : (
          <Briefcase className="size-6 text-sky-600" />
        )}
        {isHighlighted && (
          <span className="absolute top-1 right-1 size-2 rounded-full bg-primary ring-2 ring-background" />
        )}
      </Link>

      {/* 2. Middle Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <Link
            href={serviceDetailUrl}
            onClick={handleOpenDetails}
            className="text-xs font-bold text-foreground truncate hover:text-primary transition-colors cursor-pointer block"
            title={serviceTitle}
          >
            {serviceTitle}
          </Link>
          {isHighlighted && (
            <span className="size-1.5 rounded-full bg-primary shrink-0" title="Selected Item" />
          )}
        </div>

        {effectiveBusiness.slug || effectiveBusiness.id ? (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
            <span>{pricingModel} {durationText ? `• ${durationText}` : ""} • </span>
            <Link
              href={effectiveBusiness.slug ? `/business/${effectiveBusiness.slug}` : `/business/${effectiveBusiness.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold hover:text-primary hover:underline truncate"
              title={effectiveBusiness.name}
            >
              {effectiveBusiness.name}
            </Link>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground truncate" title={subtitle}>
            {subtitle}
          </p>
        )}

        {/* Pricing */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-xs font-black text-foreground">
              ₹{Number(basePrice).toLocaleString()}
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground capitalize truncate">
              ({pricingModel})
            </span>
          </div>
        </div>
      </div>

      {/* 3. Right Actions: Short Description Popover Icon + Book Button */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Short Description Popover Trigger */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="size-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer border border-border/40 hover:border-border"
              title="Click to view short description"
              aria-label="Short description"
            >
              <Info className="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 text-xs rounded-xl shadow-xl border bg-background" side="top">
            <div className="space-y-2">
              <div className="font-bold text-foreground text-xs line-clamp-1 border-b pb-1.5 flex items-center justify-between">
                <span>{serviceTitle}</span>
                <span className="text-[10px] text-primary font-extrabold">₹{Number(basePrice).toLocaleString()}</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {s.description || s.short_description || "Professional service package delivered by verified specialists."}
              </p>
              <div className="pt-1.5 border-t flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                <span className="bg-muted px-1.5 py-0.5 rounded font-medium">Model: {pricingModel}</span>
                {durationText && (
                  <span className="bg-muted px-1.5 py-0.5 rounded font-medium">Duration: {durationText}</span>
                )}
              </div>
              <div className="pt-1 border-t flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[150px]">
                  Provider: {effectiveBusiness.name}
                </span>
                <Link
                  href={serviceDetailUrl}
                  onClick={handleOpenDetails}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
                >
                  Full Details <ExternalLink className="size-2.5" />
                </Link>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Action Button */}
        {isOwner ? (
          <Badge variant="outline" className="text-[10px] font-bold text-amber-700 bg-amber-500/10 border-amber-500/30 px-1.5 py-0.5">
            Owner
          </Badge>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleBook}
            className="h-6 text-[10px] font-bold px-2.5 bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-2xs shrink-0"
          >
            Book
          </Button>
        )}
      </div>
    </div>
  );
}

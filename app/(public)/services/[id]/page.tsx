"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Briefcase,
  Store,
  MapPin,
  ChevronRight,
  Clock,
  Sparkles,
  Phone,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowLeft,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuthStore, useCartStore } from "@/store";
import { isUserStoreOwner } from "@/lib/auth/store-ownership";
import { buildServiceSeoUrl, parseDiscoverySeoSlug } from "@/lib/utils/seo-slug";
import CustomerExplorePage from "@/app/(public)/explore/page";

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params?.id as string;

  if (serviceId && (serviceId.includes("-in-") || serviceId.startsWith("all-") || serviceId.startsWith("in-"))) {
    const { categorySlug, city } = parseDiscoverySeoSlug(serviceId);
    return <CustomerExplorePage initialType="service" initialCategory={categorySlug} initialCity={city} />;
  }

  const { user } = useAuthStore();
  const { items, setIsOpen, addItem } = useCartStore();

  const [service, setService] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serviceId) return;
    setLoading(true);
    fetch(`/api/public/services/${serviceId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.service) {
          setService(data.service);
          const canonicalSeoUrl = buildServiceSeoUrl(data.service);
          if (canonicalSeoUrl && !canonicalSeoUrl.startsWith("/services/")) {
            router.replace(canonicalSeoUrl);
          } else if (data.service.slug && /^\d+$/.test(serviceId) && data.service.slug !== serviceId) {
            router.replace(`/services/${data.service.slug}`);
          }
        } else {
          setService(null);
        }
      })
      .catch((err) => {
        console.error("Error loading service:", err);
      })
      .finally(() => setLoading(false));
  }, [serviceId]);

  const effectiveBusiness = useMemo(() => {
    if (!service) return null;
    return {
      id: service.business_profile_id,
      name: service.business_name || "Service Provider",
      slug: service.business_slug || "",
      institution_profile_id: service.institution_profile_id,
    };
  }, [service]);

  const isOwner = useMemo(() => isUserStoreOwner(user, effectiveBusiness), [user, effectiveBusiness]);

  const price = Number(service?.price || service?.suggested_price || 0);
  const pricingModel = service?.pricing_model || "Service";
  const durationText = service?.duration_minutes
    ? `${service.duration_minutes} ${service.duration_unit || "min"}`
    : "";

  const handleBookService = () => {
    if (isOwner) {
      toast.error("You cannot book services from your own storefront.");
      return;
    }

    const added = addItem(
      {
        id: `service_${service.id}`,
        name: service.name,
        price: price,
        image_url: service.default_image_url,
        brand: effectiveBusiness?.name,
        unit: pricingModel,
        business_id: effectiveBusiness?.id,
        business_name: effectiveBusiness?.name,
        business_slug: effectiveBusiness?.slug,
        institution_id: effectiveBusiness?.institution_profile_id,
        item_type: "service",
      },
      1
    );

    if (added) {
      toast.success(`${service.name} added to service bookings!`);
      setIsOpen(true);
    }
  };

  const storeLink = service?.business_slug
    ? `/${service.category_slug || "services"}/${service.business_slug}?tab=services&highlight=${service.id}`
    : service?.professional_slug
    ? `/professional/${service.professional_slug}?tab=services&highlight=${service.id}`
    : null;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <Briefcase className="size-12 text-muted-foreground mx-auto opacity-40" />
        <h2 className="text-lg font-bold text-foreground">Service Not Found</h2>
        <p className="text-xs text-muted-foreground">
          The requested service offering could not be found or may have been archived.
        </p>
        <Button asChild size="sm">
          <Link href="/explore?type=service">Browse Services</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="size-3" />
          <Link href="/explore?type=service" className="hover:text-foreground">Services</Link>
          {service.category_name && (
            <>
              <ChevronRight className="size-3" />
              <span>{service.category_name}</span>
            </>
          )}
          <ChevronRight className="size-3" />
          <span className="text-foreground font-semibold truncate max-w-[200px]">{service.name}</span>
        </div>

        {/* Main Service Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Image Banner */}
          <div className="lg:col-span-6 space-y-3">
            <div className="relative aspect-video sm:aspect-[4/3] w-full rounded-2xl bg-muted/30 border overflow-hidden shadow-2xs flex items-center justify-center">
              {service.default_image_url ? (
                <Image
                  src={service.default_image_url}
                  alt={service.name}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-cover"
                />
              ) : (
                <Briefcase className="size-16 text-sky-600/40" />
              )}
              <span className="absolute top-3 left-3 bg-sky-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 uppercase">
                {pricingModel}
              </span>
            </div>
          </div>

          {/* Right Column: Service Details & Booking */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-200">
                  {pricingModel}
                </Badge>
                {durationText && (
                  <Badge variant="secondary" className="text-[10px] font-medium gap-1">
                    <Clock className="size-2.5" /> {durationText}
                  </Badge>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {service.name}
              </h1>
            </div>

            {/* Price section */}
            <div className="p-4 rounded-2xl bg-muted/30 border space-y-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl sm:text-3xl font-black text-foreground">
                  ₹{Number(price).toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-muted-foreground capitalize">
                  ({pricingModel})
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Confirmed booking with guaranteed service slot and professional provider.
              </p>
            </div>

            {/* Booking action */}
            <div className="pt-2">
              {isOwner ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  Provider View: Self-booking from your own service listing is disabled.
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={handleBookService}
                  className="w-full h-11 text-xs font-bold gap-2 bg-[#d9232e] hover:bg-[#d9232e]/90 text-white cursor-pointer shadow-md"
                >
                  <Calendar className="size-4" /> Book Service Now
                </Button>
              )}
            </div>

            {/* Provider Card */}
            {effectiveBusiness && (
              <Card className="rounded-2xl border shadow-2xs bg-card">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {storeLink ? (
                      <Link
                        href={storeLink}
                        className="size-11 rounded-xl bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 flex items-center justify-center shrink-0 border transition-colors cursor-pointer"
                        title={`Visit ${effectiveBusiness.name}`}
                      >
                        <Store className="size-5" />
                      </Link>
                    ) : (
                      <div className="size-11 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0 border">
                        <Store className="size-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Service Provided By
                      </span>
                      {storeLink ? (
                        <Link
                          href={storeLink}
                          className="text-sm font-bold text-foreground hover:text-primary hover:underline truncate block transition-colors cursor-pointer"
                          title={`Visit ${effectiveBusiness.name}`}
                        >
                          {effectiveBusiness.name}
                        </Link>
                      ) : (
                        <p className="text-sm font-bold text-foreground truncate">
                          {effectiveBusiness.name}
                        </p>
                      )}
                      {service.business_city && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="size-3 text-muted-foreground shrink-0" />
                          {service.business_city}, {service.business_state || "India"}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Service Scope / Description */}
            {service.description && (
              <div className="space-y-2 pt-2 border-t">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Service Scope &amp; Details
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {service.description}
                </p>
              </div>
            )}

            {/* Deliverables / Attributes */}
            {service.attributes && typeof service.attributes === "object" && Object.keys(service.attributes).length > 0 && (
              <div className="space-y-2.5 pt-2 border-t">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Deliverables &amp; Inclusions
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(service.attributes).map(([key, value]) => (
                    <div key={key} className="p-2.5 rounded-xl border bg-muted/20">
                      <span className="text-[10px] text-muted-foreground block font-medium capitalize">
                        {key}
                      </span>
                      <span className="font-semibold text-foreground">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

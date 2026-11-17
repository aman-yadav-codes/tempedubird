"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  MapPin,
  Tag,
  ExternalLink,
  CheckCircle2,
  Phone,
  Sparkles,
  TrendingDown,
  Loader2,
  Wrench,
  Clock,
  Calendar,
} from "lucide-react";
import { ServiceBookingDialog, BookingServiceItem } from "@/components/checkout/service-booking-dialog";

export interface ServiceProviderListing {
  serviceId: number;
  service_id: number;
  storeId: number;
  business_id: number;
  storeName: string;
  store_name: string;
  storeSlug: string;
  store_slug: string;
  storeUrl: string;
  store_url: string;
  storeLogo: string | null;
  store_logo: string | null;
  city: string | null;
  locality: string | null;
  state: string | null;
  phone: string | null;
  whatsapp: string | null;
  isVerified: boolean;
  is_verified: boolean;
  price: number;
  regularPrice: number | null;
  regular_price: number | null;
  unit: string;
  serviceImage: string | null;
  service_image: string | null;
  serviceTitle: string;
  service_title: string;
}

interface ServiceStoresResponse {
  service: {
    id: number;
    name: string;
    slug: string;
    unit?: string;
    display_unit?: string;
    imageUrl?: string | null;
    default_image_url?: string | null;
    description?: string | null;
    categoryName?: string | null;
    category_name?: string | null;
    pricingModel?: string | null;
    storesCount?: number;
    total_sellers?: number;
    minPrice?: number;
    min_price?: number;
    maxPrice?: number;
    max_price?: number;
  };
  stores: ServiceProviderListing[];
}

interface ServiceStoresDialogProps {
  serviceId: number | string | null;
  serviceName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookService?: (service: BookingServiceItem) => void;
}

export function ServiceStoresDialog({
  serviceId,
  serviceName,
  open,
  onOpenChange,
  onBookService,
}: ServiceStoresDialogProps) {
  const [data, setData] = useState<ServiceStoresResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Booking dialog state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedForBooking, setSelectedForBooking] = useState<BookingServiceItem | null>(null);

  useEffect(() => {
    if (!open || !serviceId) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/public/services/${serviceId}/stores`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch service providers (HTTP ${res.status})`);
        }
        return res.json();
      })
      .then((json: ServiceStoresResponse) => {
        if (isMounted) {
          setData(json);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || "Failed to load provider listings.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, serviceId]);

  const handleBook = (store: ServiceProviderListing) => {
    const item: BookingServiceItem = {
      id: store.serviceId || store.service_id,
      name: store.serviceTitle || store.service_title || data?.service?.name || "Service",
      price: Number(store.price || 0),
      regular_price: store.regularPrice ?? store.regular_price,
      pricing_model: data?.service?.pricingModel || "fixed_price",
      estimated_duration: "60 mins",
      default_image_url: store.serviceImage || store.service_image || data?.service?.imageUrl || data?.service?.default_image_url || null,
      provider_name: store.storeName || store.store_name,
      business_id: store.storeId || store.business_id,
    };

    if (onBookService) {
      onBookService(item);
      onOpenChange(false);
    } else {
      setSelectedForBooking(item);
      setBookingDialogOpen(true);
    }
  };

  const service = data?.service;
  const stores = data?.stores || [];
  const minPrice = service?.minPrice ?? service?.min_price ?? 0;
  const maxPrice = service?.maxPrice ?? service?.max_price ?? 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border-border bg-card">
          {/* Header */}
          <DialogHeader className="p-5 sm:p-6 border-b border-border/60 bg-muted/20">
            <div className="flex items-start gap-4">
              <div className="relative size-16 sm:size-20 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/50">
                {service?.imageUrl || service?.default_image_url ? (
                  <Image
                    src={service.imageUrl || service.default_image_url || ""}
                    alt={service?.name || serviceName || "Service"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center bg-primary/10 text-primary">
                    <Wrench className="size-8" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary border-primary/20">
                    Service
                  </Badge>
                  {(service?.categoryName || service?.category_name) && (
                    <Badge variant="secondary" className="text-[10px] font-semibold text-muted-foreground">
                      {service.categoryName || service.category_name}
                    </Badge>
                  )}
                </div>

                <DialogTitle className="text-base sm:text-lg font-bold text-foreground leading-snug line-clamp-2">
                  {service?.name || serviceName || "Service Providers"}
                </DialogTitle>

                <DialogDescription className="text-xs text-muted-foreground line-clamp-1">
                  Compare verified providers and book directly across local stores.
                </DialogDescription>

                {!loading && stores.length > 0 && (
                  <div className="flex items-center gap-3 pt-1 text-xs">
                    <span className="font-semibold text-foreground">
                      {stores.length} Verified {stores.length === 1 ? "Provider" : "Providers"}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {minPrice > 0 ? `Starting from ₹${Number(minPrice).toLocaleString("en-IN")}` : "Free Consultation Available"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="size-7 animate-spin text-primary" />
                <p className="text-xs font-medium">Finding available providers...</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center space-y-2">
                <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                  <Wrench className="size-6" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">{error}</h4>
                <p className="text-xs text-muted-foreground">Please try selecting another service.</p>
              </div>
            ) : stores.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="size-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                  <Building2 className="size-6" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">No providers currently available</h4>
                <p className="text-xs text-muted-foreground">Check back shortly or explore alternative services.</p>
              </div>
            ) : (
              stores.map((store, index) => {
                const storeName = store.storeName || store.store_name;
                const storeUrl = store.storeUrl || store.store_url;
                const storeLogo = store.storeLogo || store.store_logo;
                const isLowestPrice = index === 0 && Number(store.price) === Number(minPrice) && minPrice > 0;

                return (
                  <div
                    key={`${store.storeId || store.business_id}-${index}`}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                      isLowestPrice
                        ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/70"
                        : "border-border/60 bg-card hover:border-primary/40 hover:shadow-xs"
                    }`}
                  >
                    {/* Provider Info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="relative size-11 sm:size-12 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/40">
                        {storeLogo ? (
                          <Image src={storeLogo} alt={storeName} fill className="object-cover" />
                        ) : (
                          <div className="size-full flex items-center justify-center bg-primary/10 text-primary">
                            <Building2 className="size-5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={storeUrl || "#"}
                            className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate"
                          >
                            {storeName}
                          </Link>
                          {(store.isVerified || store.is_verified) && (
                            <CheckCircle2 className="size-3.5 text-blue-500 shrink-0" />
                          )}
                          {isLowestPrice && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0 h-4">
                              <TrendingDown className="size-2.5 mr-0.5" /> Best Price
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          {(store.locality || store.city) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3 text-muted-foreground/80" />
                              {[store.locality, store.city].filter(Boolean).join(", ")}
                            </span>
                          )}
                          {store.phone && (
                            <span className="inline-flex items-center gap-1 text-[11px]">
                              <Phone className="size-3 text-muted-foreground/80" />
                              {store.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pricing & Booking Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      <div className="text-left sm:text-right">
                        <div className="text-base sm:text-lg font-black text-foreground">
                          {Number(store.price) > 0 ? `₹${Number(store.price).toLocaleString("en-IN")}` : "Complimentary"}
                        </div>
                        {store.unit && (
                          <div className="text-[10px] text-muted-foreground">
                            per {store.unit}
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleBook(store)}
                        className="h-9 px-4 text-xs font-bold rounded-xl gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
                      >
                        <Calendar className="size-3.5" />
                        <span>Book Now</span>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Instant Service Booking Dialog */}
      <ServiceBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        service={selectedForBooking}
      />
    </>
  );
}

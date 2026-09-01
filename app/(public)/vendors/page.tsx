"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Briefcase,
  Building,
  Building2,
  CheckCircle2,
  Home,
  Laptop,
  Library,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  Send,
  Shirt,
  Smartphone,
  Sparkles,
  Star,
  Utensils,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";
import { UniversalFeedbackDialog, type UniversalEntityTarget } from "@/components/public/universal-feedback-dialog";
import { CourseEnquiryDialog } from "@/components/public/course-enquiry-dialog";
import { SharedPublicSidebar } from "@/components/public/shared-public-sidebar";
import { SharedInterstitialBanner } from "@/components/public/shared-interstitial-banner";

export const VENDOR_CATEGORIES = [
  { id: "all", label: "All Categories", icon: Briefcase },
  { id: "House Cleaner", label: "House Cleaner", icon: Sparkles },
  { id: "Dhobi / Cloth Cleaner", label: "Dhobi / Laundry", icon: Shirt },
  { id: "Cook / Catering", label: "Cook / Mess Catering", icon: Utensils },
  { id: "PG Owners", label: "PG Owners", icon: Home },
  { id: "Hostel Owners", label: "Hostel Owners", icon: Building2 },
  { id: "Library Owners", label: "Library Owners", icon: Library },
  { id: "Books & Stationery", label: "Books & Stationery", icon: Building },
  { id: "Tech Product Providers", label: "Tech Products & Gadgets", icon: Laptop },
  { id: "Computer Repairing Service", label: "Computer / Laptop Repair", icon: Wrench },
  { id: "Mobile Repair", label: "Mobile Repair", icon: Smartphone },
  { id: "Job Consultancy", label: "Job & Placement Consultancy", icon: Briefcase },
];

export type Vendor = {
  id: number;
  name: string;
  category: string;
  phone: string;
  email: string | null;
  profile_image: string | null;
  address: string | null;
  city: string | null;
  location: string | null;
  rating: number;
  status: "active" | "inactive";
  description: string | null;
  created_at: string;
};

export default function VendorsPublicPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [feedbackTarget, setFeedbackTarget] = useState<UniversalEntityTarget | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [enquiryVendor, setEnquiryVendor] = useState<Vendor | null>(null);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, [selectedCategory]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const url = selectedCategory !== "all" 
        ? `/api/admin/vendors?category=${encodeURIComponent(selectedCategory)}` 
        : "/api/admin/vendors";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setVendors(json.vendors || []);
        if (Array.isArray(json.categories) && json.categories.length > 0) {
          setCategories(json.categories);
        }
      }
    } catch (err) {
      console.error("Error loading vendors:", err);
    } finally {
      setLoading(false);
    }
  };

  const dynamicCategoryList = useMemo(() => {
    if (categories.length > 0) {
      return [
        { id: "all", label: "All Categories", icon: Briefcase },
        ...categories.map((c) => ({
          id: c.name,
          label: c.name,
          icon: Briefcase,
        })),
      ];
    }
    return VENDOR_CATEGORIES;
  }, [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((v) => {
      if (v.status === "inactive") return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        (v.city && v.city.toLowerCase().includes(q)) ||
        (v.location && v.location.toLowerCase().includes(q)) ||
        (v.description && v.description.toLowerCase().includes(q))
      );
    });
  }, [vendors, search]);

  return (
    <div className="min-h-screen bg-background pb-16 pt-6">
      <div className="container mx-auto px-4 space-y-6">
        <SeoBreadcrumbs items={[{ label: "Verified Campus Vendors & Services" }]} />

        {/* Page Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-1">Campus Essential Services</Badge>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              Verified Student & Campus Vendors
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Find verified laundry services, mess catering, PG/hostel providers, repair technicians, and stationery stores.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor name, service, city..."
              className="pl-9 text-xs h-10 rounded-xl"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {dynamicCategoryList.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "bg-card border border-border hover:border-primary/40 text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* 2-Column Layout */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] items-start">
          {/* Main Listings Column */}
          <div className="space-y-6 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-sm text-muted-foreground rounded-2xl border border-border bg-card/70 shadow-2xs">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading verified vendors...
              </div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground rounded-2xl shadow-2xs space-y-3">
                <Briefcase className="h-10 w-10 mx-auto opacity-30 text-primary" />
                <p className="font-semibold text-base text-foreground">No Vendors Found</p>
                <p className="text-xs">Try selecting a different category or clearing your search term.</p>
              </Card>
            ) : (
              <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((vendor, idx) => {
                  const shouldInsertBanner = (idx + 1) % 3 === 0 && idx !== filtered.length - 1;
                  const bannerIdx = Math.floor(idx / 3);

                  return (
                    <React.Fragment key={vendor.id}>
                      <Card className="p-5 shadow-2xs hover:border-primary/50 transition-all flex flex-col justify-between space-y-4 rounded-2xl border border-border/80 bg-card/95 hover:-translate-y-1">
                        <div className="space-y-3">
                          {/* Profile Header */}
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
                              {vendor.profile_image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={vendor.profile_image} alt={vendor.name} className="w-full h-full object-cover" />
                              ) : (
                                vendor.name.charAt(0).toUpperCase()
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <h3 className="font-bold text-base text-foreground truncate">{vendor.name}</h3>
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                              </div>
                              <Badge variant="outline" className="text-[10px] font-bold mt-0.5 text-primary border-primary/30">
                                {vendor.category}
                              </Badge>
                            </div>
                          </div>

                          {vendor.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {vendor.description}
                            </p>
                          )}

                          <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 text-xs border border-border/50">
                            {(vendor.city || vendor.location) && (
                              <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="truncate">
                                  {vendor.location ? `${vendor.location}, ` : ""}{vendor.city || "India"}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                              <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="font-semibold text-foreground font-mono truncate">{vendor.phone}</span>
                            </div>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                              <span className="font-bold text-foreground">{vendor.rating ? Number(vendor.rating).toFixed(1) : "4.9"}</span>
                              <span className="text-muted-foreground font-normal">/ 5.0 Rating</span>
                            </div>
                          </div>
                        </div>

                        {/* Standard 2 Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                          <button
                            type="button"
                            onClick={() => {
                              setFeedbackTarget({
                                type: "vendor",
                                id: vendor.id,
                                title: vendor.name,
                                subtitle: `${vendor.category} • ${vendor.city || vendor.location || "Vendor Services"}`,
                                avg_rating: vendor.rating || 4.9,
                                review_count: 18,
                              });
                              setFeedbackOpen(true);
                            }}
                            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-amber-300 bg-amber-50/70 text-xs font-bold text-amber-800 transition hover:bg-amber-100 cursor-pointer shadow-2xs"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                            <span>Reviews & Q&A</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEnquiryVendor(vendor);
                              setEnquiryOpen(true);
                            }}
                            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-bold text-primary-foreground transition hover:bg-primary/90 cursor-pointer shadow-xs"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Enquiry</span>
                          </button>
                        </div>
                      </Card>

                      {/* 200px Banner after every 3 items */}
                      {shouldInsertBanner && (
                        <SharedInterstitialBanner
                          bannerIndex={bannerIdx}
                          pageType="vendors"
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar Options & Ads */}
          <SharedPublicSidebar
            pageType="vendors"
            activeCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(selectedCategory === cat ? "all" : cat)}
          />
        </div>
      </div>

      {/* Universal Feedback Dialog */}
      <UniversalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        target={feedbackTarget}
      />

      {/* Vendor Enquiry Dialog */}
      <CourseEnquiryDialog
        open={enquiryOpen}
        onOpenChange={setEnquiryOpen}
        course={enquiryVendor ? {
          id: enquiryVendor.id,
          title: enquiryVendor.name,
          institute: `${enquiryVendor.category} • ${enquiryVendor.city || enquiryVendor.location || "Vendor Services"}`,
          price: "Service Inquiry",
          duration: enquiryVendor.phone,
        } : null}
      />
    </div>
  );
}

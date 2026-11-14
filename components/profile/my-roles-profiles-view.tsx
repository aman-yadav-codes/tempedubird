"use client";

import Link from "next/link";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Building2,
  Briefcase,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  Globe,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  Loader2,
  ShieldCheck,
  ExternalLink,
  Layers,
  Send,
  Package,
} from "lucide-react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import { BusinessOwnerWorkspace } from "@/components/business/business-owner-workspace";
import { ProfessionalWorkspace } from "@/components/professional/professional-workspace";

interface BusinessProfileData {
  id: number;
  name: string;
  slug: string;
  business_type: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  country_code: string | null;
  address: string | null;
  locality: string | null;
  postal_code: string | null;
  about: string | null;
  established_year: number | null;
  is_active: boolean;
  is_verified?: boolean;
}

interface ProfessionalProfileData {
  id: number;
  name: string;
  slug: string;
  profession_type: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  country_code: string | null;
  address: string | null;
  locality: string | null;
  postal_code: string | null;
  about: string | null;
  experience_years: number | null;
  is_active: boolean;
  is_verified?: boolean;
}

interface FavoriteItem {
  id: number;
  business_id: number | null;
  professional_id: number | null;
  created_at: string;
  business_name?: string;
  business_city?: string;
  business_phone?: string;
  professional_name?: string;
  professional_city?: string;
  professional_phone?: string;
  professional_title?: string;
}

interface InquiryItem {
  id: number;
  customer_name: string;
  message: string;
  status: string;
  created_at: string;
  business_name?: string;
  professional_name?: string;
}

export function MyRolesProfilesView() {
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [workspaceTab, setWorkspaceTab] = useState<string>("roles");
  const [businessProfile, setBusinessProfile] = useState<BusinessProfileData | null>(null);
  const [professionalProfile, setProfessionalProfile] = useState<ProfessionalProfileData | null>(null);
  const [favoritesList, setFavoritesList] = useState<FavoriteItem[]>([]);
  const [inquiriesList, setInquiriesList] = useState<InquiryItem[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"business" | "professional">("business");
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    name: "",
    businessType: "Retail / Commercial",
    professionType: "Consultant / Specialist",
    phone: "",
    email: "",
    website: "",
    city: "",
    state: "",
    locality: "",
    address: "",
    postalCode: "",
    countryCode: "IN",
    about: "",
    establishedYear: "",
    experienceYears: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/user/roles-profiles", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await res.json();
      if (data.success && data.data) {
        setBusinessProfile(data.data.businessProfile);
        setProfessionalProfile(data.data.professionalProfile);
      }

      // Fetch Customer Favorites
      const favRes = await fetch("/api/customer/favorites", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (favRes.ok) {
        const favData = await favRes.json();
        setFavoritesList(favData.data || []);
      }

      // Fetch Customer Inquiries
      const inqRes = await fetch("/api/customer/enquiries", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (inqRes.ok) {
        const inqData = await inqRes.json();
        setInquiriesList(inqData.data || []);
      }
    } catch (err: unknown) {
      console.error("Error loading roles and profiles", err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openForm = (mode: "business" | "professional") => {
    setDialogMode(mode);
    if (mode === "business" && businessProfile) {
      setFormData({
        name: businessProfile.name || "",
        businessType: businessProfile.business_type || "Retail / Commercial",
        professionType: "Consultant",
        phone: businessProfile.phone || user?.phone || "",
        email: businessProfile.email || user?.email || "",
        website: businessProfile.website || "",
        city: businessProfile.city || "",
        state: businessProfile.state || "",
        locality: businessProfile.locality || "",
        address: businessProfile.address || "",
        postalCode: businessProfile.postal_code || "",
        countryCode: businessProfile.country_code || "IN",
        about: businessProfile.about || "",
        establishedYear: businessProfile.established_year ? String(businessProfile.established_year) : "",
        experienceYears: "",
      });
    } else if (mode === "professional" && professionalProfile) {
      setFormData({
        name: professionalProfile.name || "",
        businessType: "Business",
        professionType: professionalProfile.profession_type || "Legal & Compliance",
        phone: professionalProfile.phone || user?.phone || "",
        email: professionalProfile.email || user?.email || "",
        website: professionalProfile.website || "",
        city: professionalProfile.city || "",
        state: professionalProfile.state || "",
        locality: professionalProfile.locality || "",
        address: professionalProfile.address || "",
        postalCode: professionalProfile.postal_code || "",
        countryCode: professionalProfile.country_code || "IN",
        about: professionalProfile.about || "",
        establishedYear: "",
        experienceYears: professionalProfile.experience_years ? String(professionalProfile.experience_years) : "",
      });
    } else {
      setFormData({
        name: "",
        businessType: "Retail / Commercial",
        professionType: "Legal & Compliance",
        phone: user?.phone || "",
        email: user?.email || "",
        website: "",
        city: "",
        state: "",
        locality: "",
        address: "",
        postalCode: "",
        countryCode: "IN",
        about: "",
        establishedYear: "",
        experienceYears: "",
      });
    }
    setDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(dialogMode === "business" ? "Business name is required" : "Professional name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/user/roles-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          profileType: dialogMode,
          name: formData.name.trim(),
          businessType: dialogMode === "business" ? formData.businessType.trim() : undefined,
          professionType: dialogMode === "professional" ? formData.professionType.trim() : undefined,
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          website: formData.website.trim() || undefined,
          city: formData.city.trim() || undefined,
          state: formData.state.trim() || undefined,
          locality: formData.locality.trim() || undefined,
          address: formData.address.trim() || undefined,
          postalCode: formData.postalCode.trim() || undefined,
          countryCode: formData.countryCode,
          about: formData.about.trim() || undefined,
          establishedYear: formData.establishedYear ? Number(formData.establishedYear) : undefined,
          experienceYears: formData.experienceYears ? Number(formData.experienceYears) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");

      toast.success(data.message || "Profile updated successfully!");
      setDialogOpen(false);
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error saving profile");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span>Loading roles and profiles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workspace Navigation Tabs */}
      <Tabs value={workspaceTab} onValueChange={setWorkspaceTab} className="space-y-6">
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="roles" className="text-xs font-semibold gap-2 py-2">
            <Layers className="size-4" /> Multiple Roles & Customer Activity
          </TabsTrigger>
          <TabsTrigger value="business" className="text-xs font-semibold gap-2 py-2">
            <Building2 className="size-4 text-blue-600" /> Business Owner Workspace
            {businessProfile && <Badge variant="secondary" className="text-[10px] ml-1 bg-blue-100 text-blue-700">Active</Badge>}
          </TabsTrigger>
          <TabsTrigger value="professional" className="text-xs font-semibold gap-2 py-2">
            <Briefcase className="size-4 text-purple-600" /> Professional Provider Workspace
            {professionalProfile && <Badge variant="secondary" className="text-[10px] ml-1 bg-purple-100 text-purple-700">Active</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: ALL ROLES OVERVIEW ================= */}
        <TabsContent value="roles" className="space-y-6">
          {/* Overview Banner */}
          <Card className="rounded-2xl border shadow-xs bg-linear-to-r from-blue-50/60 via-indigo-50/30 to-purple-50/40 dark:from-blue-950/20 dark:via-background dark:to-purple-950/20">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <Layers className="size-5 text-primary" />
                    Multiple Roles Under One Account
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Your single user account ({user?.email || user?.phone}) simultaneously supports Customer, Business Owner, and Professional Service Provider roles.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-xs">
                    <CheckCircle2 className="size-3 mr-1" /> Customer: Active
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      businessProfile
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {businessProfile ? <CheckCircle2 className="size-3 mr-1" /> : <AlertCircle className="size-3 mr-1" />}
                    Business: {businessProfile ? "Active" : "Not Added"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      professionalProfile
                        ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {professionalProfile ? <CheckCircle2 className="size-3 mr-1" /> : <AlertCircle className="size-3 mr-1" />}
                    Professional: {professionalProfile ? "Active" : "Not Added"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* 3 Personas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Customer Persona */}
            <Card className="rounded-2xl border shadow-xs flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                        <UserCheck className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">Customer</CardTitle>
                        <CardDescription className="text-[11px]">Consumer & Client Role</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                      Enabled
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <p className="text-muted-foreground leading-relaxed">
                    As a registered customer on the platform, you can discover businesses and professionals, send inquiries, place orders, and book consultations.
                  </p>
                  <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Account Status:</span>
                      <span className="font-semibold text-emerald-600">Active</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Role Scope:</span>
                      <span className="font-semibold text-foreground">Global Platform</span>
                    </div>
                  </div>
                </CardContent>
              </div>
              <CardFooter className="p-4 pt-0 border-t border-border/30 bg-muted/5 mt-4">
                <Link href="/explore" className="w-full">
                  <Button size="sm" variant="outline" className="w-full text-xs font-semibold gap-1.5 cursor-pointer">
                    <Search className="size-3.5 text-primary" /> Browse & Explore Listings
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* 2. Business Owner Persona */}
            <Card className="rounded-2xl border shadow-xs flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                        <Building2 className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">Business Owner</CardTitle>
                        <CardDescription className="text-[11px]">Enterprise & Retailer Role</CardDescription>
                      </div>
                    </div>
                    {businessProfile ? (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                        Optional
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  {businessProfile ? (
                    <div className="space-y-2">
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Business Name</span>
                        <span className="font-bold text-foreground text-sm">{businessProfile.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block">Type</span>
                          <span className="font-medium text-foreground">{businessProfile.business_type}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Location</span>
                          <span className="font-medium text-foreground">{businessProfile.city || "Not set"}</span>
                        </div>
                      </div>
                      {businessProfile.website && (
                        <div className="text-[11px]">
                          <span className="text-muted-foreground block">Website</span>
                          <a href={businessProfile.website} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            {businessProfile.website} <ExternalLink className="size-2.5" />
                          </a>
                        </div>
                      )}
                      {businessProfile.about && (
                        <p className="text-muted-foreground text-[11px] line-clamp-2 italic">
                          &quot;{businessProfile.about}&quot;
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 space-y-2">
                      <Building2 className="size-8 mx-auto text-muted-foreground/40" />
                      <p className="text-muted-foreground text-xs">
                        You have not added a business profile yet. Add your business details to sell products, manage inventory, and receive customer inquiries.
                      </p>
                    </div>
                  )}
                </CardContent>
              </div>
              <CardFooter className="p-4 pt-0 border-t border-border/30 bg-muted/5 mt-4 flex flex-col gap-2">
                {businessProfile ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(businessProfile.slug ? `/institutes/${businessProfile.slug}` : `/institutes/${businessProfile.id}`, "_blank")}
                      className="w-full text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="size-3.5 text-primary" /> View Live Profile Page
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setWorkspaceTab("business")}
                      className="w-full text-xs font-semibold gap-1.5 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Package className="size-3.5" /> Manage Products, Services & Store
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openForm("business")}
                      className="w-full text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="size-3.5" /> Edit Basic Details
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => openForm("business")}
                    className="w-full text-xs font-semibold gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="size-3.5" /> Add Business Profile
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* 3. Professional Provider Persona */}
            <Card className="rounded-2xl border shadow-xs flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                        <Briefcase className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">Professional Provider</CardTitle>
                        <CardDescription className="text-[11px]">Specialist & Consultant Role</CardDescription>
                      </div>
                    </div>
                    {professionalProfile ? (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                        Optional
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  {professionalProfile ? (
                    <div className="space-y-2">
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Practice / Professional Name</span>
                        <span className="font-bold text-foreground text-sm">{professionalProfile.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block">Profession</span>
                          <span className="font-medium text-foreground">{professionalProfile.profession_type}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Experience</span>
                          <span className="font-medium text-foreground">
                            {professionalProfile.experience_years ? `${professionalProfile.experience_years} yrs` : "Not specified"}
                          </span>
                        </div>
                      </div>
                      {professionalProfile.city && (
                        <div className="text-[11px]">
                          <span className="text-muted-foreground block">Location</span>
                          <span className="font-medium text-foreground">{professionalProfile.city}</span>
                        </div>
                      )}
                      {professionalProfile.about && (
                        <p className="text-muted-foreground text-[11px] line-clamp-2 italic">
                          &quot;{professionalProfile.about}&quot;
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 space-y-2">
                      <Briefcase className="size-8 mx-auto text-muted-foreground/40" />
                      <p className="text-muted-foreground text-xs">
                        You have not added a professional profile yet. Add your practice details to list professional services, set your hourly rates, and consult clients.
                      </p>
                    </div>
                  )}
                </CardContent>
              </div>
              <CardFooter className="p-4 pt-0 border-t border-border/30 bg-muted/5 mt-4 flex flex-col gap-2">
                {professionalProfile ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(`/explore?type=professional&q=${encodeURIComponent(professionalProfile.name)}`, "_blank")}
                      className="w-full text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="size-3.5 text-purple-600" /> View Live Profile Page
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setWorkspaceTab("professional")}
                      className="w-full text-xs font-semibold gap-1.5 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Briefcase className="size-3.5" /> Manage Practice, Rates & Services
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openForm("professional")}
                      className="w-full text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="size-3.5" /> Edit Basic Details
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => openForm("professional")}
                    className="w-full text-xs font-semibold gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="size-3.5" /> Add Professional Profile
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          {/* Customer Activity: Favorites & Sent Enquiries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Saved Favorites */}
            <Card className="rounded-2xl border shadow-xs">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="text-rose-600">❤️</span> Saved Favorites ({favoritesList.length})
                  </CardTitle>
                  <Link href="/explore">
                    <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-primary">
                      Discover More
                    </Button>
                  </Link>
                </div>
                <CardDescription className="text-xs">
                  Your bookmarked businesses and professional services for quick access.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3">
                {favoritesList.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6 italic">
                    No favorites saved yet. Click the heart icon on any listing in Explore to save it here.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {favoritesList.map((fav) => {
                      const title = fav.business_name || fav.professional_name || "Saved Item";
                      const city = fav.business_city || fav.professional_city || "India";
                      const phone = fav.business_phone || fav.professional_phone;

                      return (
                        <div key={fav.id} className="p-3 rounded-xl border bg-card flex items-center justify-between">
                          <div>
                            <span className="font-bold text-foreground text-xs block">{title}</span>
                            <span className="text-[11px] text-muted-foreground">{city}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {phone && (
                              <a href={`tel:${phone}`}>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                                  <Phone className="size-3 mr-1" /> Call
                                </Button>
                              </a>
                            )}
                            <Link href={`/explore?q=${encodeURIComponent(title)}`}>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                                <ExternalLink className="size-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sent Enquiries */}
            <Card className="rounded-2xl border shadow-xs">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Send className="size-4 text-primary" /> My Sent Enquiries ({inquiriesList.length})
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    Direct Messages
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Inquiries and booking requests submitted to businesses and service providers.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3">
                {inquiriesList.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6 italic">
                    You have not submitted any enquiries yet. Use the Contact / Inquire button on any listing to connect.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {inquiriesList.map((inq) => {
                      const target = inq.business_name || inq.professional_name || "Provider";

                      return (
                        <div key={inq.id} className="p-3 rounded-xl border bg-card space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground text-xs">To: {target}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                inq.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {inq.status || "Pending"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-[11px] line-clamp-2">
                            &quot;{inq.message}&quot;
                          </p>
                          <span className="text-[10px] text-muted-foreground block text-right">
                            {new Date(inq.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================= TAB 2: BUSINESS OWNER WORKSPACE ================= */}
        <TabsContent value="business" className="space-y-6">
          <BusinessOwnerWorkspace />
        </TabsContent>

        {/* ================= TAB 3: PROFESSIONAL WORKSPACE ================= */}
        <TabsContent value="professional" className="space-y-6">
          <ProfessionalWorkspace />
        </TabsContent>
      </Tabs>

      {/* Edit / Add Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                {dialogMode === "business" ? <Building2 className="size-5" /> : <Briefcase className="size-5" />}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {dialogMode === "business"
                    ? businessProfile
                      ? "Edit Business Profile"
                      : "Add New Business Profile"
                    : professionalProfile
                    ? "Edit Professional Profile"
                    : "Add New Professional Profile"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {dialogMode === "business"
                    ? "Set up your enterprise, store, or service business on the discovery marketplace."
                    : "Set up your individual practice as an independent licensed consultant or freelancer."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">
                  {dialogMode === "business" ? "Business / Store Name *" : "Full Legal / Practice Name *"}
                </Label>
                <Input
                  required
                  placeholder={dialogMode === "business" ? "e.g. Apex Hardware Store" : "e.g. Adv. Rajesh Sharma"}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  {dialogMode === "business" ? "Business Type *" : "Profession / Specialization *"}
                </Label>
                <Input
                  required
                  placeholder={dialogMode === "business" ? "e.g. Retail, Healthcare, IT" : "e.g. Lawyer, Doctor, Accountant"}
                  value={dialogMode === "business" ? formData.businessType : formData.professionType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ...(dialogMode === "business"
                        ? { businessType: e.target.value }
                        : { professionType: e.target.value }),
                    })
                  }
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Contact Phone</Label>
                <Input
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Official Email</Label>
                <Input
                  type="email"
                  placeholder="contact@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Website</Label>
                <Input
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Country</Label>
                <select
                  value={formData.countryCode}
                  onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="IN">India (+91)</option>
                  <option value="US">United States (+1)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">City</Label>
                <Input
                  placeholder="e.g. Mumbai, New York"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">State / Province</Label>
                <Input
                  placeholder="e.g. Maharashtra, NY"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Locality / Neighborhood</Label>
                <Input
                  placeholder="e.g. Andheri West"
                  value={formData.locality}
                  onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Postal / PIN Code</Label>
                <Input
                  placeholder="e.g. 400053"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Full Address</Label>
              <Input
                placeholder="Shop/Office number, building, street..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            {dialogMode === "business" ? (
              <div>
                <Label className="text-xs font-semibold">Established Year</Label>
                <Input
                  type="number"
                  placeholder="e.g. 2018"
                  value={formData.establishedYear}
                  onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            ) : (
              <div>
                <Label className="text-xs font-semibold">Experience (in Years)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 10"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold">About / Professional Description</Label>
              <Textarea
                placeholder="Short description of your services, certifications, and specialities..."
                value={formData.about}
                onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                className="mt-1 text-xs"
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="bg-primary text-primary-foreground font-semibold">
                {submitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                Save Profile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

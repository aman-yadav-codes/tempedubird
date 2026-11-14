"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Briefcase,
  Search,
  Globe,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  ExternalLink,
  Loader2,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  GitMerge,
  Star,
  Package,
  Layers,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  Compass,
  Award,
  GraduationCap,
  Image as ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import Link from "next/link";
import { CreateBusinessProfileDialog } from "@/components/business/create-business-profile-dialog";

interface BusinessProfile {
  id: number;
  name: string;
  slug: string;
  business_type: string;
  phone: string | null;
  whatsapp?: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  district?: string | null;
  state: string | null;
  country_code: string | null;
  locality?: string | null;
  address?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  about: string | null;
  custom_description?: string | null;
  established_year: number | null;
  is_active: boolean;
  is_verified: boolean;
  verification_status: string;
  is_featured: boolean;
  logo_url?: string | null;
  banner_url?: string | null;
  gallery_images?: string[];
  opening_hours?: Record<string, any>;
  holidays?: any;
  social_links?: Record<string, string>;
  branches?: any[];
  category_name?: string | null;
  subcategory_name?: string | null;
  subcategory_ids?: number[];
  products_count?: number;
  services_count?: number;
  professionals_count?: number;
  reviews_count?: number;
  average_rating?: number;
  created_at: string;
  updated_at?: string;
  owner_id: number | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
}

interface ProfessionalProfile {
  id: number;
  name: string;
  slug: string;
  professional_title: string | null;
  profession_type: string;
  designation?: string | null;
  skills?: string[];
  business_profile_id?: number | null;
  business_name?: string | null;
  business_slug?: string | null;
  phone: string | null;
  whatsapp?: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  district?: string | null;
  state: string | null;
  country_code: string | null;
  locality?: string | null;
  address?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  introduction?: string | null;
  about: string | null;
  experience_years: number | null;
  qualifications?: any;
  certifications?: any;
  is_active: boolean;
  is_verified: boolean;
  verification_status: string;
  is_featured: boolean;
  remote_available: boolean;
  onsite_available: boolean;
  working_hours?: Record<string, any>;
  service_areas?: string[];
  avatar_url?: string | null;
  banner_url?: string | null;
  portfolio_images?: string[];
  category_name?: string | null;
  subcategory_name?: string | null;
  subcategory_ids?: number[];
  services_count?: number;
  reviews_count?: number;
  average_rating?: number;
  created_at: string;
  updated_at?: string;
  owner_id: number | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
}

export default function BusinessAndProfessionalProfilesPage() {
  const { accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"business" | "professional">("business");
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [professionalProfiles, setProfessionalProfiles] = useState<ProfessionalProfile[]>([]);
  const [newBranch, setNewBranch] = useState({ name: "", city: "", phone: "", address: "" });
  const [addingBranch, setAddingBranch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Inspection Modal
  const [selectedProfile, setSelectedProfile] = useState<{
    type: "business" | "professional";
    data: BusinessProfile | ProfessionalProfile;
  } | null>(null);

  // Deletion Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "business" | "professional"; id: number; name: string } | null>(null);

  const confirmDeleteProfile = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/admin/profiles?type=${deleteConfirm.type}&id=${deleteConfirm.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete profile");
      toast.success(json.message);
      setDeleteConfirm(null);
      if (selectedProfile?.data.id === deleteConfirm.id) setSelectedProfile(null);
      loadProfiles();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Deletion failed");
    }
  };
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [dupLoading, setDupLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [createBusinessOpen, setCreateBusinessOpen] = useState(false);
  const [createBusinessInitialData, setCreateBusinessInitialData] = useState<any>(null);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/profiles", window.location.origin);
      if (searchQuery) url.searchParams.set("search", searchQuery);
      if (countryFilter !== "all") url.searchParams.set("country", countryFilter);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);

      const res = await fetch(url.toString(), {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load profiles");

      setBusinessProfiles(data.data?.businessProfiles || []);
      setProfessionalProfiles(data.data?.professionalProfiles || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error loading profiles");
    } finally {
      setLoading(false);
    }
  }, [accessToken, searchQuery, countryFilter, statusFilter]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleAction = async (
    type: "business" | "professional",
    id: number,
    action: string,
    payload: Record<string, any> = {}
  ) => {
    try {
      const res = await fetch("/api/admin/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, action, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update profile");
      toast.success(json.message || "Profile updated");
      loadProfiles();
      if (selectedProfile && selectedProfile.data.id === id) {
        setSelectedProfile({
          ...selectedProfile,
          data: { ...selectedProfile.data, ...payload },
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  };

  const checkDuplicates = async () => {
    setDuplicateModalOpen(true);
    setDupLoading(true);
    try {
      const res = await fetch("/api/admin/profiles?checkDuplicates=true");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to detect duplicates");
      setDuplicates(json.duplicates || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Duplicate check failed");
    } finally {
      setDupLoading(false);
    }
  };

  const mergeDuplicates = async (primaryId: number, duplicateId: number) => {
    setMerging(true);
    try {
      const res = await fetch("/api/admin/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "merge_duplicates", primaryListingId: primaryId, duplicateListingId: duplicateId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to merge listings");
      toast.success(json.message);
      checkDuplicates();
      loadProfiles();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setMerging(false);
    }
  };

  const handleAddBranch = async () => {
    if (!selectedProfile || selectedProfile.type !== "business" || !newBranch.name.trim()) {
      toast.error("Please enter a branch name");
      return;
    }
    setAddingBranch(true);
    try {
      const bProfile = selectedProfile.data as BusinessProfile;
      const currentBranches = Array.isArray(bProfile.branches) ? bProfile.branches : [];
      const updatedBranches = [...currentBranches, { ...newBranch, id: Date.now() }];
      await handleAction("business", bProfile.id, "edit", {
        data: { branches: JSON.stringify(updatedBranches) },
      });
      setSelectedProfile({
        ...selectedProfile,
        data: {
          ...bProfile,
          branches: updatedBranches,
        },
      });
      setNewBranch({ name: "", city: "", phone: "", address: "" });
      toast.success("Branch added successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to add branch");
    } finally {
      setAddingBranch(false);
    }
  };

  const handleRemoveBranch = async (branchIndex: number) => {
    if (!selectedProfile || selectedProfile.type !== "business") return;
    try {
      const bProfile = selectedProfile.data as BusinessProfile;
      const currentBranches = Array.isArray(bProfile.branches) ? [...bProfile.branches] : [];
      currentBranches.splice(branchIndex, 1);
      await handleAction("business", bProfile.id, "edit", {
        data: { branches: JSON.stringify(currentBranches) },
      });
      setSelectedProfile({
        ...selectedProfile,
        data: {
          ...bProfile,
          branches: currentBranches,
        },
      });
      toast.success("Branch removed");
    } catch (e: any) {
      toast.error(e.message || "Failed to remove branch");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Business & Professional Listing Management</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Modules 6 & 7
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Verify, approve, feature, suspend listings, and identify and merge duplicate records safely.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setCreateBusinessOpen(true)}
            className="text-xs h-8 gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            <Plus className="size-3.5" />
            Add Business Listing
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={checkDuplicates}
            className="text-xs h-8 gap-1.5 border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10"
          >
            <GitMerge className="size-3.5" />
            Duplicate Detection
          </Button>

          <Button variant="outline" size="sm" onClick={loadProfiles} disabled={loading} className="text-xs h-8 gap-1.5">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by listing name, phone, email, city, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="h-9 w-28 text-xs">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              <SelectItem value="IN">India (₹)</SelectItem>
              <SelectItem value="US">USA ($)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-32 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="verified">Verified Only</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="featured">Featured Only</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-muted p-1 rounded-md text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("business")}
            className={`px-3 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "business" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
            }`}
          >
            <Building2 className="size-3.5 text-indigo-500" />
            Businesses ({businessProfiles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("professional")}
            className={`px-3 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "professional" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
            }`}
          >
            <Briefcase className="size-3.5 text-purple-500" />
            Professionals ({professionalProfiles.length})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Listing Name & ID</TableHead>
                <TableHead className="text-xs">Category & Location</TableHead>
                <TableHead className="text-xs">Owner & Contact</TableHead>
                <TableHead className="text-xs">Catalog & Stats</TableHead>
                <TableHead className="text-xs">Verification</TableHead>
                <TableHead className="text-xs">Featured</TableHead>
                <TableHead className="text-xs text-right">Admin Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                    Loading platform listings...
                  </TableCell>
                </TableRow>
              ) : activeTab === "business" ? (
                businessProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No business listings found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  businessProfiles.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-xs">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-indigo-500/10 text-indigo-600 font-bold flex items-center justify-center text-xs">
                            {b.name?.charAt(0) || "B"}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{b.name}</p>
                            <span className="text-[10px] text-muted-foreground">Listing #{b.id} • /{b.slug}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs space-y-0.5">
                        <Badge variant="secondary" className="text-[10px]">{b.category_name || b.business_type || "Business"}</Badge>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground" />
                          {b.city || "Unknown City"}, {b.country_code || "IN"}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs space-y-0.5">
                        <p className="font-medium text-foreground">{b.owner_name || "Unknown Owner"}</p>
                        <p className="text-[11px] text-muted-foreground">{b.phone || b.email || "No contact"}</p>
                      </TableCell>
                      <TableCell className="text-xs space-y-0.5">
                        <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                          <span><Package className="size-3 inline mr-0.5 text-emerald-600" /> {b.products_count || 0}</span>
                          <span>•</span>
                          <span><Layers className="size-3 inline mr-0.5 text-teal-600" /> {b.services_count || 0}</span>
                          <span>•</span>
                          <span className="text-purple-600 font-semibold" title="Associated Professionals">
                            <Briefcase className="size-3 inline mr-0.5 text-purple-600" /> {b.professionals_count || 0} pros
                          </span>
                        </div>
                        {b.reviews_count ? (
                          <div className="flex items-center text-amber-500 font-bold text-[10px] gap-0.5">
                            <Star className="size-2.5 fill-amber-500" /> {b.average_rating} ({b.reviews_count})
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs">
                        {b.is_verified ? (
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                            Verified
                          </Badge>
                        ) : b.verification_status === "pending" ? (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Unverified</Badge>
                        )}
                        {!b.is_active && (
                          <Badge variant="destructive" className="text-[10px] block mt-0.5 w-fit">Suspended</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction("business", b.id, "feature", { isFeatured: !b.is_featured })}
                          className={`h-6 text-[10px] px-2 ${b.is_featured ? "text-amber-600 font-bold" : "text-muted-foreground"}`}
                        >
                          <Sparkles className="size-3 mr-1" />
                          {b.is_featured ? "Featured" : "Standard"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-xs text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View Public Profile Page"
                          onClick={() => window.open(b.slug ? `/institutes/${b.slug}` : `/institutes/${b.id}`, "_blank")}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="size-3.5 mr-1" /> View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProfile({ type: "business", data: b })}
                          className="h-7 text-xs"
                        >
                          Inspect
                        </Button>
                        {b.verification_status === "pending" ? (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAction("business", b.id, "approve")}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleAction("business", b.id, "reject")}
                              className="h-7 text-xs"
                            >
                              Reject
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant={b.is_active ? "destructive" : "secondary"}
                            size="sm"
                            onClick={() => handleAction("business", b.id, "toggle_status", { isActive: !b.is_active })}
                            className="h-7 text-xs"
                          >
                            {b.is_active ? "Suspend" : "Activate"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm({ type: "business", id: b.id, name: b.name })}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                          title="Delete Listing"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )
              ) : (
                professionalProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No professional profiles found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  professionalProfiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-xs">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-purple-500/10 text-purple-600 font-bold flex items-center justify-center text-xs">
                            {p.name?.charAt(0) || "P"}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{p.name}</p>
                            <span className="text-[10px] text-muted-foreground">Pro #{p.id} • /{p.slug}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs space-y-0.5">
                        <Badge variant="secondary" className="text-[10px]">{p.designation || p.professional_title || p.profession_type || "Professional"}</Badge>
                        {p.business_name && (
                          <p className="text-[10px] font-semibold text-rose-600 flex items-center gap-1">
                            <Building2 className="size-3 text-rose-500" />
                            {p.business_name}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground" />
                          {p.city || "Remote"}, {p.country_code || "IN"}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs space-y-0.5">
                        <p className="font-medium text-foreground">{p.owner_name || p.name}</p>
                        <p className="text-[11px] text-muted-foreground">{p.phone || p.email || "No contact"}</p>
                      </TableCell>
                      <TableCell className="text-xs space-y-0.5">
                        <span className="text-muted-foreground text-[11px]">
                          <Layers className="size-3 inline mr-0.5 text-teal-600" /> {p.services_count || 0} services
                        </span>
                        {p.experience_years ? (
                          <p className="text-[10px] text-muted-foreground">{p.experience_years} years exp</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.is_verified ? (
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Verified</Badge>
                        ) : p.verification_status === "pending" ? (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Unverified</Badge>
                        )}
                        {!p.is_active && (
                          <Badge variant="destructive" className="text-[10px] block mt-0.5 w-fit">Suspended</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction("professional", p.id, "feature", { isFeatured: !p.is_featured })}
                          className={`h-6 text-[10px] px-2 ${p.is_featured ? "text-amber-600 font-bold" : "text-muted-foreground"}`}
                        >
                          <Sparkles className="size-3 mr-1" />
                          {p.is_featured ? "Featured" : "Standard"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-xs text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View Public Profile Page"
                          onClick={() => window.open(`/explore?type=professional&q=${encodeURIComponent(p.name)}`, "_blank")}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-purple-600"
                        >
                          <ExternalLink className="size-3.5 mr-1" /> View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProfile({ type: "professional", data: p })}
                          className="h-7 text-xs"
                        >
                          Inspect
                        </Button>
                        <Button
                          variant={p.is_active ? "destructive" : "secondary"}
                          size="sm"
                          onClick={() => handleAction("professional", p.id, "toggle_status", { isActive: !p.is_active })}
                          className="h-7 text-xs"
                        >
                          {p.is_active ? "Suspend" : "Activate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm({ type: "professional", id: p.id, name: p.name })}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                          title="Delete Profile"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inspect & Detail Dialog - Pixel-Perfect Match with Screenshot */}
      <Dialog open={selectedProfile !== null} onOpenChange={(open) => !open && setSelectedProfile(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-border/80 shadow-2xl">
          {selectedProfile && (
            <>
              {/* MODAL HEADER MATCHING SCREENSHOT */}
              <div className="p-5 border-b flex items-start justify-between bg-card">
                <div className="flex items-center gap-3">
                  <div className={`flex size-11 items-center justify-center rounded-xl border shadow-xs ${
                    selectedProfile.type === "business"
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200/50"
                      : "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200/50"
                  }`}>
                    {selectedProfile.type === "business" ? <Building2 className="size-6" /> : <Briefcase className="size-6" />}
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <span>{selectedProfile.data.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        (ID #{selectedProfile.data.id} • /{selectedProfile.data.slug})
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {selectedProfile.type === "business" ? "Business Listing Management" : "Professional Profile Management"}
                    </DialogDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2 mr-6">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 font-semibold border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
                    onClick={() => {
                      if (selectedProfile.type === "business") {
                        const b = selectedProfile.data;
                        window.open(b.slug ? `/institutes/${b.slug}` : `/institutes/${b.id}`, "_blank");
                      } else {
                        const p = selectedProfile.data;
                        window.open(`/explore?type=professional&q=${encodeURIComponent(p.name)}`, "_blank");
                      }
                    }}
                  >
                    <ExternalLink className="size-3" /> View Profile Page
                  </Button>
                  <Badge
                    variant="outline"
                    className={
                      selectedProfile.data.is_verified
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[10px]"
                        : "bg-amber-50 text-amber-700 border-amber-200 gap-1 text-[10px]"
                    }
                  >
                    {selectedProfile.data.is_verified ? (
                      <>
                        <CheckCircle2 className="size-3" /> Verified
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="size-3" /> Unverified
                      </>
                    )}
                  </Badge>
                </div>
              </div>

              {/* 5-TAB NAVIGATION WITH RED ACTIVE PILL BAR */}
              <Tabs defaultValue="overview" className="w-full">
                <div className="px-5 pt-4 pb-2 bg-muted/20">
                  <div className="bg-slate-100 dark:bg-muted/60 p-1 rounded-xl border border-border/70">
                    <TabsList className="bg-transparent grid grid-cols-5 gap-1 h-auto p-0 w-full">
                      <TabsTrigger
                        value="overview"
                        className="rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold text-xs py-2 transition-all shadow-none cursor-pointer"
                      >
                        Overview
                      </TabsTrigger>
                      <TabsTrigger
                        value="location"
                        className="rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold text-xs py-2 transition-all shadow-none cursor-pointer"
                      >
                        Location & Map
                      </TabsTrigger>
                      <TabsTrigger
                        value="contact"
                        className="rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold text-xs py-2 transition-all shadow-none cursor-pointer"
                      >
                        Contact & Social
                      </TabsTrigger>
                      <TabsTrigger
                        value="branches"
                        className="rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold text-xs py-2 transition-all shadow-none cursor-pointer"
                      >
                        {selectedProfile.type === "business" ? "Branches & Hours" : "Hours & Skills"}
                      </TabsTrigger>
                      <TabsTrigger
                        value="owner"
                        className="rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold text-xs py-2 transition-all shadow-none cursor-pointer"
                      >
                        Owner & Actions
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* ================= TAB 1: OVERVIEW ================= */}
                  <TabsContent value="overview" className="mt-0 space-y-4">
                    {/* Card 1: Listing Name, Business Type, Main Category, Subcategory */}
                    <div className="border rounded-xl p-4 bg-card shadow-xs space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              LISTING NAME
                            </span>
                            <p className="text-sm font-bold text-foreground">{selectedProfile.data.name}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              MAIN CATEGORY
                            </span>
                            <p className="text-sm font-semibold text-foreground">
                              {selectedProfile.data.category_name || "Uncategorized"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              {selectedProfile.type === "business" ? "BUSINESS TYPE" : "PROFESSIONAL TITLE"}
                            </span>
                            <p className="text-sm font-semibold text-foreground">
                              {selectedProfile.type === "business"
                                ? (selectedProfile.data as BusinessProfile).business_type || "Business"
                                : (selectedProfile.data as ProfessionalProfile).professional_title || (selectedProfile.data as ProfessionalProfile).profession_type || "Professional"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              SUBCATEGORY
                            </span>
                            <p className="text-sm font-semibold text-foreground">
                              {selectedProfile.type === "business"
                                ? (selectedProfile.data as BusinessProfile).subcategory_name || "None"
                                : (selectedProfile.data as ProfessionalProfile).subcategory_name || "None"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Associated Business Banner (for Professional Profiles) */}
                    {selectedProfile.type === "professional" && (selectedProfile.data as ProfessionalProfile).business_name && (
                      <div className="border border-rose-200 bg-rose-50/40 dark:bg-rose-950/20 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600">
                            <Building2 className="size-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Associated Business / Employer
                            </span>
                            <p className="text-xs font-bold text-foreground">
                              {(selectedProfile.data as ProfessionalProfile).business_name}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-700 bg-rose-50">
                          Staff Professional
                        </Badge>
                      </div>
                    )}

                    {/* Associated Professionals Banner (for Business Profiles) */}
                    {selectedProfile.type === "business" && (
                      <div className="border border-purple-200 bg-purple-50/40 dark:bg-purple-950/20 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600">
                            <Briefcase className="size-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Staff Professionals
                            </span>
                            <p className="text-xs font-bold text-foreground">
                              {(selectedProfile.data as BusinessProfile).professionals_count || 0} professionals under this business
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs font-semibold bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200"
                          onClick={() => {
                            const bizId = selectedProfile.data.id;
                            const bizCatId = (selectedProfile.data as any).category_id;
                            setSelectedProfile(null);
                            setCreateBusinessInitialData({
                              businessType: "Professional",
                              businessProfileId: bizId,
                              categoryId: bizCatId,
                            });
                            setCreateBusinessOpen(true);
                          }}
                        >
                          <Plus className="size-3 mr-1" /> Add Professional
                        </Button>
                      </div>
                    )}

                    {/* Optional Professional Introduction */}
                    {selectedProfile.type === "professional" && (selectedProfile.data as ProfessionalProfile).introduction && (
                      <div className="border rounded-xl p-4 bg-card shadow-xs space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                          INTRODUCTION
                        </span>
                        <p className="text-xs text-foreground italic leading-relaxed">
                          &quot;{(selectedProfile.data as ProfessionalProfile).introduction}&quot;
                        </p>
                      </div>
                    )}

                    {/* Card 2: Full Description */}
                    <div className="border rounded-xl p-4 bg-card shadow-xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        FULL DESCRIPTION
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {selectedProfile.data.about || "No detailed description provided."}
                      </p>
                    </div>

                    {/* Card 3: 4-Metric Footer Row (Exact Match from Screenshot) */}
                    <div className="border rounded-xl p-3 bg-muted/10 grid grid-cols-4 divide-x text-center shadow-xs">
                      <div className="px-2">
                        <div className="text-xl font-bold text-rose-600">
                          {selectedProfile.type === "business"
                            ? (selectedProfile.data as BusinessProfile).products_count || 0
                            : 0}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">Products</div>
                      </div>
                      <div className="px-2">
                        <div className="text-xl font-bold text-emerald-600">
                          {selectedProfile.type === "business"
                            ? (selectedProfile.data as BusinessProfile).services_count || 0
                            : (selectedProfile.data as ProfessionalProfile).services_count || 0}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">Services</div>
                      </div>
                      <div className="px-2">
                        <div className="text-xl font-bold text-amber-500">
                          ★ {selectedProfile.data.average_rating ? Number(selectedProfile.data.average_rating).toFixed(1) : "0.0"}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">Avg Rating</div>
                      </div>
                      <div className="px-2">
                        <div className="text-xl font-bold text-blue-600">
                          {selectedProfile.data.reviews_count || 0}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">Reviews</div>
                      </div>
                    </div>

                    
                  </TabsContent>

                  {/* ================= TAB 2: LOCATION & MAP ================= */}
                  <TabsContent value="location" className="mt-0 space-y-4">
                    <div className="border rounded-xl p-4 bg-card shadow-xs space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Address
                          </span>
                          <p className="text-foreground font-medium mt-0.5">{selectedProfile.data.address || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Locality / Area
                          </span>
                          <p className="text-foreground font-medium mt-0.5">{selectedProfile.data.locality || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            City
                          </span>
                          <p className="text-foreground font-medium mt-0.5">{selectedProfile.data.city || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            District / County
                          </span>
                          <p className="text-foreground font-medium mt-0.5">{selectedProfile.data.district || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            State
                          </span>
                          <p className="text-foreground font-medium mt-0.5">{selectedProfile.data.state || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Country & Postal Code
                          </span>
                          <p className="text-foreground font-medium mt-0.5">
                            {selectedProfile.data.country_code || "IN"} • {selectedProfile.data.postal_code || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    

                    <div className="border rounded-xl p-3 bg-muted/20 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Geographic Coordinates
                        </span>
                        <p className="font-mono text-xs text-foreground mt-0.5">
                          Lat: {selectedProfile.data.latitude ?? "Not set"} • Lng: {selectedProfile.data.longitude ?? "Not set"}
                        </p>
                      </div>
                      {selectedProfile.data.latitude && selectedProfile.data.longitude && (
                        <Button variant="outline" size="sm" asChild className="h-7 text-xs gap-1">
                          <a
                            href={`https://www.google.com/maps?q=${selectedProfile.data.latitude},${selectedProfile.data.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Compass className="size-3 text-red-600" /> View on Google Maps
                          </a>
                        </Button>
                      )}
                    </div>
                  </TabsContent>

                  {/* ================= TAB 3: CONTACT & SOCIAL ================= */}
                  <TabsContent value="contact" className="mt-0 space-y-4">
                    <div className="border rounded-xl p-4 bg-card shadow-xs space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Phone Number
                          </span>
                          <p className="text-foreground font-medium flex items-center gap-1.5 mt-0.5">
                            <Phone className="size-3 text-muted-foreground" />
                            {selectedProfile.data.phone || "Not configured"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            WhatsApp
                          </span>
                          <p className="text-foreground font-medium flex items-center gap-1.5 mt-0.5">
                            <MessageSquare className="size-3 text-emerald-600" />
                            {selectedProfile.data.whatsapp ? (
                              <a
                                href={`https://wa.me/${selectedProfile.data.whatsapp.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:underline"
                              >
                                {selectedProfile.data.whatsapp}
                              </a>
                            ) : "Not configured"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Email Address
                          </span>
                          <p className="text-foreground font-medium flex items-center gap-1.5 mt-0.5">
                            <Mail className="size-3 text-muted-foreground" />
                            {selectedProfile.data.email || "Not configured"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Official Website
                          </span>
                          <p className="text-foreground font-medium flex items-center gap-1.5 mt-0.5">
                            <Globe className="size-3 text-muted-foreground" />
                            {selectedProfile.data.website ? (
                              <a
                                href={selectedProfile.data.website.startsWith("http") ? selectedProfile.data.website : `https://${selectedProfile.data.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline"
                              >
                                {selectedProfile.data.website}
                              </a>
                            ) : "Not configured"}
                          </p>
                        </div>
                      </div>
                    </div>

                    

                    {/* Social media links */}
                    {selectedProfile.type === "business" && (selectedProfile.data as BusinessProfile).social_links && (
                      <div className="border rounded-xl p-3 bg-muted/20 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Social Media Profiles
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries((selectedProfile.data as BusinessProfile).social_links || {}).map(([platform, url]) => (
                            <Badge key={platform} variant="outline" className="bg-background gap-1 text-[11px]">
                              <Globe className="size-3" />
                              <span className="capitalize">{platform}:</span>
                              <a href={String(url)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                {String(url).replace(/^https?:\/\//, "").slice(0, 24)}...
                              </a>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* ================= TAB 4: BRANCHES & HOURS ================= */}
                  <TabsContent value="branches" className="mt-0 space-y-4">
                    {selectedProfile.type === "business" ? (
                      <div className="space-y-4">
                        <div className="border rounded-xl p-4 bg-card shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b pb-2">
                            <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                              <GitBranch className="size-4 text-indigo-600" />
                              Secondary Branches & Outlets
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {((selectedProfile.data as BusinessProfile).branches || []).length} Branches
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {((selectedProfile.data as BusinessProfile).branches || []).length === 0 ? (
                              <p className="text-muted-foreground text-xs py-3 text-center border rounded bg-muted/10">
                                No secondary branches configured. Only primary headquarters listed.
                              </p>
                            ) : (
                              ((selectedProfile.data as BusinessProfile).branches || []).map((b: any, bIdx: number) => (
                                <div key={bIdx} className="p-2.5 border rounded flex items-center justify-between bg-card text-xs">
                                  <div>
                                    <p className="font-semibold text-foreground">{b.name}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {b.city || "City N/A"} • {b.phone || "No phone"} • {b.address || "Address N/A"}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveBranch(bIdx)}
                                    className="h-6 px-2 text-rose-600 hover:bg-rose-50"
                                  >
                                    <Trash2 className="size-3 mr-1" /> Remove
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Add branch */}
                          <div className="p-3 border rounded-lg bg-muted/20 space-y-2">
                            <p className="text-[11px] font-semibold text-foreground">Add New Branch Outlet</p>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="Branch Name (e.g. South Campus)"
                                value={newBranch.name}
                                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                                className="h-7 text-xs"
                              />
                              <Input
                                placeholder="City"
                                value={newBranch.city}
                                onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
                                className="h-7 text-xs"
                              />
                              <Input
                                placeholder="Branch Phone"
                                value={newBranch.phone}
                                onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                                className="h-7 text-xs"
                              />
                              <Input
                                placeholder="Street Address"
                                value={newBranch.address}
                                onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                                className="h-7 text-xs"
                              />
                            </div>
                            <Button
                              size="sm"
                              disabled={addingBranch || !newBranch.name.trim()}
                              onClick={handleAddBranch}
                              className="h-7 text-xs gap-1 w-full"
                            >
                              <Plus className="size-3" /> Add Branch
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border rounded-xl p-4 bg-card shadow-xs space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Delivery Availability
                            </span>
                            <div className="flex gap-2 mt-1">
                              {(selectedProfile.data as ProfessionalProfile).remote_available && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                  Remote Services
                                </Badge>
                              )}
                              {(selectedProfile.data as ProfessionalProfile).onsite_available && (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                  On-site / In-person
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Experience
                            </span>
                            <p className="text-foreground font-semibold text-sm mt-0.5">
                              {(selectedProfile.data as ProfessionalProfile).experience_years || 0} Years Experience
                            </p>
                          </div>
                        </div>

                        {Array.isArray((selectedProfile.data as ProfessionalProfile).service_areas) && (
                          <div className="pt-2 border-t">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              Service Coverage Areas
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {((selectedProfile.data as ProfessionalProfile).service_areas || []).map((area, aIdx) => (
                                <Badge key={aIdx} variant="secondary" className="text-[10px]">
                                  {area}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* ================= TAB 5: OWNER & ACTIONS ================= */}
                  <TabsContent value="owner" className="mt-0 space-y-4">
                    <div className="border rounded-xl p-4 bg-card shadow-xs space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <User className="size-3.5 text-primary" /> Associated User Account (Owner Relationship)
                      </span>
                      <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Account Holder</span>
                          <p className="font-semibold text-foreground mt-0.5">{selectedProfile.data.owner_name || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Email Address</span>
                          <p className="font-medium text-foreground mt-0.5">{selectedProfile.data.owner_email || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">User ID</span>
                          <p className="font-mono text-foreground font-semibold mt-0.5">#{selectedProfile.data.owner_id || "N/A"}</p>
                        </div>
                      </div>
                    </div>

                    

                    <div className="border rounded-xl p-4 bg-muted/20 space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Platform Administrative Controls
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant={selectedProfile.data.is_verified ? "outline" : "default"}
                          onClick={() => handleAction(selectedProfile.type, selectedProfile.data.id, "verify", { isVerified: !selectedProfile.data.is_verified })}
                          className="h-8 text-xs font-semibold"
                        >
                          {selectedProfile.data.is_verified ? "Revoke Verification" : "Verify Profile"}
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedProfile.data.is_featured ? "secondary" : "outline"}
                          onClick={() => handleAction(selectedProfile.type, selectedProfile.data.id, "feature", { isFeatured: !selectedProfile.data.is_featured })}
                          className="h-8 text-xs font-semibold"
                        >
                          {selectedProfile.data.is_featured ? "Remove Featured" : "Mark as Featured"}
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedProfile.data.is_active ? "destructive" : "default"}
                          onClick={() => handleAction(selectedProfile.type, selectedProfile.data.id, "toggle_status", { isActive: !selectedProfile.data.is_active })}
                          className="h-8 text-xs font-semibold col-span-2"
                        >
                          {selectedProfile.data.is_active ? "Suspend Listing" : "Activate Listing"}
                        </Button>
                      </div>
                    </div>

                    

                    {/* Danger Zone: Permanent Deletion */}
                    <div className="border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 bg-rose-50/40 dark:bg-rose-950/20 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                        Danger Zone
                      </span>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground">Permanently delete this listing and decouple all associations.</p>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteConfirm({ type: selectedProfile.type, id: selectedProfile.data.id, name: selectedProfile.data.name })}
                          className="h-7 text-xs gap-1 font-semibold"
                        >
                          <Trash2 className="size-3" /> Delete Profile
                        </Button>
                      </div>
                    </div>

                    

                    <div className="text-[10px] text-muted-foreground flex justify-between px-1">
                      <span>Created: {new Date(selectedProfile.data.created_at).toLocaleString()}</span>
                      <span>Updated: {selectedProfile.data.updated_at ? new Date(selectedProfile.data.updated_at).toLocaleString() : "N/A"}</span>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Duplicate Detection & Safe Merge Dialog */}
      <Dialog open={duplicateModalOpen} onOpenChange={setDuplicateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <GitMerge className="size-4 text-amber-600" />
              Duplicate Listing Detection & Safe Consolidation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Listings sharing identical phone numbers or matching business name and city. Safely re-link products, services, reviews, and enquiries into the primary listing.
            </DialogDescription>
          </DialogHeader>

          {dupLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin mx-auto mb-2" />
              Scanning database for duplicates...
            </div>
          ) : duplicates.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="size-8 text-emerald-600 mx-auto" />
              <p className="text-xs font-semibold text-foreground">No duplicate business listings detected!</p>
              <p className="text-[11px] text-muted-foreground">All phone numbers and localized business titles are unique.</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2 text-xs">
              {duplicates.map((dup, idx) => (
                <div key={idx} className="p-3 border rounded-lg space-y-2 bg-muted/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-sm text-foreground">{dup.norm_name}</span>
                      <p className="text-muted-foreground text-[11px]">
                        City: {dup.norm_city || "Any"} • Phone: {dup.phone || "None"} • {dup.count} matching listings
                      </p>
                    </div>
                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                      {dup.count} Duplicates
                    </Badge>
                  </div>

                  <div className="divide-y border rounded bg-background p-2">
                    {dup.listing_ids.map((lid: number, lIdx: number) => (
                      <div key={lid} className="py-1.5 flex justify-between items-center">
                        <span className="font-medium">
                          #{lid} - {dup.listing_names[lIdx]} {lIdx === 0 ? "(Suggested Primary)" : "(Duplicate)"}
                        </span>
                        {lIdx > 0 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={merging}
                            onClick={() => mergeDuplicates(dup.listing_ids[0], lid)}
                            className="h-6 text-[11px] gap-1 text-primary hover:bg-primary/10"
                          >
                            <GitMerge className="size-3" />
                            Merge #{lid} into #{dup.listing_ids[0]}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-rose-600 flex items-center gap-2">
              <AlertTriangle className="size-5" /> Confirm Permanent Deletion
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to permanently delete <strong>{deleteConfirm?.name}</strong>?
              This action will safely remove the listing and unlink all associated products and services.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmDeleteProfile}>
              Yes, Delete Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Business Listing Dialog matching 5-tab design */}
      <CreateBusinessProfileDialog
        open={createBusinessOpen}
        onOpenChange={(op) => {
          setCreateBusinessOpen(op);
          if (!op) setCreateBusinessInitialData(null);
        }}
        initialData={createBusinessInitialData}
        onSuccess={() => loadProfiles()}
      />
    </div>
  );
}

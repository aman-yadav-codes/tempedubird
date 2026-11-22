"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
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
  Bed,
  Car,
  Utensils,
  Home,
  Tag,
  DollarSign,
  Info,
  Check,
  Edit2,
  ChevronDown,
  MoreHorizontal,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import Link from "next/link";
import { CreateBusinessProfileDialog } from "@/components/business/create-business-profile-dialog";

export type ListingVertical =
  | "business"
  | "professional"
  | "course"
  | "job"
  | "products"
  | "services"
  | "room"
  | "vehicle"
  | "dish"
  | "event"
  | "property";

export const getPublicUrl = (type: ListingVertical, item: any): string => {
  switch (type) {
    case "business":
      return item.slug ? `/institutes/${item.slug}` : `/institutes/${item.id}`;
    case "professional":
      return item.slug ? `/professionals/${item.slug}` : `/professionals/${item.id}`;
    case "course":
      return `/courses/${item.id}`;
    case "job":
      return `/jobs/${item.id}`;
    case "products":
      return `/products/${item.id}`;
    case "services":
      return `/services/${item.id}`;
    case "room":
    case "vehicle":
    case "dish":
    case "event":
    case "property":
      return item.slug
        ? `/explore?q=${encodeURIComponent(item.slug)}`
        : `/explore?type=${type}&q=${encodeURIComponent(item.name || item.title || "")}`;
    default:
      return `/explore?q=${encodeURIComponent(item.name || item.title || "")}`;
  }
};

interface TabMeta {
  id: ListingVertical;
  label: string;
  icon: any;
  color: string;
  badgeClass: string;
}

const TAB_CONFIG: TabMeta[] = [
  { id: "business", label: "Businesses", icon: Building2, color: "text-indigo-600", badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400" },
  { id: "professional", label: "Professionals", icon: User, color: "text-purple-600", badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400" },
  { id: "course", label: "Courses", icon: GraduationCap, color: "text-blue-600", badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" },
  { id: "job", label: "Jobs", icon: Briefcase, color: "text-amber-600", badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" },
  { id: "products", label: "Products", icon: Package, color: "text-emerald-600", badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" },
  { id: "services", label: "Services", icon: Layers, color: "text-teal-600", badgeClass: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400" },
  { id: "room", label: "Room & Stay", icon: Bed, color: "text-cyan-600", badgeClass: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400" },
  { id: "vehicle", label: "Vehicles", icon: Car, color: "text-rose-600", badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400" },
  { id: "dish", label: "Dishes", icon: Utensils, color: "text-orange-600", badgeClass: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400" },
  { id: "event", label: "Events", icon: Calendar, color: "text-pink-600", badgeClass: "bg-pink-50 text-pink-700 dark:bg-pink-950/50 dark:text-pink-400" },
  { id: "property", label: "Properties", icon: Home, color: "text-green-600", badgeClass: "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400" },
];

function PlatformListingsManagementPageContent() {
  const { accessToken } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlTab = (searchParams?.get("tab") || searchParams?.get("vertical") || searchParams?.get("type")) as ListingVertical | null;

  const [activeTab, setActiveTab] = useState<ListingVertical>(() => {
    if (urlTab && TAB_CONFIG.some((t) => t.id === urlTab)) {
      return urlTab;
    }
    return "business";
  });

  // Sync activeTab when URL tab parameter changes
  useEffect(() => {
    if (urlTab && TAB_CONFIG.some((t) => t.id === urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab, activeTab]);

  const handleTabChange = useCallback((newTab: ListingVertical) => {
    setActiveTab(newTab);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", newTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [pathname, router]);
  const [items, setItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<ListingVertical, number>>({
    business: 0,
    professional: 0,
    course: 0,
    job: 0,
    products: 0,
    services: 0,
    room: 0,
    vehicle: 0,
    dish: 0,
    event: 0,
    property: 0,
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Inspection Modal
  const [selectedProfile, setSelectedProfile] = useState<{
    type: ListingVertical;
    data: any;
  } | null>(null);

  // Edit Modal
  const [editingListing, setEditingListing] = useState<{
    type: ListingVertical;
    data: any;
  } | null>(null);

  // Deletion Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: ListingVertical;
    id: number;
    name: string;
  } | null>(null);

  // Business branch addition state inside inspect modal
  const [newBranch, setNewBranch] = useState({ name: "", city: "", phone: "", address: "" });
  const [addingBranch, setAddingBranch] = useState(false);

  // Duplicate detection
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [dupLoading, setDupLoading] = useState(false);
  const [merging, setMerging] = useState(false);

  // Create Business Dialog
  const [createBusinessOpen, setCreateBusinessOpen] = useState(false);
  const [createBusinessInitialData, setCreateBusinessInitialData] = useState<any>(null);

  // Load listings according to active tab and filters
  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/profiles", window.location.origin);
      url.searchParams.set("type", activeTab);
      if (searchQuery) url.searchParams.set("search", searchQuery);
      if (countryFilter !== "all") url.searchParams.set("country", countryFilter);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);

      const res = await fetch(url.toString(), {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load listings");

      setItems(data.data?.items || []);
      if (data.data?.counts) {
        setCounts(data.data.counts);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error loading listings");
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeTab, searchQuery, countryFilter, statusFilter]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  // Handle patch actions (feature, verify, toggle_status, approve, reject)
  const handleAction = async (
    type: ListingVertical,
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
      if (!res.ok) throw new Error(json.error || "Failed to update listing");
      toast.success(json.message || "Listing updated");
      loadListings();

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

  // Confirm delete
  const confirmDeleteListing = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(
        `/api/admin/profiles?type=${deleteConfirm.type}&id=${deleteConfirm.id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete listing");
      toast.success(json.message);
      setDeleteConfirm(null);
      if (selectedProfile?.data.id === deleteConfirm.id) setSelectedProfile(null);
      loadListings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Deletion failed");
    }
  };

  // Duplicate detection for businesses
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
        body: JSON.stringify({
          action: "merge_duplicates",
          primaryListingId: primaryId,
          duplicateListingId: duplicateId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to merge listings");
      toast.success(json.message);
      checkDuplicates();
      loadListings();
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
      const bProfile = selectedProfile.data;
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
      const bProfile = selectedProfile.data;
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

  const currentTabMeta = useMemo(
    () => TAB_CONFIG.find((t) => t.id === activeTab) || TAB_CONFIG[0],
    [activeTab]
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg bg-muted flex items-center justify-center`}>
              {(() => {
                const CurrentIcon = currentTabMeta.icon;
                return <CurrentIcon className={`size-5 ${currentTabMeta.color}`} />;
              })()}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{currentTabMeta.label}</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
              {counts[activeTab]?.toLocaleString() || items.length} Total
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Centralized platform directory: Manage, edit details, and activate or suspend {currentTabMeta.label.toLowerCase()} listings.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "business" && (
            <>
              <Button
                size="sm"
                onClick={() => setCreateBusinessOpen(true)}
                className="text-xs h-8 gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer"
              >
                <Plus className="size-3.5" />
                Add Business Listing
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={checkDuplicates}
                className="text-xs h-8 gap-1.5 border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer"
              >
                <GitMerge className="size-3.5" />
                Duplicate Detection
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadListings}
            disabled={loading}
            className="text-xs h-8 gap-1.5 cursor-pointer"
          >
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
              placeholder={`Search ${currentTabMeta.label.toLowerCase()} by name, city, contact, or ID...`}
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
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Suspended</SelectItem>
              <SelectItem value="featured">Featured Only</SelectItem>
              <SelectItem value="verified">Verified Only</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{items.length}</span> of{" "}
          <span className="font-semibold text-foreground">{counts[activeTab]?.toLocaleString() || 0}</span> {currentTabMeta.label.toLowerCase()}
        </div>
      </div>

      {/* Main Listings Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Listing Name & ID</TableHead>
                <TableHead className="text-xs">Business / Contact</TableHead>
                <TableHead className="text-xs">Price & Details</TableHead>
                <TableHead className="text-xs text-right">Admin Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-36 text-center text-xs text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading {currentTabMeta.label.toLowerCase()}...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-36 text-center text-xs text-muted-foreground">
                    <Info className="size-6 mx-auto mb-2 opacity-50" />
                    No {currentTabMeta.label.toLowerCase()} found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const Icon = currentTabMeta.icon;
                  const itemTitle = item.name || item.title || item.course_name || item.custom_name || item.custom_title || `Listing #${item.id}`;
                  const itemSubtitle = item.subtitle || (item.slug ? `/${item.slug}` : `ID #${item.id}`);
                  const categoryText = item.category_name || item.business_type || item.stream || item.department || "Standard";
                  const locationText = [item.city, item.state, item.country_code].filter(Boolean).join(", ") || "India";
                  const businessName = item.business_name || item.owner_name || "Platform Direct";
                  const contactText = item.phone || item.email || item.owner_phone || "—";
                  const publicUrl = getPublicUrl(activeTab, item);
                  
                  // Format price text
                  let priceText = "—";
                  if (item.price !== undefined && item.price !== null && item.price !== "") {
                    priceText = typeof item.price === "number" ? `₹${item.price.toLocaleString()}` : `${item.currency ? item.currency + ' ' : '₹'}${item.price}`;
                  } else if (item.fee_amount) {
                    priceText = `₹${Number(item.fee_amount).toLocaleString()}`;
                  } else if (item.salary_range) {
                    priceText = item.salary_range;
                  }

                  const isActive = item.is_active !== undefined && item.is_active !== null
                    ? Boolean(item.is_active)
                    : (["active", "published", "open"].includes(String(item.status || "").toLowerCase()));
                  const isVerified = Boolean(item.is_verified);
                  const isFeatured = Boolean(item.is_featured);

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                      {/* Name & ID - on click open new page show detail of listing */}
                      <TableCell className="font-medium text-xs">
                        <div className="flex items-center gap-2.5">
                          {item.image_url || item.logo_url || item.avatar_url || item.featured_image ? (
                            <img
                              src={item.image_url || item.logo_url || item.avatar_url || item.featured_image}
                              alt={itemTitle}
                              className="size-8 rounded-lg object-cover border shrink-0"
                            />
                          ) : (
                            <div className={`size-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${currentTabMeta.badgeClass}`}>
                              <Icon className="size-4" />
                            </div>
                          )}
                          <div className="max-w-[280px]">
                            <a
                              href={publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`font-bold truncate block cursor-pointer transition-colors hover:underline ${
                                isActive ? "!text-emerald-600 dark:!text-emerald-400 hover:!text-emerald-700" : "!text-rose-600 dark:!text-rose-400 hover:!text-rose-700"
                              }`}
                              title={`${itemTitle} (Click to open listing details in new tab)`}
                            >
                              {itemTitle}
                            </a>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-muted-foreground truncate">
                                #{item.id} • {categoryText}
                              </span>
                              {isActive ? (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[9px] py-0 px-1">
                                  Suspended
                                </Badge>
                              )}
                              {isFeatured && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 bg-amber-50 text-amber-700 border-amber-200">
                                  Featured
                                </Badge>
                              )}
                              {isVerified && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 bg-blue-50 text-blue-700 border-blue-200">
                                  Verified
                                </Badge>
                              )}
                              {item.verification_status === "pending" && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 bg-amber-50 text-amber-700 border-amber-200">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Business & Contact */}
                      <TableCell className="text-xs space-y-0.5">
                        <p className="font-medium text-foreground truncate max-w-[170px]" title={businessName}>
                          {businessName}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Phone className="size-2.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{contactText}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-2.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{locationText}</span>
                        </p>
                      </TableCell>

                      {/* Price & Details */}
                      <TableCell className="text-xs space-y-0.5">
                        <p className="font-semibold text-foreground">{priceText}</p>
                        {item.stock !== undefined ? (
                          <span className="text-[10px] text-muted-foreground">Stock: {item.stock}</span>
                        ) : item.duration ? (
                          <span className="text-[10px] text-muted-foreground">Duration: {item.duration}</span>
                        ) : item.products_count !== undefined ? (
                          <span className="text-[10px] text-muted-foreground">{item.products_count} products • {item.services_count || 0} services</span>
                        ) : item.max_adults ? (
                          <span className="text-[10px] text-muted-foreground">Max {item.max_adults} adults</span>
                        ) : item.openings_count ? (
                          <span className="text-[10px] text-muted-foreground">{item.openings_count} openings</span>
                        ) : null}
                      </TableCell>

                      {/* Admin Actions - Dropdown with everything from Image 2 */}
                      <TableCell className="text-xs text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs gap-1 cursor-pointer font-medium hover:bg-muted"
                            >
                              <span>Actions</span>
                              <ChevronDown className="size-3 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 text-xs">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                              Listing Actions
                            </DropdownMenuLabel>

                            <DropdownMenuItem
                              onClick={() => window.open(publicUrl, "_blank")}
                              className="cursor-pointer text-xs"
                            >
                              <ExternalLink className="size-3.5 mr-2 text-muted-foreground" /> View Public Page
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => setEditingListing({ type: activeTab, data: item })}
                              className="cursor-pointer text-xs"
                            >
                              <Edit2 className="size-3.5 mr-2 text-muted-foreground" /> Edit Details
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => setSelectedProfile({ type: activeTab, data: item })}
                              className="cursor-pointer text-xs"
                            >
                              <Eye className="size-3.5 mr-2 text-muted-foreground" /> Inspect Listing
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Status Toggle */}
                            <DropdownMenuItem
                              onClick={() =>
                                handleAction(activeTab, item.id, "toggle_status", {
                                  isActive: !isActive,
                                })
                              }
                              className={`cursor-pointer text-xs ${
                                isActive ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400 font-medium"
                              }`}
                            >
                              {isActive ? (
                                <>
                                  <XCircle className="size-3.5 mr-2" /> Suspend Listing
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="size-3.5 mr-2" /> Activate Listing
                                </>
                              )}
                            </DropdownMenuItem>

                            {/* Featured Toggle */}
                            {(activeTab === "business" || activeTab === "professional" || ["room", "vehicle", "dish", "event", "property"].includes(activeTab)) && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleAction(activeTab, item.id, "feature", {
                                    isFeatured: !isFeatured,
                                  })
                                }
                                className="cursor-pointer text-xs"
                              >
                                <Sparkles className={`size-3.5 mr-2 ${isFeatured ? "text-muted-foreground" : "text-amber-500"}`} />
                                {isFeatured ? "Remove Featured" : "Mark as Featured"}
                              </DropdownMenuItem>
                            )}

                            {/* Approval / Verification */}
                            {item.verification_status === "pending" ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleAction(activeTab, item.id, "approve")}
                                  className="cursor-pointer text-xs text-emerald-600 font-semibold"
                                >
                                  <CheckCircle2 className="size-3.5 mr-2" /> Approve Listing
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAction(activeTab, item.id, "reject")}
                                  className="cursor-pointer text-xs text-rose-600 font-semibold"
                                >
                                  <XCircle className="size-3.5 mr-2" /> Reject Listing
                                </DropdownMenuItem>
                              </>
                            ) : (activeTab === "business" || activeTab === "professional") ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleAction(activeTab, item.id, "verify", {
                                    isVerified: !isVerified,
                                  })
                                }
                                className="cursor-pointer text-xs"
                              >
                                <ShieldCheck className={`size-3.5 mr-2 ${isVerified ? "text-muted-foreground" : "text-blue-500"}`} />
                                {isVerified ? "Remove Verification" : "Mark Verified"}
                              </DropdownMenuItem>
                            ) : null}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() =>
                                setDeleteConfirm({
                                  type: activeTab,
                                  id: item.id,
                                  name: itemTitle,
                                })
                              }
                              className="cursor-pointer text-xs text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/30 font-medium"
                            >
                              <Trash2 className="size-3.5 mr-2" /> Delete Permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* INSPECT MODAL */}
      <Dialog
        open={selectedProfile !== null}
        onOpenChange={(open) => !open && setSelectedProfile(null)}
      >
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-border/80 shadow-2xl">
          {selectedProfile && (
            <>
              {/* Header */}
              <div className="p-5 border-b flex items-start justify-between bg-card">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-11 items-center justify-center rounded-xl border shadow-xs ${
                      selectedProfile.type === "business"
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200/50"
                        : "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200/50"
                    }`}
                  >
                    {selectedProfile.type === "business" ? (
                      <Building2 className="size-6" />
                    ) : selectedProfile.type === "professional" ? (
                      <User className="size-6" />
                    ) : selectedProfile.type === "course" ? (
                      <GraduationCap className="size-6" />
                    ) : selectedProfile.type === "job" ? (
                      <Briefcase className="size-6" />
                    ) : selectedProfile.type === "products" ? (
                      <Package className="size-6" />
                    ) : selectedProfile.type === "services" ? (
                      <Layers className="size-6" />
                    ) : selectedProfile.type === "room" ? (
                      <Bed className="size-6" />
                    ) : selectedProfile.type === "vehicle" ? (
                      <Car className="size-6" />
                    ) : selectedProfile.type === "dish" ? (
                      <Utensils className="size-6" />
                    ) : selectedProfile.type === "event" ? (
                      <Calendar className="size-6" />
                    ) : (
                      <Home className="size-6" />
                    )}
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <span>{selectedProfile.data.name || selectedProfile.data.title}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        (ID #{selectedProfile.data.id})
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {selectedProfile.type} Listing Details & Controls
                    </DialogDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2 mr-6">
                  {selectedProfile.type === "business" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 font-semibold border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
                      onClick={() => {
                        const b = selectedProfile.data;
                        window.open(b.slug ? `/institutes/${b.slug}` : `/institutes/${b.id}`, "_blank");
                      }}
                    >
                      <ExternalLink className="size-3" /> View Page
                    </Button>
                  )}
                  <Badge
                    variant="outline"
                    className={
                      selectedProfile.data.is_active ?? selectedProfile.data.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                        : "bg-rose-50 text-rose-700 border-rose-200 text-[10px]"
                    }
                  >
                    {selectedProfile.data.is_active ?? selectedProfile.data.status === "active" ? "Active" : "Suspended"}
                  </Badge>
                </div>
              </div>

              {/* Business / Professional Multi-tab inspector */}
              {selectedProfile.type === "business" || selectedProfile.type === "professional" ? (
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
                          Location
                        </TabsTrigger>
                        <TabsTrigger
                          value="contact"
                          className="rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold text-xs py-2 transition-all shadow-none cursor-pointer"
                        >
                          Contact
                        </TabsTrigger>
                        <TabsTrigger
                          value="branches"
                          className="rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold text-xs py-2 transition-all shadow-none cursor-pointer"
                        >
                          {selectedProfile.type === "business" ? "Branches" : "Skills"}
                        </TabsTrigger>
                        <TabsTrigger
                          value="owner"
                          className="rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold text-xs py-2 transition-all shadow-none cursor-pointer"
                        >
                          Controls
                        </TabsTrigger>
                      </TabsList>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* OVERVIEW */}
                    <TabsContent value="overview" className="mt-0 space-y-4">
                      <div className="border rounded-xl p-4 bg-card shadow-xs space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Listing Name</span>
                            <p className="font-semibold text-foreground text-sm mt-0.5">{selectedProfile.data.name}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Slug</span>
                            <p className="font-mono text-muted-foreground text-xs mt-0.5">/{selectedProfile.data.slug}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Category</span>
                            <p className="font-medium text-foreground text-xs mt-0.5">{selectedProfile.data.category_name || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Subcategory</span>
                            <p className="font-medium text-foreground text-xs mt-0.5">{selectedProfile.data.subcategory_name || "N/A"}</p>
                          </div>
                        </div>

                        {selectedProfile.data.about && (
                          <div className="pt-2 border-t">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">About / Description</span>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{selectedProfile.data.about}</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* LOCATION */}
                    <TabsContent value="location" className="mt-0 space-y-4">
                      <div className="border rounded-xl p-4 bg-card shadow-xs space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">City</span>
                            <p className="font-medium mt-0.5">{selectedProfile.data.city || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">State</span>
                            <p className="font-medium mt-0.5">{selectedProfile.data.state || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Country</span>
                            <p className="font-medium mt-0.5">{selectedProfile.data.country_code || "IN"}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Postal Code</span>
                            <p className="font-medium mt-0.5">{selectedProfile.data.postal_code || "N/A"}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Complete Address</span>
                            <p className="font-medium mt-0.5">{selectedProfile.data.address || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* CONTACT */}
                    <TabsContent value="contact" className="mt-0 space-y-4">
                      <div className="border rounded-xl p-4 bg-card shadow-xs space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Phone</span>
                            <p className="font-medium mt-0.5">{selectedProfile.data.phone || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Email</span>
                            <p className="font-medium mt-0.5">{selectedProfile.data.email || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">WhatsApp</span>
                            <p className="font-medium mt-0.5">{selectedProfile.data.whatsapp || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Website</span>
                            <p className="font-medium mt-0.5">{selectedProfile.data.website || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* BRANCHES / SKILLS */}
                    <TabsContent value="branches" className="mt-0 space-y-4">
                      {selectedProfile.type === "business" ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase text-muted-foreground">Branches</span>
                          </div>
                          {Array.isArray(selectedProfile.data.branches) && selectedProfile.data.branches.length > 0 ? (
                            <div className="space-y-2">
                              {selectedProfile.data.branches.map((b: any, idx: number) => (
                                <div key={idx} className="p-3 border rounded-lg bg-card text-xs flex justify-between items-center">
                                  <div>
                                    <p className="font-semibold text-foreground">{b.name}</p>
                                    <p className="text-[11px] text-muted-foreground">{b.city} • {b.phone}</p>
                                    {b.address && <p className="text-[10px] text-muted-foreground">{b.address}</p>}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveBranch(idx)}
                                    className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700"
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No branches added yet.</p>
                          )}

                          <div className="border-t pt-3 space-y-2">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Add New Branch</span>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="Branch Name"
                                value={newBranch.name}
                                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                                className="h-8 text-xs"
                              />
                              <Input
                                placeholder="City"
                                value={newBranch.city}
                                onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
                                className="h-8 text-xs"
                              />
                              <Input
                                placeholder="Phone"
                                value={newBranch.phone}
                                onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                                className="h-8 text-xs"
                              />
                              <Input
                                placeholder="Address"
                                value={newBranch.address}
                                onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                                className="h-8 text-xs"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={handleAddBranch}
                              disabled={addingBranch}
                              className="h-7 text-xs w-full bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                            >
                              Add Branch
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 text-xs">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">Skills & Qualifications</span>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(selectedProfile.data.skills) ? (
                              selectedProfile.data.skills.map((s: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-[11px]">{s}</Badge>
                              ))
                            ) : (
                              <p className="text-muted-foreground">No specific skills listed.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    {/* CONTROLS */}
                    <TabsContent value="owner" className="mt-0 space-y-4">
                      <div className="border rounded-xl p-4 bg-muted/20 space-y-3">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                          Administrative Controls
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant={selectedProfile.data.is_verified ? "outline" : "default"}
                            onClick={() =>
                              handleAction(selectedProfile.type, selectedProfile.data.id, "verify", {
                                isVerified: !selectedProfile.data.is_verified,
                              })
                            }
                            className="h-8 text-xs font-semibold cursor-pointer"
                          >
                            {selectedProfile.data.is_verified ? "Revoke Verification" : "Verify Profile"}
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedProfile.data.is_featured ? "secondary" : "outline"}
                            onClick={() =>
                              handleAction(selectedProfile.type, selectedProfile.data.id, "feature", {
                                isFeatured: !selectedProfile.data.is_featured,
                              })
                            }
                            className="h-8 text-xs font-semibold cursor-pointer"
                          >
                            {selectedProfile.data.is_featured ? "Remove Featured" : "Mark as Featured"}
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedProfile.data.is_active ? "destructive" : "default"}
                            onClick={() =>
                              handleAction(selectedProfile.type, selectedProfile.data.id, "toggle_status", {
                                isActive: !selectedProfile.data.is_active,
                              })
                            }
                            className="h-8 text-xs font-semibold col-span-2 cursor-pointer"
                          >
                            {selectedProfile.data.is_active ? "Suspend Listing" : "Activate Listing"}
                          </Button>
                        </div>
                      </div>

                      <div className="border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 bg-rose-50/40 dark:bg-rose-950/20 space-y-2">
                        <span className="text-[10px] font-bold uppercase text-rose-600 block">Danger Zone</span>
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-muted-foreground">Permanently delete this listing record.</p>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              setDeleteConfirm({
                                type: selectedProfile.type,
                                id: selectedProfile.data.id,
                                name: selectedProfile.data.name,
                              })
                            }
                            className="h-7 text-xs gap-1 font-semibold cursor-pointer"
                          >
                            <Trash2 className="size-3" /> Delete Record
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              ) : (
                /* VERTICAL SPECIFIC INSPECTOR FOR COURSE, JOB, PRODUCT, SERVICE, ROOM, VEHICLE, DISH, EVENT, PROPERTY */
                <div className="p-5 space-y-4">
                  {/* Featured Image Banner */}
                  {(selectedProfile.data.image_url || selectedProfile.data.featured_image) && (
                    <div className="w-full h-44 rounded-xl overflow-hidden border">
                      <img
                        src={selectedProfile.data.image_url || selectedProfile.data.featured_image}
                        alt={selectedProfile.data.name || selectedProfile.data.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Key Info Grid */}
                  <div className="border rounded-xl p-4 bg-card shadow-xs space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Listing Name</span>
                        <p className="font-semibold text-foreground text-sm mt-0.5">
                          {selectedProfile.data.name || selectedProfile.data.title}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Business / Institution</span>
                        <p className="font-medium text-foreground text-xs mt-0.5">
                          {selectedProfile.data.business_name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Category</span>
                        <p className="font-medium text-foreground text-xs mt-0.5">
                          {selectedProfile.data.category_name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Subcategory / Details</span>
                        <p className="font-medium text-foreground text-xs mt-0.5">
                          {selectedProfile.data.subcategory_name || selectedProfile.data.subtitle || "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Pricing / Commercials</span>
                        <p className="font-semibold text-emerald-600 text-sm mt-0.5">
                          {selectedProfile.data.price ? `₹${selectedProfile.data.price}` : selectedProfile.data.fee_amount ? `₹${selectedProfile.data.fee_amount}` : selectedProfile.data.salary_range || "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Location</span>
                        <p className="font-medium text-foreground text-xs mt-0.5">
                          {[selectedProfile.data.city, selectedProfile.data.phone].filter(Boolean).join(" • ") || "India"}
                        </p>
                      </div>
                    </div>

                    {selectedProfile.data.description && (
                      <div className="pt-2 border-t">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Description</span>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {selectedProfile.data.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Metadata / JSON Specs */}
                  {selectedProfile.data.metadata && typeof selectedProfile.data.metadata === "object" && (
                    <div className="border rounded-xl p-4 bg-muted/20 space-y-2">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                        Specifications & Master Attributes
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(selectedProfile.data.metadata).map(([k, v]) => (
                          <div key={k} className="p-2 border rounded bg-card">
                            <span className="text-[10px] text-muted-foreground uppercase block font-semibold">{k.replace(/_/g, " ")}</span>
                            <span className="font-medium text-foreground">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="border rounded-xl p-4 bg-muted/20 space-y-3">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Administrative Actions
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const toEdit = { type: selectedProfile.type, data: selectedProfile.data };
                          setSelectedProfile(null);
                          setEditingListing(toEdit);
                        }}
                        className="h-8 text-xs font-semibold col-span-2 cursor-pointer bg-background hover:bg-muted"
                      >
                        <Edit2 className="size-3 mr-1" /> Edit Listing Details
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedProfile.data.is_featured ? "secondary" : "outline"}
                        onClick={() =>
                          handleAction(selectedProfile.type, selectedProfile.data.id, "feature", {
                            isFeatured: !selectedProfile.data.is_featured,
                          })
                        }
                        className="h-8 text-xs font-semibold cursor-pointer"
                      >
                        {selectedProfile.data.is_featured ? "Remove Featured" : "Mark as Featured"}
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedProfile.data.is_active ? "destructive" : "default"}
                        onClick={() =>
                          handleAction(selectedProfile.type, selectedProfile.data.id, "toggle_status", {
                            isActive: !selectedProfile.data.is_active,
                          })
                        }
                        className="h-8 text-xs font-semibold cursor-pointer"
                      >
                        {selectedProfile.data.is_active ? "Suspend Listing" : "Activate Listing"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setDeleteConfirm({
                            type: selectedProfile.type,
                            id: selectedProfile.data.id,
                            name: selectedProfile.data.name || selectedProfile.data.title,
                          })
                        }
                        className="h-8 text-xs font-semibold col-span-2 cursor-pointer"
                      >
                        <Trash2 className="size-3 mr-1" /> Delete Listing Permanently
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Duplicate Detection Dialog */}
      <Dialog open={duplicateModalOpen} onOpenChange={setDuplicateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <GitMerge className="size-4 text-amber-600" />
              Duplicate Listing Detection & Safe Consolidation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Listings sharing identical phone numbers or matching business name and city. Safely re-link records into the primary listing.
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
                            className="h-6 text-[11px] gap-1 text-primary hover:bg-primary/10 cursor-pointer"
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
              This action will remove the listing and unlink all associated records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmDeleteListing}>
              Yes, Delete Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Business Listing Dialog */}
      <CreateBusinessProfileDialog
        open={createBusinessOpen}
        onOpenChange={(op) => {
          setCreateBusinessOpen(op);
          if (!op) setCreateBusinessInitialData(null);
        }}
        initialData={createBusinessInitialData}
        onSuccess={() => loadListings()}
      />

      {/* Edit Listing Dialog for all 11 verticals */}
      <EditListingDialog
        editingListing={editingListing}
        onClose={() => setEditingListing(null)}
        onSave={async (type, id, data) => {
          await handleAction(type, id, "edit", { data });
        }}
      />
    </div>
  );
}

interface EditListingDialogProps {
  editingListing: { type: ListingVertical; data: any } | null;
  onClose: () => void;
  onSave: (type: ListingVertical, id: number, payload: Record<string, any>) => Promise<void>;
}

function EditListingDialog({ editingListing, onClose, onSave }: EditListingDialogProps) {
  const item = editingListing?.data;
  const type = editingListing?.type;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    subcategory: "",
    city: "",
    phone: "",
    price: "",
    extra: "",
    isActive: true,
    isFeatured: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item && type) {
      const name = item.name || item.title || item.course_name || item.custom_name || item.custom_title || "";
      const description = item.description || item.about || item.custom_description || "";
      const category = item.category_name || item.stream || item.department || "";
      const subcategory = item.subcategory_name || item.board_or_university || item.employment_type || item.subtitle || "";
      const city = item.city || item.location || "";
      const phone = item.phone || "";
      const price = item.price !== undefined && item.price !== null ? String(item.price) : item.fee_amount !== undefined && item.fee_amount !== null ? String(item.fee_amount) : item.salary_range || "";
      const extra = (
        item.stock !== undefined ? String(item.stock) :
        item.duration ? String(item.duration) :
        item.openings_count ? String(item.openings_count) :
        item.experience_years ? String(item.experience_years) : ""
      );
      const isActive = item.is_active !== undefined ? Boolean(item.is_active) : true;
      const isFeatured = Boolean(item.is_featured);

      setFormData({
        name,
        description,
        category,
        subcategory,
        city,
        phone,
        price,
        extra,
        isActive,
        isFeatured,
      });
    }
  }, [item, type]);

  if (!editingListing || !item || !type) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: formData.name,
        title: formData.name,
        description: formData.description,
        about: formData.description,
        city: formData.city,
        location: formData.city,
        phone: formData.phone,
        price: formData.price,
        fee_amount: formData.price,
        salary_range: formData.price,
        category_name: formData.category,
        stream: formData.category,
        department: formData.category,
        subcategory_name: formData.subcategory,
        board_or_university: formData.subcategory,
        employment_type: formData.subcategory,
        is_active: formData.isActive,
        is_featured: formData.isFeatured,
      };

      if (type === "products") {
        payload.stock = Number(formData.extra) || 0;
        payload.inventory_count = Number(formData.extra) || 0;
      } else if (type === "services") {
        payload.duration = Number(formData.extra) || 60;
        payload.duration_minutes = Number(formData.extra) || 60;
      } else if (type === "course") {
        payload.duration = formData.extra;
      } else if (type === "job") {
        payload.openings_count = Number(formData.extra) || 1;
      } else if (type === "professional") {
        payload.experience_years = Number(formData.extra) || 0;
      }

      await onSave(type, item.id, payload);
      onClose();
    } catch {
      // Handled in onSave
    } finally {
      setSaving(false);
    }
  };

  const getExtraLabel = () => {
    switch (type) {
      case "products": return "Inventory Stock Count";
      case "services": return "Duration (Minutes)";
      case "course": return "Duration (e.g. 6 Months, 2 Years)";
      case "job": return "Openings Count";
      case "professional": return "Experience (Years)";
      default: return null;
    }
  };

  const extraLabel = getExtraLabel();
  const supportsFeatured = ["business", "professional", "room", "vehicle", "dish", "event", "property"].includes(type);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleFormSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize text-xs font-semibold">
                {type}
              </Badge>
              <DialogTitle className="text-lg font-bold">Edit Listing Details</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify listing information, pricing, location, and visibility settings.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">Listing Title / Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-9 text-xs"
                placeholder="Listing title or business name"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category / Stream / Department</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="h-9 text-xs"
                placeholder="e.g. Retail, Medical, IT"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subcategory / Specialization</Label>
              <Input
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                className="h-9 text-xs"
                placeholder="e.g. Full-time, CBSE, Luxury"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">City / Location</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="h-9 text-xs"
                placeholder="City name, e.g. Varanasi"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contact Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-9 text-xs"
                placeholder="Primary phone number"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Price / Fee / Salary Range</Label>
              <Input
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="h-9 text-xs"
                placeholder="e.g. 500 or 15000-25000"
              />
            </div>

            {extraLabel && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{extraLabel}</Label>
                <Input
                  value={formData.extra}
                  onChange={(e) => setFormData({ ...formData, extra: e.target.value })}
                  className="h-9 text-xs"
                  placeholder={extraLabel}
                />
              </div>
            )}

            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">Description / About</Label>
              <Textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="text-xs"
                placeholder="Comprehensive description or overview of this listing"
              />
            </div>

            {/* Visibility & Status toggles */}
            <div className="sm:col-span-2 border rounded-lg p-3 bg-muted/30 space-y-3">
              <h4 className="text-xs font-semibold text-foreground">Status & Frontend Visibility</h4>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-xs text-foreground">Listing Active</p>
                  <p className="text-[11px] text-muted-foreground">
                    When active, this listing appears across public search, explore, and category feeds. Suspended listings are hidden from frontend users.
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              {supportsFeatured && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="font-medium text-xs text-foreground">Featured Listing</p>
                    <p className="text-[11px] text-muted-foreground">
                      Featured listings receive badge highlights and top placement in search results.
                    </p>
                  </div>
                  <Switch
                    checked={formData.isFeatured}
                    onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
              {saving ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


export default function PlatformListingsManagementPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    }>
      <PlatformListingsManagementPageContent />
    </Suspense>
  );
}

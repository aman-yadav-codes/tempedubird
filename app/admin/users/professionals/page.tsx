"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Briefcase,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  MessageSquare,
  RefreshCw,
  Loader2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Award,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuthStore } from "@/store";

type Professional = {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  professional_title: string | null;
  profession_type: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  country_code: string | null;
  experience_years: number | null;
  is_active: boolean;
  is_verified: boolean;
  verification_status: string;
  remote_available: boolean;
  onsite_available: boolean;
  created_at: string;
  owner_name: string | null;
  services_count: number;
  reviews_count: number;
  average_rating: number;
  enquiries_count: number;
};

type ProfessionalDetail = Professional & {
  about: string | null;
  qualifications: any;
  certifications: any;
  portfolio_images: string[];
  service_areas: string[];
  working_hours: any;
  services: any[];
  reviews: any[];
  enquiries: any[];
};

export default function ProfessionalProviderManagementPage() {
  const { accessToken } = useAuthStore();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Inspection Modal
  const [selectedProId, setSelectedProId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [proDetail, setProDetail] = useState<ProfessionalDetail | null>(null);

  const fetchProfessionals = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/professionals", window.location.origin);
      if (search) url.searchParams.set("search", search);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      const res = await fetch(url.toString(), {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load professionals");
      setProfessionals(json.professionals || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error loading professionals");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, accessToken]);

  useEffect(() => {
    fetchProfessionals();
  }, [fetchProfessionals]);

  const openProfessionalDetail = async (id: number) => {
    setSelectedProId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/professionals?id=${id}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load details");
      setProDetail(json.professional);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error loading details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAction = async (id: number, action: string, payload: Record<string, any> = {}) => {
    try {
      const res = await fetch("/api/admin/professionals", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ professionalId: id, action, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      toast.success(json.message || "Updated successfully");
      fetchProfessionals();
      if (selectedProId === id) {
        openProfessionalDetail(id);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Professional Provider Management</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Module 5
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Audit individual practitioners, consultants, lawyers, doctors, and freelancers independent of business listings.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchProfessionals} disabled={loading} className="text-xs h-8 gap-1.5">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, title, profession, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex gap-1 bg-muted p-1 rounded-md text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              statusFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
            }`}
          >
            All ({professionals.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              statusFilter === "pending" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
            }`}
          >
            Pending Review
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("verified")}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              statusFilter === "verified" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
            }`}
          >
            Verified Only
          </button>
        </div>
      </div>

      {/* Professionals Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Professional Name</TableHead>
                <TableHead className="text-xs">Title & Field</TableHead>
                <TableHead className="text-xs">Location & Service</TableHead>
                <TableHead className="text-xs">Experience</TableHead>
                <TableHead className="text-xs">Rating & Enquiries</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Verification & Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                    Loading professional providers...
                  </TableCell>
                </TableRow>
              ) : professionals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    No professionals found.
                  </TableCell>
                </TableRow>
              ) : (
                professionals.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-xs">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-full bg-purple-500/10 text-purple-600 font-bold flex items-center justify-center text-xs">
                          {p.name?.charAt(0) || "P"}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{p.name}</p>
                          <span className="text-[10px] text-muted-foreground">Pro #{p.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs space-y-0.5">
                      <p className="font-medium text-foreground">{p.professional_title || p.profession_type || "Practitioner"}</p>
                      <p className="text-[11px] text-muted-foreground">{p.services_count} active services</p>
                    </TableCell>
                    <TableCell className="text-xs space-y-0.5">
                      <p className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3 text-muted-foreground" />
                        {p.city || "Remote"}, {p.country_code || "IN"}
                      </p>
                      <div className="flex gap-1 text-[10px] text-muted-foreground">
                        {p.remote_available && <Badge variant="outline" className="text-[9px] px-1 py-0">Remote</Badge>}
                        {p.onsite_available && <Badge variant="outline" className="text-[9px] px-1 py-0">On-site</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.experience_years ? `${p.experience_years} yrs exp` : "Not specified"}
                    </TableCell>
                    <TableCell className="text-xs space-y-0.5">
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-[11px]">
                        <Star className="size-3 fill-amber-500" /> {p.average_rating} ({p.reviews_count})
                      </div>
                      <p className="text-[11px] text-sky-600 font-medium">
                        <MessageSquare className="size-3 inline mr-0.5" /> {p.enquiries_count} enquiries
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="space-y-1">
                        {p.is_verified ? (
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                            Verified Badge
                          </Badge>
                        ) : p.verification_status === "pending" ? (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            Pending Review
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            {p.verification_status || "Unverified"}
                          </Badge>
                        )}
                        {!p.is_active && (
                          <Badge variant="destructive" className="text-[10px] block w-fit">
                            Suspended
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openProfessionalDetail(p.id)}
                        className="h-7 text-xs"
                      >
                        Inspect
                      </Button>
                      {p.verification_status === "pending" ? (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleAction(p.id, "approve")}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleAction(p.id, "reject")}
                            className="h-7 text-xs"
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant={p.is_active ? "destructive" : "secondary"}
                          size="sm"
                          onClick={() => handleAction(p.id, "toggle_status", { isActive: !p.is_active })}
                          className="h-7 text-xs"
                        >
                          {p.is_active ? "Suspend" : "Activate"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Professional Detail Modal */}
      <Dialog open={selectedProId !== null} onOpenChange={(open) => !open && setSelectedProId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Briefcase className="size-4 text-purple-600" />
              Professional Portfolio & Verification
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review qualifications, licensing certificates, pricing, work samples, and customer reviews.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !proDetail ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin mx-auto mb-2" />
              Loading professional profile...
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Profile Card */}
              <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{proDetail.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {proDetail.professional_title || proDetail.profession_type} • {proDetail.experience_years || 0} years experience
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {proDetail.email} • {proDetail.phone || "No phone"} • {proDetail.city}, {proDetail.country_code}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  {proDetail.is_verified ? (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      Verified Identity
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {proDetail.verification_status || "Unverified"}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Bar in Dialog */}
              <div className="flex items-center justify-between border rounded-md p-2 bg-background text-xs">
                <span className="font-semibold text-muted-foreground">Admin Decision:</span>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant={proDetail.is_verified ? "outline" : "default"}
                    onClick={() => handleAction(proDetail.id, "verify", { isVerified: !proDetail.is_verified })}
                    className="h-7 text-xs"
                  >
                    {proDetail.is_verified ? "Revoke Verification" : "Grant Verified Badge"}
                  </Button>
                  <Button
                    size="sm"
                    variant={proDetail.is_active ? "destructive" : "secondary"}
                    onClick={() => handleAction(proDetail.id, "toggle_status", { isActive: !proDetail.is_active })}
                    className="h-7 text-xs"
                  >
                    {proDetail.is_active ? "Suspend Profile" : "Activate Profile"}
                  </Button>
                </div>
              </div>

              {/* Detail Tabs */}
              <Tabs defaultValue="services" className="w-full">
                <TabsList className="grid grid-cols-4 w-full h-8 text-xs">
                  <TabsTrigger value="services" className="text-xs">
                    Services ({proDetail.services?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="qualifications" className="text-xs">
                    Qualifications & Lic.
                  </TabsTrigger>
                  <TabsTrigger value="portfolio" className="text-xs">
                    Portfolio
                  </TabsTrigger>
                  <TabsTrigger value="reviews" className="text-xs">
                    Reviews ({proDetail.reviews?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* Services Tab */}
                <TabsContent value="services" className="pt-2">
                  <div className="space-y-2 max-h-56 overflow-y-auto text-xs">
                    {proDetail.services?.length ? (
                      proDetail.services.map((s) => (
                        <div key={s.id} className="p-2 border rounded flex justify-between items-center">
                          <div>
                            <span className="font-semibold">{s.custom_name || s.master_service_name}</span>
                            <p className="text-[11px] text-muted-foreground">{s.pricing_model || "Fixed rate"} • Duration: {s.duration_hours || 1} hrs</p>
                          </div>
                          <span className="font-bold text-emerald-600 text-sm">₹{Number(s.custom_price || s.suggested_price || 0).toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-muted-foreground">No specific services configured</p>
                    )}
                  </div>
                </TabsContent>

                {/* Qualifications Tab */}
                <TabsContent value="qualifications" className="pt-2 text-xs space-y-2">
                  <div className="p-2.5 border rounded">
                    <p className="font-semibold text-muted-foreground mb-1">Declared Qualifications:</p>
                    <pre className="text-[11px] bg-muted/40 p-2 rounded whitespace-pre-wrap font-mono">
                      {proDetail.qualifications ? JSON.stringify(proDetail.qualifications, null, 2) : "None provided"}
                    </pre>
                  </div>
                  <div className="p-2.5 border rounded">
                    <p className="font-semibold text-muted-foreground mb-1">Licenses & Certifications:</p>
                    <pre className="text-[11px] bg-muted/40 p-2 rounded whitespace-pre-wrap font-mono">
                      {proDetail.certifications ? JSON.stringify(proDetail.certifications, null, 2) : "None provided"}
                    </pre>
                  </div>
                </TabsContent>

                {/* Portfolio Tab */}
                <TabsContent value="portfolio" className="pt-2">
                  {proDetail.portfolio_images && proDetail.portfolio_images.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {proDetail.portfolio_images.map((img, idx) => (
                        <img key={idx} src={img} alt="Portfolio item" className="h-28 w-full object-cover rounded border" />
                      ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-muted-foreground text-xs">No portfolio images uploaded</p>
                  )}
                </TabsContent>

                {/* Reviews Tab */}
                <TabsContent value="reviews" className="pt-2">
                  <div className="space-y-2 max-h-56 overflow-y-auto text-xs">
                    {proDetail.reviews?.length ? (
                      proDetail.reviews.map((r) => (
                        <div key={r.id} className="p-2 border rounded space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">{r.reviewer_name || "Customer"}</span>
                            <div className="flex items-center text-amber-500 font-bold gap-0.5">
                              <Star className="size-3 fill-amber-500" /> {r.rating} / 5
                            </div>
                          </div>
                          <p className="text-muted-foreground text-[11px]">{r.comment}</p>
                          <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-muted-foreground">No customer reviews yet</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


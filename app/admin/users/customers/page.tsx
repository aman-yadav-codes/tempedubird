"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  Eye,
  EyeOff,
  Heart,
  MessageSquare,
  Star,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
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

type Customer = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  favorites_count: number;
  inquiries_count: number;
  reviews_count: number;
  reports_count: number;
};

type CustomerDetail = Customer & {
  favorites: any[];
  inquiries: any[];
  reviews: any[];
  reports: any[];
};

export default function CustomerManagementPage() {
  const { accessToken } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [maskPrivacy, setMaskPrivacy] = useState(true);

  // Drilldown dialog
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/customers", window.location.origin);
      if (search) url.searchParams.set("search", search);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      const res = await fetch(url.toString(), {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load customers");
      setCustomers(json.customers || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error loading customers");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, accessToken]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openCustomerDetail = async (id: number) => {
    setSelectedCustomerId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/customers?id=${id}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load customer details");
      setCustomerDetail(json.customer);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error loading details");
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleCustomerStatus = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ customerId: id, isActive: !currentStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update status");
      toast.success(currentStatus ? "Customer suspended" : "Customer activated");
      fetchCustomers();
      if (customerDetail && customerDetail.id === id) {
        setCustomerDetail({ ...customerDetail, is_active: !currentStatus });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const maskString = (str?: string | null) => {
    if (!str) return "N/A";
    if (!maskPrivacy) return str;
    if (str.includes("@")) {
      const parts = str.split("@");
      const name = parts[0];
      return `${name.slice(0, 2)}***@${parts[1]}`;
    }
    return `${str.slice(0, 3)}****${str.slice(-2)}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Customer Management</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Module 3
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor registered consumer accounts, enquiry history, favorites, reviews, and privacy protection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMaskPrivacy(!maskPrivacy)}
            className="text-xs h-8 gap-1.5"
          >
            {maskPrivacy ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            {maskPrivacy ? "Reveal Customer PII" : "Mask Customer PII"}
          </Button>

          <Button variant="outline" size="sm" onClick={fetchCustomers} disabled={loading} className="text-xs h-8 gap-1.5">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
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
            All Customers
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              statusFilter === "active" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              statusFilter === "inactive" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
            }`}
          >
            Suspended
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Customer Name</TableHead>
                <TableHead className="text-xs">Contact Info</TableHead>
                <TableHead className="text-xs">Registration Date</TableHead>
                <TableHead className="text-xs">Last Login</TableHead>
                <TableHead className="text-xs">Activity Stats</TableHead>
                <TableHead className="text-xs">Account Status</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                    Loading registered customers...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    No customers found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-xs">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                          {c.full_name?.charAt(0) || "C"}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{c.full_name}</p>
                          <span className="text-[10px] text-muted-foreground">ID #{c.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs space-y-0.5">
                      <p className="text-muted-foreground">{maskString(c.email)}</p>
                      <p className="text-[11px] text-muted-foreground">{maskString(c.phone)}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.last_login_at ? new Date(c.last_login_at).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                          <Heart className="size-3" /> {c.favorites_count}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                          <MessageSquare className="size-3" /> {c.inquiries_count}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          <Star className="size-3" /> {c.reviews_count}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.is_active ? (
                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          Suspended
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-right space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCustomerDetail(c.id)}
                        className="h-7 text-xs"
                      >
                        Inspect
                      </Button>
                      <Button
                        variant={c.is_active ? "destructive" : "secondary"}
                        size="sm"
                        onClick={() => toggleCustomerStatus(c.id, c.is_active)}
                        className="h-7 text-xs"
                      >
                        {c.is_active ? "Suspend" : "Reactivate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Detail Inspection Modal */}
      <Dialog open={selectedCustomerId !== null} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Users className="size-4 text-primary" />
              Customer Profile & Activity History
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete audit history for enquiries, saved favourites, ratings, and submitted platform reports.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !customerDetail ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin mx-auto mb-2" />
              Loading customer audit records...
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Profile Card */}
              <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{customerDetail.full_name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {maskString(customerDetail.email)} • {maskString(customerDetail.phone)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Member since {new Date(customerDetail.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  {customerDetail.is_active ? (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      Active Account
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      Suspended
                    </Badge>
                  )}
                </div>
              </div>

              {/* Activity Tabs */}
              <Tabs defaultValue="favorites" className="w-full">
                <TabsList className="grid grid-cols-4 w-full h-8 text-xs">
                  <TabsTrigger value="favorites" className="text-xs">
                    Favorites ({customerDetail.favorites?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="inquiries" className="text-xs">
                    Enquiries ({customerDetail.inquiries?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="reviews" className="text-xs">
                    Reviews ({customerDetail.reviews?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="text-xs">
                    Reports ({customerDetail.reports?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* Favorites Tab */}
                <TabsContent value="favorites" className="pt-2">
                  <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
                    {customerDetail.favorites?.length ? (
                      customerDetail.favorites.map((f) => (
                        <div key={f.id} className="p-2 border rounded flex justify-between items-center">
                          <span className="font-medium">
                            {f.business_name || f.professional_name || "Saved Item"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(f.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-muted-foreground">No saved favorites</p>
                    )}
                  </div>
                </TabsContent>

                {/* Inquiries Tab */}
                <TabsContent value="inquiries" className="pt-2">
                  <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                    {customerDetail.inquiries?.length ? (
                      customerDetail.inquiries.map((iq) => (
                        <div key={iq.id} className="p-2 border rounded space-y-1">
                          <div className="flex justify-between">
                            <span className="font-semibold text-primary">
                              To: {iq.business_name || iq.professional_name || "Provider"}
                            </span>
                            <Badge variant="outline" className="text-[10px]">{iq.status}</Badge>
                          </div>
                          <p className="text-muted-foreground text-[11px]">{iq.message}</p>
                          <span className="text-[10px] text-muted-foreground">{new Date(iq.created_at).toLocaleDateString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-muted-foreground">No enquiries submitted</p>
                    )}
                  </div>
                </TabsContent>

                {/* Reviews Tab */}
                <TabsContent value="reviews" className="pt-2">
                  <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                    {customerDetail.reviews?.length ? (
                      customerDetail.reviews.map((rv) => (
                        <div key={rv.id} className="p-2 border rounded space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">
                              {rv.business_name || rv.professional_name}
                            </span>
                            <div className="flex items-center text-amber-500 font-bold gap-0.5">
                              <Star className="size-3 fill-amber-500" /> {rv.rating} / 5
                            </div>
                          </div>
                          <p className="text-muted-foreground text-[11px]">{rv.comment}</p>
                          <span className="text-[10px] text-muted-foreground">{new Date(rv.created_at).toLocaleDateString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-muted-foreground">No reviews submitted</p>
                    )}
                  </div>
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports" className="pt-2">
                  <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                    {customerDetail.reports?.length ? (
                      customerDetail.reports.map((rp) => (
                        <div key={rp.id} className="p-2 border rounded space-y-1">
                          <div className="flex justify-between">
                            <span className="font-semibold text-rose-600">{rp.report_reason}</span>
                            <Badge variant="destructive" className="text-[10px]">{rp.status}</Badge>
                          </div>
                          <p className="text-muted-foreground text-[11px]">{rp.description}</p>
                          <span className="text-[10px] text-muted-foreground">{new Date(rp.created_at).toLocaleDateString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-muted-foreground">No reports filed</p>
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


"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Search,
  CheckCircle2,
  Clock,
  Package,
  Layers,
  CreditCard,
  RefreshCw,
  Loader2,
  Calendar,
  Phone,
  Mail,
  ExternalLink,
  ShieldAlert,
  GitBranch,
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
import Link from "next/link";
import { useAuthStore } from "@/store";

type BusinessOwner = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  businesses_count: number;
  total_products: number;
  total_services: number;
  has_verified_business: boolean;
  active_subscription_plan: string | null;
};

type OwnerDetail = BusinessOwner & {
  businesses: any[];
  payments: any[];
  subscriptions: any[];
};

export default function BusinessOwnerManagementPage() {
  const { accessToken } = useAuthStore();
  const [owners, setOwners] = useState<BusinessOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Inspection Modal
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [ownerDetail, setOwnerDetail] = useState<OwnerDetail | null>(null);

  const fetchOwners = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/business-owners", window.location.origin);
      if (search) url.searchParams.set("search", search);
      const res = await fetch(url.toString(), {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load business owners");
      setOwners(json.owners || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error loading business owners");
    } finally {
      setLoading(false);
    }
  }, [search, accessToken]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  const openOwnerDetail = async (id: number) => {
    setSelectedOwnerId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/business-owners?id=${id}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load owner details");
      setOwnerDetail(json.owner);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error loading details");
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleOwnerStatus = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/business-owners", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ ownerId: id, isActive: !currentStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update owner status");
      toast.success(currentStatus ? "Owner suspended" : "Owner reactivated");
      fetchOwners();
      if (ownerDetail && ownerDetail.id === id) {
        setOwnerDetail({ ...ownerDetail, is_active: !currentStatus });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Business Owner Management</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Module 4
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage merchants, enterprise profiles, branches, linked products/services, and subscription status.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchOwners} disabled={loading} className="text-xs h-8 gap-1.5">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search owners by name, email, phone, or business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Owners Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Owner Name</TableHead>
                <TableHead className="text-xs">Contact Info</TableHead>
                <TableHead className="text-xs">Businesses</TableHead>
                <TableHead className="text-xs">Catalog Size</TableHead>
                <TableHead className="text-xs">Verification</TableHead>
                <TableHead className="text-xs">Subscription</TableHead>
                <TableHead className="text-xs">Account Status</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                    Loading business owners...
                  </TableCell>
                </TableRow>
              ) : owners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                    No business owners found.
                  </TableCell>
                </TableRow>
              ) : (
                owners.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium text-xs">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-full bg-indigo-500/10 text-indigo-600 font-bold flex items-center justify-center text-xs">
                          {o.full_name?.charAt(0) || "B"}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{o.full_name}</p>
                          <span className="text-[10px] text-muted-foreground">Owner #{o.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs space-y-0.5">
                      <p className="text-muted-foreground">{o.email}</p>
                      <p className="text-[11px] text-muted-foreground">{o.phone || "No phone"}</p>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Building2 className="size-3.5 text-indigo-500" />
                        {o.businesses_count} {o.businesses_count === 1 ? "Business" : "Businesses"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                        <span className="inline-flex items-center gap-0.5">
                          <Package className="size-3 text-emerald-600" /> {o.total_products} products
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Layers className="size-3 text-teal-600" /> {o.total_services} services
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {o.has_verified_business ? (
                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Unverified
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="secondary" className="text-[10px]">
                        {o.active_subscription_plan || "Standard"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {o.is_active ? (
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
                        onClick={() => openOwnerDetail(o.id)}
                        className="h-7 text-xs"
                      >
                        Inspect
                      </Button>
                      <Button
                        variant={o.is_active ? "destructive" : "secondary"}
                        size="sm"
                        onClick={() => toggleOwnerStatus(o.id, o.is_active)}
                        className="h-7 text-xs"
                      >
                        {o.is_active ? "Suspend" : "Reactivate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Owner Detail Inspection Modal */}
      <Dialog open={selectedOwnerId !== null} onOpenChange={(open) => !open && setSelectedOwnerId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              Business Owner Overview & Operations
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete breakdown of registered branches, inventory products, service offerings, and billing history.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !ownerDetail ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin mx-auto mb-2" />
              Loading owner portfolio...
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Profile Card */}
              <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{ownerDetail.full_name}</h3>
                  <p className="text-xs text-muted-foreground">{ownerDetail.email} • {ownerDetail.phone || "No phone"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Registered {new Date(ownerDetail.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  {ownerDetail.is_active ? (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      Active Merchant
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      Suspended
                    </Badge>
                  )}
                </div>
              </div>

              {/* Detail Tabs */}
              <Tabs defaultValue="businesses" className="w-full">
                <TabsList className="grid grid-cols-3 w-full h-8 text-xs">
                  <TabsTrigger value="businesses" className="text-xs">
                    Listings ({ownerDetail.businesses?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="text-xs">
                    Billing ({ownerDetail.payments?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="subscriptions" className="text-xs">
                    Subscriptions ({ownerDetail.subscriptions?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* Businesses Tab */}
                <TabsContent value="businesses" className="pt-2">
                  <div className="space-y-2 max-h-56 overflow-y-auto text-xs">
                    {ownerDetail.businesses?.length ? (
                      ownerDetail.businesses.map((b) => (
                        <div key={b.id} className="p-2.5 border rounded space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-foreground text-sm">{b.name}</span>
                            <Badge variant={b.is_verified ? "outline" : "secondary"} className="text-[10px]">
                              {b.verification_status || "Pending"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-[11px]">
                            {b.business_type || "Business"} • {b.city || "Unknown City"}, {b.country_code || "IN"}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                            <span><Package className="size-3 inline mr-0.5 text-emerald-600" /> {b.products_count} Products</span>
                            <span><Layers className="size-3 inline mr-0.5 text-teal-600" /> {b.services_count} Services</span>
                            <span><GitBranch className="size-3 inline mr-0.5 text-indigo-600" /> {b.branches_count} Branches</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-muted-foreground">No business listings found</p>
                    )}
                  </div>
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments" className="pt-2">
                  <div className="space-y-1.5 max-h-56 overflow-y-auto text-xs">
                    {ownerDetail.payments?.length ? (
                      ownerDetail.payments.map((p) => (
                        <div key={p.id} className="p-2 border rounded flex justify-between items-center">
                          <div>
                            <span className="font-semibold">Txn #{p.transaction_id || p.id}</span>
                            <p className="text-[10px] text-muted-foreground">{p.payment_method} • {new Date(p.income_date).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-600">₹{Number(p.amount).toLocaleString()}</span>
                            <Badge variant="outline" className="text-[10px] block mt-0.5">{p.payment_status}</Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-muted-foreground">No payment history recorded</p>
                    )}
                  </div>
                </TabsContent>

                {/* Subscriptions Tab */}
                <TabsContent value="subscriptions" className="pt-2">
                  <div className="space-y-1.5 max-h-56 overflow-y-auto text-xs">
                    {ownerDetail.subscriptions?.length ? (
                      ownerDetail.subscriptions.map((s) => (
                        <div key={s.id} className="p-2 border rounded flex justify-between items-center">
                          <div>
                            <span className="font-semibold">{s.plan_name} Plan</span>
                            <p className="text-[10px] text-muted-foreground">{s.billing_cycle || "Monthly"}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-muted-foreground">No custom subscriptions</p>
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


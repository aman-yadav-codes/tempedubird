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
  KeyRound,
  Sparkles,
  Copy,
  Check,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Link from "next/link";
import { useAuthStore } from "@/store";

type OwnerBusinessRef = {
  id: number;
  name: string;
  slug: string | null;
  type: "business" | "institution";
  is_verified?: boolean;
  verification_status?: string | null;
  business_type?: string | null;
  city?: string | null;
  country_code?: string | null;
  products_count?: number;
  services_count?: number;
  branches_count?: number;
};

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
  businesses?: OwnerBusinessRef[];
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

  // Password Reset Modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordOwner, setPasswordOwner] = useState<BusinessOwner | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

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

  // Password Reset Handlers
  const openPasswordModal = (owner: BusinessOwner) => {
    setPasswordOwner(owner);
    setNewPassword("");
    setConfirmPassword("");
    setCopied(false);
    setCopiedCredentials(false);
    setPasswordModalOpen(true);
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let rand = "";
    for (let i = 0; i < 8; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const gen = `EduBird#${rand}`;
    setNewPassword(gen);
    setConfirmPassword(gen);
    setCopied(false);
    toast.info("Generated new strong password");
  };

  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    toast.success("Password copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCredentials = () => {
    if (!passwordOwner || !newPassword) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const text = `Business Owner Login Credentials:
Owner Name: ${passwordOwner.full_name}
Email / Username: ${passwordOwner.email}
Phone: ${passwordOwner.phone || "Not set"}
Password: ${newPassword}
Login URL: ${origin}/login`;
    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopiedCredentials(false), 2500);
  };

  const handleSavePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!passwordOwner) return;

    setSavingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/password?id=${passwordOwner.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          password: newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update password");

      toast.success(`Password for ${passwordOwner.full_name} updated successfully!`);
      setPasswordModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSavingPassword(false);
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
            Manage merchants, enterprise profiles, branches, linked products/services, subscription status, and credentials.
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
                      {(!o.businesses || o.businesses.length === 0) ? (
                        o.businesses_count > 0 ? (
                          <Link
                            href={`/business/${o.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary/90 hover:underline bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-md border border-primary/25 transition-all shadow-xs"
                            title="Open Business Storefront in new tab"
                          >
                            <Building2 className="size-3.5 text-primary shrink-0" />
                            <span>{o.businesses_count} Business</span>
                            <ExternalLink className="size-3 text-primary shrink-0" />
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Building2 className="size-3.5 text-muted-foreground" />
                            0 Businesses
                          </span>
                        )
                      ) : o.businesses.length === 1 ? (
                        (() => {
                          const biz = o.businesses[0];
                          const href = biz.type === "institution" ? `/institutes/${biz.slug || biz.id}` : `/business/${biz.slug || biz.id}`;
                          return (
                            <Link
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline bg-indigo-50/90 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-md border border-indigo-300/80 dark:border-indigo-800/60 transition-all hover:shadow-xs"
                              title={`Visit ${biz.name} Storefront in new tab`}
                            >
                              <Building2 className="size-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                              <span className="truncate max-w-[130px]">{biz.name || "1 Business"}</span>
                              <ExternalLink className="size-3 text-indigo-500 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 shrink-0" />
                            </Link>
                          );
                        })()
                      ) : (
                        <button
                          type="button"
                          onClick={() => openOwnerDetail(o.id)}
                          className="group inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline bg-indigo-50/90 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-md border border-indigo-300/80 dark:border-indigo-800/60 transition-all hover:shadow-xs"
                          title="View All Businesses & Open Storefronts"
                        >
                          <Building2 className="size-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>{o.businesses.length} Businesses</span>
                          <ExternalLink className="size-3 text-indigo-500 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 shrink-0" />
                        </button>
                      )}
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
                    <TableCell className="text-xs text-right space-x-1 whitespace-nowrap">
                      {o.businesses && o.businesses.length > 0 && (
                        <Link
                          href={o.businesses[0].type === "institution" ? `/institutes/${o.businesses[0].slug || o.businesses[0].id}` : `/business/${o.businesses[0].slug || o.businesses[0].id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-semibold border border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                          title={`Open ${o.businesses[0].name} Storefront`}
                        >
                          <ExternalLink className="size-3" />
                          Storefront
                        </Link>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openOwnerDetail(o.id)}
                        className="h-7 text-xs"
                      >
                        Inspect
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPasswordModal(o)}
                        className="h-7 text-xs gap-1 border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/30"
                        title="Reset Password"
                      >
                        <KeyRound className="size-3 text-amber-600 dark:text-amber-400" />
                        Reset Password
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
              <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-sm">{ownerDetail.full_name}</h3>
                  <p className="text-xs text-muted-foreground">{ownerDetail.email} • {ownerDetail.phone || "No phone"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Registered {new Date(ownerDetail.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  {ownerDetail.is_active ? (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      Active Merchant
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      Suspended
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedOwnerId(null);
                      openPasswordModal(ownerDetail);
                    }}
                    className="h-7 text-xs gap-1 border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300"
                  >
                    <KeyRound className="size-3 text-amber-600" />
                    Reset Password
                  </Button>
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
                        <div key={b.id} className="p-2.5 border rounded space-y-1.5">
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-foreground text-sm truncate">{b.name}</span>
                              <Badge variant={b.is_verified ? "outline" : "secondary"} className="text-[10px] shrink-0">
                                {b.verification_status || "Pending"}
                              </Badge>
                            </div>
                            <Link
                              href={b.business_type === "Educational / Academic Institution" ? `/institutes/${b.slug || b.id}` : `/business/${b.slug || b.id}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded transition-colors shrink-0"
                            >
                              <span>Visit Storefront</span>
                              <ExternalLink className="size-3" />
                            </Link>
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

      {/* Reset Password Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <KeyRound className="size-4 text-amber-600" />
              Reset Business Owner Password
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set or generate a new login password for{" "}
              <strong className="text-foreground">{passwordOwner?.full_name}</strong> (
              <span className="text-muted-foreground">{passwordOwner?.email}</span>).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePassword} className="space-y-4 pt-2">
            {/* Quick Generator Button */}
            <div className="flex justify-between items-center bg-muted/40 p-2.5 rounded-lg border">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Need a strong password?</span>
                <p className="text-[11px]">Generate a safe, random password automatically.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateRandomPassword}
                className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5"
              >
                <Sparkles className="size-3.5" />
                Generate
              </Button>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label className="text-xs">New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password (min. 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10 text-xs h-9"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label className="text-xs">Confirm New Password</Label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="text-xs h-9"
                autoComplete="new-password"
              />
            </div>

            {/* Copy helpers when password is set */}
            {newPassword.length >= 6 && (
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPassword}
                  className="text-xs h-7 gap-1"
                >
                  {copied ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
                  {copied ? "Copied" : "Copy Password"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCredentials}
                  className="text-xs h-7 gap-1"
                >
                  {copiedCredentials ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
                  {copiedCredentials ? "Copied All" : "Copy Credentials"}
                </Button>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPasswordModalOpen(false)}
                disabled={savingPassword}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingPassword || !newPassword || newPassword.length < 6}
                className="text-xs h-8 gap-1.5"
              >
                {savingPassword && <Loader2 className="size-3.5 animate-spin" />}
                {savingPassword ? "Updating..." : "Save Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

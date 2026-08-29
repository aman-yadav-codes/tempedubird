"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  UsersRound,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  Briefcase,
  Edit2,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuthStore } from "@/store";

export type Client = {
  id: number;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  client_type: string;
  institution_id: number | null;
  country: string;
  state: string | null;
  city: string | null;
  area: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  status: "active" | "inactive";
  created_at: string;
};

const CLIENT_TYPES = [
  { id: "corporate", label: "Corporate / Business", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200" },
  { id: "sponsor", label: "Student Sponsor / Donor", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200" },
  { id: "institution", label: "Partner Institution / College", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200" },
  { id: "vendor_partner", label: "Vendor / Service Partner", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200" },
  { id: "individual", label: "Individual Client", color: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200" },
];

export default function SalesClientsPage() {
  const { accessToken } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formType, setFormType] = useState("corporate");
  const [formCountry, setFormCountry] = useState("India");
  const [formState, setFormState] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);

      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/sales/clients?${params.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load clients");
      setClients(data.clients || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, statusFilter, accessToken]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormName("");
    setFormCompanyName("");
    setFormEmail("");
    setFormPhone("");
    setFormType("corporate");
    setFormCountry("India");
    setFormState("");
    setFormCity("");
    setFormArea("");
    setFormAddress("");
    setFormWebsite("");
    setFormNotes("");
    setFormStatus("active");
    setDialogOpen(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditingClient(c);
    setFormName(c.name || "");
    setFormCompanyName(c.company_name || "");
    setFormEmail(c.email || "");
    setFormPhone(c.phone || "");
    setFormType(c.client_type || "corporate");
    setFormCountry(c.country || "India");
    setFormState(c.state || "");
    setFormCity(c.city || "");
    setFormArea(c.area || "");
    setFormAddress(c.address || "");
    setFormWebsite(c.website || "");
    setFormNotes(c.notes || "");
    setFormStatus(c.status || "active");
    setDialogOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter Client / Contact Name");
      return;
    }

    setSaving(true);
    try {
      const method = editingClient ? "PUT" : "POST";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/sales/clients", {
        method,
        headers,
        body: JSON.stringify({
          id: editingClient?.id,
          name: formName.trim(),
          company_name: formCompanyName.trim() || null,
          email: formEmail.trim() || null,
          phone: formPhone.trim() || null,
          client_type: formType,
          country: formCountry,
          state: formState.trim() || null,
          city: formCity.trim() || null,
          area: formArea.trim() || null,
          address: formAddress.trim() || null,
          website: formWebsite.trim() || null,
          notes: formNotes.trim() || null,
          status: formStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save client");

      toast.success(editingClient ? "Client updated successfully!" : "Client created successfully!");
      setDialogOpen(false);
      fetchClients();
    } catch (err: any) {
      toast.error(err.message || "Failed to save client");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (!confirm("Are you sure you want to delete this client record?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/sales/clients?id=${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("Client deleted successfully");
        fetchClients();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to delete client");
      }
    } catch {
      toast.error("Failed to delete client");
    }
  };

  const getTypeBadge = (type: string) => {
    const config = CLIENT_TYPES.find((t) => t.id === type) || {
      label: type,
      color: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200",
    };
    return (
      <Badge variant="outline" className={`text-[10px] font-bold capitalize ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <UsersRound className="w-4 h-4" />
            <span>Sales & Accounts Directory</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Clients Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage corporate partners, sponsors, vendors, and institutions for sales, proposals, and operations tasks.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchClients} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-1.5">
            <Plus className="w-4 h-4" /> Add New Client
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border bg-card/60 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <UsersRound className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Clients</p>
              <h3 className="text-xl font-bold">{clients.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Corporate & Inst.</p>
              <h3 className="text-xl font-bold">
                {clients.filter((c) => c.client_type === "corporate" || c.client_type === "institution").length}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Sponsors & Vendors</p>
              <h3 className="text-xl font-bold">
                {clients.filter((c) => c.client_type === "sponsor" || c.client_type === "vendor_partner").length}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Accounts</p>
              <h3 className="text-xl font-bold">
                {clients.filter((c) => c.status === "active").length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-muted/30 p-3 rounded-2xl border">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name, company, email, phone, city..."
            className="pl-9 bg-background h-10 text-xs rounded-xl"
          />
        </div>

        <div className="w-full sm:w-56">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-10 text-xs bg-background rounded-xl font-medium">
              <div className="flex items-center gap-2 truncate">
                <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                <SelectValue placeholder="All Client Types" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Client Types</SelectItem>
              {CLIENT_TYPES.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-40">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 text-xs bg-background rounded-xl font-medium">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
          <span className="text-sm font-medium text-muted-foreground">Loading clients...</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20 border rounded-3xl bg-muted/10 space-y-3">
          <UsersRound className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-lg font-bold text-foreground">No clients found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            No client accounts match your search filters. Click &quot;Add New Client&quot; to onboard corporate partners, sponsors, or institutional accounts.
          </p>
          <Button onClick={handleOpenAdd} size="sm" className="mt-2 font-bold">
            <Plus className="w-4 h-4 mr-1.5" /> Add New Client
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((client) => (
            <Card
              key={client.id}
              className="rounded-2xl border border-border/80 hover:border-primary/50 transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-base overflow-hidden shrink-0">
                      {client.company_name ? client.company_name.charAt(0).toUpperCase() : client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold leading-tight">
                        {client.company_name || client.name}
                      </CardTitle>
                      {client.company_name && (
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          Contact: {client.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={client.status === "active" ? "default" : "secondary"} className="text-[10px] shrink-0">
                    {client.status}
                  </Badge>
                </div>

                <div className="mt-2.5">
                  {getTypeBadge(client.client_type)}
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-3 text-xs">
                {client.notes && (
                  <p className="text-muted-foreground line-clamp-2 leading-relaxed italic bg-muted/20 p-2 rounded-lg border text-[11px]">
                    &quot;{client.notes}&quot;
                  </p>
                )}

                <div className="space-y-1.5 pt-2 border-t text-muted-foreground">
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-semibold text-foreground font-mono">{client.phone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {(client.city || client.state || client.address) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">
                        {[client.area, client.city, client.state].filter(Boolean).join(", ") || client.address}
                      </span>
                    </div>
                  )}
                  {client.website && (
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <a href={client.website.startsWith("http") ? client.website : `https://${client.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                        {client.website}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(client)} className="h-8 text-xs font-semibold">
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteClient(client.id)} className="h-8 text-xs text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl w-[92vw] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editingClient ? "Edit Client Details" : "Add New Client"}</DialogTitle>
            <DialogDescription>
              Store client company details, key contact person, classification, and billing address.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveClient} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Client / Contact Name *</Label>
                <Input
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Rahul Verma or Corporate Admin"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Company / Organization Name</Label>
                <Input
                  value={formCompanyName}
                  onChange={(e) => setFormCompanyName(e.target.value)}
                  placeholder="e.g. Apex Global Tech Pvt Ltd"
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Client Classification / Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Status</Label>
                <Select value={formStatus} onValueChange={(v: any) => setFormStatus(v)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-xs">Active Account</SelectItem>
                    <SelectItem value="inactive" className="text-xs">Inactive Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Contact Phone Number</Label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Contact Email Address</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. accounts@client.com"
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Location Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">City</Label>
                <Input
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  placeholder="e.g. Varanasi"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">State</Label>
                <Input
                  value={formState}
                  onChange={(e) => setFormState(e.target.value)}
                  placeholder="e.g. Uttar Pradesh"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Area / Locality</Label>
                <Input
                  value={formArea}
                  onChange={(e) => setFormArea(e.target.value)}
                  placeholder="e.g. Mahmoorganj"
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Full Address</Label>
              <Input
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="e.g. Plot 24, Near IT Park, University Road"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Website / Portal URL</Label>
              <Input
                value={formWebsite}
                onChange={(e) => setFormWebsite(e.target.value)}
                placeholder="e.g. https://apextech.com"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Account Notes / Requirements</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Add special notes, terms, or preferred course categories..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary font-bold">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingClient ? "Save Changes" : "Create Client Record"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Building2,
  CheckCircle2,
  Loader2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InstitutionBranch, BranchPhone, BranchEmail } from "@/lib/types/institution";

interface InstitutionBranchManagerProps {
  institutionId: number;
  accessToken?: string;
  readOnly?: boolean;
}

export function InstitutionBranchManager({
  institutionId,
  accessToken,
  readOnly = false,
}: InstitutionBranchManagerProps) {
  const [branches, setBranches] = useState<InstitutionBranch[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<InstitutionBranch | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [branchName, setBranchName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [phones, setPhones] = useState<BranchPhone[]>([]);
  const [emails, setEmails] = useState<BranchEmail[]>([]);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<InstitutionBranch | null>(null);

  const fetchBranches = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/institutions/branches?institutionId=${institutionId}`, {
        headers,
      });
      const json = await res.json();
      if (res.ok) {
        setBranches(json.data || []);
      } else {
        toast.error(json.error ?? "Failed to load branch contacts");
      }
    } catch {
      toast.error("Network error fetching branch contacts");
    } finally {
      setLoading(false);
    }
  }, [institutionId, accessToken]);

  useEffect(() => {
    void fetchBranches();
  }, [fetchBranches]);

  const openCreateModal = () => {
    setEditingBranch(null);
    setBranchName("");
    setAddress("");
    setCity("");
    setState("");
    setPincode("");
    setWorkingHours("Monday - Saturday: 9:00 AM - 6:00 PM IST");
    setIsPrimary(branches.length === 0);
    setPhones([
      { title: "Admissions Line", phone: "" },
      { title: "General Helpline", phone: "" },
    ]);
    setEmails([
      { title: "General Enquiry", email: "" },
      { title: "Admissions Office", email: "" },
    ]);
    setDialogOpen(true);
  };

  const openEditModal = (branch: InstitutionBranch) => {
    setEditingBranch(branch);
    setBranchName(branch.branch_name || "");
    setAddress(branch.address || "");
    setCity(branch.city || "");
    setState(branch.state || "");
    setPincode(branch.pincode || "");
    setWorkingHours(branch.working_hours || "");
    setIsPrimary(Boolean(branch.is_primary));
    setPhones(
      branch.phones && branch.phones.length > 0
        ? [...branch.phones]
        : [{ title: "Primary Phone", phone: "" }]
    );
    setEmails(
      branch.emails && branch.emails.length > 0
        ? [...branch.emails]
        : [{ title: "Primary Email", email: "" }]
    );
    setDialogOpen(true);
  };

  // Phone Handlers
  const addPhone = () => {
    setPhones((prev) => [...prev, { title: "Helpline", phone: "" }]);
  };

  const updatePhone = (index: number, field: keyof BranchPhone, value: string) => {
    setPhones((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removePhone = (index: number) => {
    setPhones((prev) => prev.filter((_, i) => i !== index));
  };

  // Email Handlers
  const addEmail = () => {
    setEmails((prev) => [...prev, { title: "Support Email", email: "" }]);
  };

  const updateEmail = (index: number, field: keyof BranchEmail, value: string) => {
    setEmails((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeEmail = (index: number) => {
    setEmails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!branchName.trim()) {
      return toast.error("Branch title / name is required");
    }

    // Filter out empty phone and email entries
    const validPhones = phones.filter((p) => p.phone.trim().length > 0);
    const validEmails = emails.filter((e) => e.email.trim().length > 0);

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const payload = {
        id: editingBranch?.id,
        institutionId,
        branchName: branchName.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        workingHours: workingHours.trim() || null,
        phones: validPhones,
        emails: validEmails,
        isPrimary,
      };

      const method = editingBranch ? "PUT" : "POST";
      const res = await fetch("/api/admin/institutions/branches", {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(editingBranch ? "Branch updated" : "Branch contact added");
        setDialogOpen(false);
        await fetchBranches();
      } else {
        toast.error(json.error ?? "Failed to save branch contact");
      }
    } catch {
      toast.error("Network error saving branch");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/institutions/branches?id=${deleteTarget.id}`, {
        method: "DELETE",
        headers,
      });

      if (res.ok) {
        toast.success("Branch contact deleted");
        setDeleteTarget(null);
        await fetchBranches();
      } else {
        const json = await res.json();
        toast.error(json.error ?? "Failed to delete branch");
      }
    } catch {
      toast.error("Network error deleting branch");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Building2 className="size-4 text-primary" />
            Contact Us & Branch Locations
          </h3>
          <p className="text-xs text-muted-foreground">
            Manage multiple branch offices, location addresses, and titled phone numbers / emails for your website contact page.
          </p>
        </div>
        {!readOnly && (
          <Button onClick={openCreateModal} size="sm" className="gap-1.5 font-semibold">
            <Plus className="size-4" /> Add Branch Contact
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8 text-muted-foreground text-xs gap-2">
          <Loader2 className="size-4 animate-spin" /> Loading branch contacts...
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center space-y-3 bg-muted/20">
          <MapPin className="size-8 mx-auto text-muted-foreground opacity-50" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">No Branch Contacts Added</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Add your institution&apos;s main office, campus locations, or department contact details with custom titled phone numbers & email addresses.
            </p>
          </div>
          {!readOnly && (
            <Button onClick={openCreateModal} size="sm" variant="outline" className="gap-1.5">
              <Plus className="size-4" /> Add First Branch
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="relative rounded-xl border border-border bg-card p-4 space-y-3 transition-shadow hover:shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-foreground">{branch.branch_name}</h4>
                    {branch.is_primary && (
                      <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 border-amber-500/30 text-[10px] gap-1 px-1.5 py-0">
                        <Star className="size-3 fill-amber-500 text-amber-500" /> Primary Branch
                      </Badge>
                    )}
                  </div>
                  {branch.working_hours && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5 shrink-0 text-muted-foreground/70" />
                      <span>{branch.working_hours}</span>
                    </div>
                  )}
                </div>

                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditModal(branch)}
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(branch)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {branch.address && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/50">
                  <MapPin className="size-3.5 shrink-0 text-primary mt-0.5" />
                  <span className="leading-relaxed">
                    {branch.address}
                    {branch.city ? `, ${branch.city}` : ""}
                    {branch.state ? `, ${branch.state}` : ""}
                    {branch.pincode ? ` - ${branch.pincode}` : ""}
                  </span>
                </div>
              )}

              {/* Titled Phone Numbers */}
              {branch.phones && branch.phones.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider block">
                    Phone Contacts ({branch.phones.length})
                  </span>
                  <div className="space-y-1">
                    {branch.phones.map((p, idx) => (
                      <div
                        key={`${p.phone}-${idx}`}
                        className="flex items-center justify-between text-xs rounded-md border p-2 bg-background/60"
                      >
                        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                          <Phone className="size-3 text-primary shrink-0" />
                          {p.title || "Phone"}:
                        </span>
                        <a
                          href={`tel:${p.phone.replace(/\s+/g, "")}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors font-mono"
                        >
                          {p.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Titled Email Addresses */}
              {branch.emails && branch.emails.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider block">
                    Email Addresses ({branch.emails.length})
                  </span>
                  <div className="space-y-1">
                    {branch.emails.map((e, idx) => (
                      <div
                        key={`${e.email}-${idx}`}
                        className="flex items-center justify-between text-xs rounded-md border p-2 bg-background/60"
                      >
                        <span className="text-muted-foreground font-medium flex items-center gap-1.5 truncate mr-2">
                          <Mail className="size-3 text-primary shrink-0" />
                          {e.title || "Email"}:
                        </span>
                        <a
                          href={`mailto:${e.email}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors truncate"
                        >
                          {e.email}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Branch Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              {editingBranch ? "Edit Branch Contact" : "Add New Branch Contact"}
            </DialogTitle>
            <DialogDescription>
              Configure branch address and multiple titled phone numbers and email addresses for your website&apos;s contact us page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Branch Title / Name *</Label>
                <Input
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Main Campus, Downtown Office, Admissions Cell"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 p-2.5 rounded-md border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors text-xs font-medium">
                  <Checkbox checked={isPrimary} onCheckedChange={(c) => setIsPrimary(Boolean(c))} />
                  <span>Main Primary Branch</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Location Address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Education Street, Block B, Knowledge Park"
                rows={2}
                className="bg-background/50 resize-none text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">City</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Varanasi"
                  className="bg-background/50 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">State</Label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Uttar Pradesh"
                  className="bg-background/50 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Pincode</Label>
                <Input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 221002"
                  className="bg-background/50 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Working Hours</Label>
              <Input
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                placeholder="e.g. Monday - Saturday: 9:00 AM - 6:00 PM IST"
                className="bg-background/50 text-xs"
              />
            </div>

            {/* Multiple Titled Phone Numbers */}
            <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Phone className="size-3.5 text-primary" /> Multiple Phone Numbers
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Add title for each number (e.g. Admissions, Helpline, Accounts).</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addPhone} className="h-7 text-xs gap-1">
                  <Plus className="size-3" /> Add Phone
                </Button>
              </div>

              {phones.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No phone numbers added yet.</p>
              ) : (
                <div className="space-y-2">
                  {phones.map((phoneItem, idx) => (
                    <div key={`phone-${idx}`} className="flex items-center gap-2">
                      <Input
                        value={phoneItem.title}
                        onChange={(e) => updatePhone(idx, "title", e.target.value)}
                        placeholder="Title (e.g. Admissions)"
                        className="bg-background/60 text-xs w-1/3"
                      />
                      <Input
                        value={phoneItem.phone}
                        onChange={(e) => updatePhone(idx, "phone", e.target.value)}
                        placeholder="Phone Number (e.g. +91 9876543210)"
                        className="bg-background/60 text-xs font-mono flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePhone(idx)}
                        className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Multiple Titled Email Addresses */}
            <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5 text-primary" /> Multiple Email Addresses
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Add title for each email (e.g. General Enquiry, Admissions Desk).</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addEmail} className="h-7 text-xs gap-1">
                  <Plus className="size-3" /> Add Email
                </Button>
              </div>

              {emails.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No email addresses added yet.</p>
              ) : (
                <div className="space-y-2">
                  {emails.map((emailItem, idx) => (
                    <div key={`email-${idx}`} className="flex items-center gap-2">
                      <Input
                        value={emailItem.title}
                        onChange={(e) => updateEmail(idx, "title", e.target.value)}
                        placeholder="Title (e.g. Support Desk)"
                        className="bg-background/60 text-xs w-1/3"
                      />
                      <Input
                        type="email"
                        value={emailItem.email}
                        onChange={(e) => updateEmail(idx, "email", e.target.value)}
                        placeholder="Email Address (e.g. info@edu.com)"
                        className="bg-background/60 text-xs flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEmail(idx)}
                        className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting} className="gap-1.5 font-semibold">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {editingBranch ? "Save Changes" : "Create Branch"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch Contact?</AlertDialogTitle>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to remove &quot;{deleteTarget?.branch_name}&quot;? This will remove its phone numbers and email addresses from the public contact page.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
  institutionId?: number;
  accessToken?: string;
  readOnly?: boolean;
  stagedBranches?: InstitutionBranch[];
  onStagedBranchesChange?: (branches: InstitutionBranch[]) => void;
}

export function InstitutionBranchManager({
  institutionId,
  accessToken,
  readOnly = false,
  stagedBranches,
  onStagedBranchesChange,
}: InstitutionBranchManagerProps) {
  const [branches, setBranches] = useState<InstitutionBranch[]>(stagedBranches || []);
  const [loading, setLoading] = useState(false);

  // Sync stagedBranches if provided from parent
  useEffect(() => {
    if (!institutionId && stagedBranches) {
      setBranches(stagedBranches);
    }
  }, [institutionId, stagedBranches]);

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
    if (!institutionId || institutionId <= 0) return;
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
    if (institutionId && institutionId > 0) {
      void fetchBranches();
    }
  }, [fetchBranches, institutionId]);

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

    // Staged / In-memory Mode (When creating a new institution)
    if (!institutionId || institutionId <= 0) {
      const nowIso = new Date().toISOString();
      const branchData: InstitutionBranch = {
        id: editingBranch?.id || Date.now(),
        institution_id: 0,
        branch_name: branchName.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        working_hours: workingHours.trim() || undefined,
        phones: validPhones,
        emails: validEmails,
        is_primary: isPrimary,
        sort_order: editingBranch?.sort_order || 0,
        is_active: true,
        created_at: editingBranch?.created_at || nowIso,
        updated_at: nowIso,
      };

      let updatedBranches: InstitutionBranch[];
      if (editingBranch) {
        updatedBranches = branches.map((b) => (b.id === editingBranch.id ? branchData : b));
      } else {
        updatedBranches = [...branches, branchData];
      }

      setBranches(updatedBranches);
      onStagedBranchesChange?.(updatedBranches);
      toast.success(editingBranch ? "Branch updated" : "Branch contact added");
      setDialogOpen(false);
      return;
    }

    // Live API Mode (When editing an existing institution)
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

    // In-memory delete
    if (!institutionId || institutionId <= 0) {
      const updated = branches.filter((b) => b.id !== deleteTarget.id);
      setBranches(updated);
      onStagedBranchesChange?.(updated);
      toast.success("Branch contact removed");
      setDeleteTarget(null);
      return;
    }

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
          <Button onClick={openCreateModal} size="sm" className="gap-1.5 font-semibold bg-primary text-primary-foreground">
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
                      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] gap-1 px-1.5 py-0.5">
                        <Star className="size-3 fill-amber-500 text-amber-500" /> Primary Campus
                      </Badge>
                    )}
                  </div>
                  {(branch.city || branch.state) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="size-3 shrink-0 text-primary" />
                      {[branch.city, branch.state, branch.pincode].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>

                {!readOnly && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditModal(branch)}
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(branch)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {branch.address && (
                <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded-md border border-border/40">
                  {branch.address}
                </p>
              )}

              {/* Titled Phones */}
              {branch.phones && branch.phones.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Phone className="size-3 text-emerald-500" /> Phone Helplines:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {branch.phones.map((p, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium border border-emerald-500/20"
                      >
                        <strong>{p.title}:</strong> {p.phone}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Titled Emails */}
              {branch.emails && branch.emails.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Mail className="size-3 text-blue-500" /> Official Emails:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {branch.emails.map((e, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[11px] font-medium border border-blue-500/20"
                      >
                        <strong>{e.title}:</strong> {e.email}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {branch.working_hours && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/50">
                  <Clock className="size-3 text-amber-500" /> {branch.working_hours}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Branch Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Building2 className="size-5 text-primary" />
              {editingBranch ? "Edit Branch Contact Card" : "Add New Branch / Location Contact"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure branch name, full address, working hours, and titled contact numbers/emails.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">
                Branch / Campus Title <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Main Administrative Campus / Admission Office"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Full Physical Address</Label>
              <Textarea
                placeholder="Plot / Street Address, Landmark, Campus Block..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">City</Label>
                <Input
                  placeholder="e.g. Varanasi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">State</Label>
                <Input
                  placeholder="e.g. Uttar Pradesh"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pincode</Label>
                <Input
                  placeholder="e.g. 221005"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Office Working Hours</Label>
              <Input
                placeholder="e.g. Mon - Sat: 9:00 AM - 6:00 PM IST"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="text-xs"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer p-2 rounded-lg border bg-muted/20">
              <Checkbox checked={isPrimary} onCheckedChange={(c) => setIsPrimary(Boolean(c))} />
              <span>Mark as Primary / Main Campus Headquarters</span>
            </label>

            {/* Titled Phone Numbers Section */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5 text-emerald-600">
                  <Phone className="size-3.5" />
                  Titled Phone Numbers & Helplines
                </Label>
                <Button type="button" size="sm" variant="outline" onClick={addPhone} className="h-7 text-xs gap-1">
                  <Plus className="size-3" /> Add Phone
                </Button>
              </div>

              {phones.map((phone, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Title (e.g. Admissions Helpline)"
                    value={phone.title}
                    onChange={(e) => updatePhone(idx, "title", e.target.value)}
                    className="w-2/5 text-xs h-8"
                  />
                  <Input
                    placeholder="Number (e.g. +91 9876543210)"
                    value={phone.phone}
                    onChange={(e) => updatePhone(idx, "phone", e.target.value)}
                    className="w-3/5 text-xs h-8"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePhone(idx)}
                    className="size-8 text-destructive shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Titled Email Addresses Section */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5 text-blue-600">
                  <Mail className="size-3.5" />
                  Titled Email Addresses
                </Label>
                <Button type="button" size="sm" variant="outline" onClick={addEmail} className="h-7 text-xs gap-1">
                  <Plus className="size-3" /> Add Email
                </Button>
              </div>

              {emails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Title (e.g. Admissions Office)"
                    value={email.title}
                    onChange={(e) => updateEmail(idx, "title", e.target.value)}
                    className="w-2/5 text-xs h-8"
                  />
                  <Input
                    placeholder="Email (e.g. admissions@campus.edu)"
                    value={email.email}
                    onChange={(e) => updateEmail(idx, "email", e.target.value)}
                    className="w-3/5 text-xs h-8"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEmail(idx)}
                    className="size-8 text-destructive shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={submitting}
              onClick={handleSave}
              className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
            >
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>{editingBranch ? "Save Changes" : "Add Branch Contact"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch Contact?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-xs text-muted-foreground">
            Are you sure you want to remove &quot;{deleteTarget?.branch_name}&quot;? This branch and its phone numbers will be deleted from your public contact page.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground text-xs">
              Delete Branch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

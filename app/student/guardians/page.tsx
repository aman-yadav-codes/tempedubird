"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  UsersRound,
  UserPlus,
  ShieldCheck,
  Phone,
  Mail,
  Briefcase,
  Heart,
  Trash2,
  CheckCircle2,
  Star,
  Loader2,
  RefreshCw,
  Plus,
  School,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuthStore } from "@/store";

type Guardian = {
  id: number;
  student_id: number;
  guardian_user_id: number;
  guardian_name: string;
  guardian_email: string;
  guardian_phone: string | null;
  relationship: string;
  is_primary: boolean;
  occupation?: string | null;
  created_at: string;
};

export default function StudentGuardiansPage() {
  const { user, accessToken } = useAuthStore();
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State matching Institution Admin options
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("Father");
  const [isPrimary, setIsPrimary] = useState(false);
  const [occupation, setOccupation] = useState("");

  const fetchGuardians = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/student/guardians", { headers });
      const json = await res.json();
      if (res.ok) {
        setGuardians(json.data || []);
      } else {
        toast.error(json.error || "Failed to load guardians");
      }
    } catch (err) {
      toast.error("Error loading guardian records");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchGuardians();
  }, [fetchGuardians]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setRelationship("Father");
    setIsPrimary(guardians.length === 0);
    setOccupation("");
  };

  const handleOpenDialog = () => {
    resetForm();
    setShowAddForm(guardians.length === 0);
    setDialogOpen(true);
  };

  const handleAddGuardian = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter guardian full name");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      toast.error("Please enter email address or phone number");
      return;
    }

    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/student/guardians", {
        method: "POST",
        headers,
        body: JSON.stringify({
          guardian_name: name.trim(),
          guardian_email: email.trim().toLowerCase(),
          guardian_phone: phone.trim() || null,
          relationship: relationship.trim() || "Parent / Guardian",
          is_primary: isPrimary || guardians.length === 0,
          occupation: occupation.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save guardian record");

      toast.success("Guardian record saved successfully!");
      setShowAddForm(false);
      resetForm();
      fetchGuardians();
    } catch (err: any) {
      toast.error(err.message || "Failed to add guardian");
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (linkId: number) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/student/guardians/${linkId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ is_primary: true }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update primary guardian");

      toast.success("Primary guardian contact updated!");
      fetchGuardians();
    } catch (err: any) {
      toast.error(err.message || "Failed to set primary guardian");
    }
  };

  const handleDeleteGuardian = async (guardianUserId: number) => {
    if (!confirm("Are you sure you want to remove this guardian record?")) return;

    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/student/guardians?guardianUserId=${guardianUserId}`, {
        method: "DELETE",
        headers,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to remove guardian");

      toast.success("Guardian record removed.");
      fetchGuardians();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete guardian");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Student Guardian Management</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
            <UsersRound className="h-8 w-8 text-rose-600 shrink-0" />
            My Guardians & Parents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your parent and guardian contact details. All records are synchronized directly with the Institution Admin database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={fetchGuardians} variant="outline" size="sm" className="font-bold gap-2 text-xs h-9">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={handleOpenDialog}
            size="sm"
            className="font-bold gap-2 text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span>Manage Guardians</span>
          </Button>
        </div>
      </div>

      {/* GUARDIANS GRID */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
          <span className="text-sm font-medium">Loading guardian records...</span>
        </div>
      ) : guardians.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground space-y-4 bg-card border-border">
          <div className="p-4 bg-rose-500/10 text-rose-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <UsersRound className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-foreground">No Guardians Linked Yet</h3>
            <p className="text-xs max-w-md mx-auto leading-relaxed">
              You have not added any parent or guardian records. Click the button below to add your primary parent or guardian.
            </p>
          </div>
          <Button
            onClick={handleOpenDialog}
            className="font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white px-6 mt-2"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Guardian
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {guardians.length} {guardians.length === 1 ? "Guardian Linked" : "Guardians Linked"}
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {guardians.map((g) => (
              <Card
                key={g.id}
                className="p-6 space-y-5 bg-card border-border shadow-sm hover:border-border/80 transition-all rounded-2xl relative overflow-hidden flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Header info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-lg flex items-center justify-center shrink-0 border border-rose-500/20">
                        {g.guardian_name ? g.guardian_name[0].toUpperCase() : "G"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            {g.relationship || "Guardian"}
                          </Badge>
                          {g.is_primary && (
                            <Badge className="text-[10px] font-extrabold bg-emerald-600 text-white">
                              Primary Guardian
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-extrabold text-base text-foreground truncate mt-1">
                          {g.guardian_name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2 text-xs">
                    {g.guardian_email && (
                      <div className="flex items-center gap-2 text-muted-foreground truncate">
                        <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{g.guardian_email}</span>
                      </div>
                    )}
                    {g.guardian_phone && (
                      <div className="flex items-center gap-2 text-muted-foreground truncate">
                        <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{g.guardian_phone}</span>
                      </div>
                    )}
                    {g.occupation && (
                      <div className="flex items-center gap-2 text-muted-foreground truncate">
                        <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{g.occupation}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                  {!g.is_primary ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimary(g.id)}
                      className="text-xs font-bold h-8 text-muted-foreground hover:text-foreground"
                    >
                      <Star className="h-3.5 w-3.5 mr-1 text-amber-500" />
                      Set as Primary
                    </Button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Primary Contact
                    </span>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGuardian(g.guardian_user_id)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 px-2.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* MANAGE GUARDIANS DIALOG (EXACT SAME OPTIONS AS INSTITUTION ADMIN) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border p-6 shadow-2xl rounded-2xl">
          <DialogHeader className="space-y-1.5 border-b border-border pb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <UsersRound className="h-5 w-5 text-rose-600" />
              Manage Guardians: {user?.full_name || "My Profile"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Guardians records are stored in the shared student guardians table and linked directly to your student profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* List of existing guardians */}
            {guardians.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Existing Guardian Contacts ({guardians.length})
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {guardians.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/30 hover:border-rose-500/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{g.guardian_name}</span>
                          <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold">
                            {g.relationship}
                          </Badge>
                          {g.is_primary && (
                            <Badge className="text-[10px] font-extrabold bg-emerald-600 text-white">
                              Primary Guardian
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {g.guardian_email} {g.guardian_phone ? `• ${g.guardian_phone}` : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGuardian(g.guardian_user_id)}
                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Guardian Form (Exact same fields as Institution Admin) */}
            {showAddForm ? (
              <div className="rounded-xl border border-rose-500/30 p-4 bg-muted/30 space-y-3.5 mt-3">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-rose-600" /> Add Guardian Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Full Name *</Label>
                    <Input
                      className="text-xs h-9 bg-background"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Sharma"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Email Address *</Label>
                    <Input
                      type="email"
                      className="text-xs h-9 bg-background"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ramesh@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Phone Number</Label>
                    <Input
                      type="tel"
                      className="text-xs h-9 bg-background"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Relationship</Label>
                    <Select value={relationship} onValueChange={setRelationship}>
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Father">Father</SelectItem>
                        <SelectItem value="Mother">Mother</SelectItem>
                        <SelectItem value="Guardian">Legal Guardian</SelectItem>
                        <SelectItem value="Brother">Brother</SelectItem>
                        <SelectItem value="Sister">Sister</SelectItem>
                        <SelectItem value="Uncle">Uncle</SelectItem>
                        <SelectItem value="Aunt">Aunt</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Occupation (Optional)</Label>
                  <Input
                    className="text-xs h-9 bg-background"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. Engineer, Business, Doctor"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is-primary-student-guardian"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <Label htmlFor="is-primary-student-guardian" className="text-xs cursor-pointer font-medium">
                    Set as Primary Contact / Guardian
                  </Label>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                  {guardians.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)} className="text-xs h-8">
                      Cancel
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleAddGuardian}
                    disabled={saving}
                    className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Save Guardian Record
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs font-bold h-9 border-dashed border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add Another Guardian
              </Button>
            )}
          </div>

          <DialogFooter className="border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="text-xs font-bold">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

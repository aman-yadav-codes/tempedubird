"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, PhoneCall, UserCheck, ShieldCheck, Mail, Phone, Contact } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { readJsonResponse } from "@/lib/api/read-json-response";
import { useProgressiveSave } from "@/hooks/use-progressive-save";
import { ProgressiveSaveIndicator } from "@/components/shared/progressive-save-indicator";
import type { Student } from "../columns";

type GuardianRecord = {
  id: number;
  student_id: number;
  guardian_user_id: number;
  guardian_name: string;
  guardian_email: string;
  guardian_phone: string | null;
  relationship: string;
  is_primary: boolean;
  occupation?: string | null;
};

type StudentGuardiansDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  accessToken: string | null;
};

export function StudentGuardiansDialog({
  open,
  onOpenChange,
  student,
  accessToken,
}: StudentGuardiansDialogProps) {
  const [guardians, setGuardians] = useState<GuardianRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states for new guardian / contact
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("Father");
  const [isPrimary, setIsPrimary] = useState(false);
  const [occupation, setOccupation] = useState("");

  const guardianFormState = { name, email, phone, relationship, occupation };
  const guardianFormKey = `guardian:${student?.id ?? "new"}`;
  const { saveStatus, handleBlur } = useProgressiveSave({
    formKey: guardianFormKey,
    formState: guardianFormState,
    enabled: open && showAddForm,
  });

  const fetchGuardians = useCallback(async () => {
    if (!student?.id || !accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${student.id}/guardians`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJsonResponse<{ data?: GuardianRecord[]; error?: string }>(res);
      if (res.ok) {
        setGuardians(json.data || []);
      } else {
        toast.error(json.error || "Failed to load contact details");
      }
    } catch (err) {
      console.error("Error fetching guardians:", err);
      toast.error("Failed to load contact details.");
    } finally {
      setLoading(false);
    }
  }, [student?.id, accessToken]);

  useEffect(() => {
    if (open && student) {
      fetchGuardians();
      setShowAddForm(false);
      resetForm();
    }
  }, [open, student, fetchGuardians]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setRelationship("Father");
    setIsPrimary(guardians.length === 0);
    setOccupation("");
  };

  const handleAddGuardian = async () => {
    if (!name.trim()) {
      toast.error("Contact full name is required.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("A valid Email Address is required for guardian notifications.");
      return;
    }
    if (!student?.id || !accessToken) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/students/${student.id}/guardians`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guardian_name: name.trim(),
          guardian_email: email.trim().toLowerCase(),
          guardian_phone: phone.trim() || null,
          relationship,
          is_primary: isPrimary,
          occupation: occupation.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save contact details");

      toast.success("Contact details saved successfully!");
      setShowAddForm(false);
      resetForm();
      fetchGuardians();
    } catch (err: any) {
      toast.error(err.message || "Failed to save contact details");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGuardian = async (guardianUserId: number) => {
    if (!confirm("Are you sure you want to remove this contact record?")) return;
    if (!student?.id || !accessToken) return;

    try {
      const res = await fetch(`/api/admin/students/${student.id}/guardians?guardianUserId=${guardianUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete contact record");

      toast.success("Contact record removed.");
      fetchGuardians();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete contact");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <PhoneCall className="h-5 w-5 text-primary" />
            Contact Details: {student?.full_name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Manage guardian contacts, email addresses, and emergency phone numbers for this student.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* List of existing guardians */}
            {guardians.length === 0 && !showAddForm ? (
              <div className="text-center py-8 border rounded-xl bg-muted/20">
                <Contact className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No guardian or contact details added yet.</p>
                <Button size="sm" className="mt-3 gap-1.5 font-bold text-xs" onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4" /> Add Contact Details
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {guardians.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border bg-card hover:border-primary/40 transition-colors shadow-2xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{g.guardian_name}</span>
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary font-bold">
                          {g.relationship}
                        </Badge>
                        {g.is_primary && (
                          <Badge variant="default" className="text-xs bg-emerald-600 text-white font-bold">
                            Primary Contact
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-2">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /> {g.guardian_email}</span>
                        {g.guardian_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /> {g.guardian_phone}</span>}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGuardian(g.guardian_user_id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Guardian Form */}
            {showAddForm ? (
              <div className="rounded-xl border p-4 bg-muted/30 space-y-3.5 mt-4">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-primary" /> Add Contact Details
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Full Name *</Label>
                    <Input
                      required
                      className="text-sm h-9 rounded-lg"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Sharma"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Email Address *</Label>
                    <Input
                      required
                      type="email"
                      className="text-sm h-9 rounded-lg"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ramesh@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Phone Number</Label>
                    <Input
                      type="tel"
                      className="text-sm h-9 rounded-lg"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Relationship</Label>
                    <Select value={relationship} onValueChange={setRelationship}>
                      <SelectTrigger className="h-9 text-sm rounded-lg">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Self">Self</SelectItem>
                        <SelectItem value="Father">Father</SelectItem>
                        <SelectItem value="Mother">Mother</SelectItem>
                        <SelectItem value="Guardian">Legal Guardian</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is-primary-guardian"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary cursor-pointer"
                  />
                  <Label htmlFor="is-primary-guardian" className="text-xs cursor-pointer font-medium">
                    Set as Primary Contact
                  </Label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddGuardian} disabled={saving} className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save Contact Details
                  </Button>
                </div>
              </div>
            ) : (
              guardians.length > 0 && (
                <Button variant="outline" size="sm" className="w-full mt-2 gap-1.5 font-bold text-xs h-9 rounded-lg" onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4" /> Add Another Contact
                </Button>
              )
            )}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <ProgressiveSaveIndicator status={saveStatus} />
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

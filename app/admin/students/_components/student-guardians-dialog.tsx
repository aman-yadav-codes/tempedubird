"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, UsersRound, UserCheck, ShieldCheck } from "lucide-react";
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

  // Form states for new guardian
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
        toast.error(json.error || "Failed to load guardians");
      }
    } catch (err) {
      console.error("Error fetching guardians:", err);
      toast.error("Failed to load guardians.");
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
    if (!name.trim() || !email.trim()) {
      toast.error("Guardian name and email are required.");
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
      if (!res.ok) throw new Error(json.error || "Failed to add guardian");

      toast.success("Guardian record saved successfully!");
      setShowAddForm(false);
      resetForm();
      fetchGuardians();
    } catch (err: any) {
      toast.error(err.message || "Failed to add guardian record");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGuardian = async (guardianUserId: number) => {
    if (!confirm("Are you sure you want to remove this guardian record?")) return;
    if (!student?.id || !accessToken) return;

    try {
      const res = await fetch(`/api/admin/students/${student.id}/guardians?guardianUserId=${guardianUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete guardian");

      toast.success("Guardian record removed.");
      fetchGuardians();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete guardian");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />
            Manage Guardians: {student?.full_name}
          </DialogTitle>
          <DialogDescription>
            Guardians records are stored in a separate table and linked to the student profile.
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
              <div className="text-center py-8 border rounded-lg bg-muted/20">
                <UsersRound className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No guardians added for this student yet.</p>
                <Button size="sm" className="mt-3" onClick={() => setShowAddForm(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add Guardian
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {guardians.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{g.guardian_name}</span>
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                          {g.relationship}
                        </Badge>
                        {g.is_primary && (
                          <Badge variant="default" className="text-xs bg-green-600 text-white">
                            Primary Guardian
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{g.guardian_email} {g.guardian_phone ? `• ${g.guardian_phone}` : ""}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGuardian(g.guardian_user_id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Guardian Form */}
            {showAddForm ? (
              <div className="rounded-lg border p-4 bg-muted/30 space-y-3 mt-4">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-primary" /> Add Guardian Details
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Full Name *</Label>
                    <Input
                      size={1}
                      className="text-sm"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Sharma"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email Address *</Label>
                    <Input
                      size={1}
                      type="email"
                      className="text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ramesh@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Phone Number</Label>
                    <Input
                      size={1}
                      className="text-sm"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Relationship</Label>
                    <Select value={relationship} onValueChange={setRelationship}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
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
                    className="h-4 w-4 rounded border-gray-300 text-primary"
                  />
                  <Label htmlFor="is-primary-guardian" className="text-xs cursor-pointer">
                    Set as Primary Contact / Guardian
                  </Label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddGuardian} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                    Save Guardian Record
                  </Button>
                </div>
              </div>
            ) : (
              guardians.length > 0 && (
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setShowAddForm(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add Another Guardian
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

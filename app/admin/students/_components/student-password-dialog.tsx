"use client";

import { useState } from "react";
import { KeyRound, Loader2, Lock } from "lucide-react";
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
import type { Student } from "../columns";

type StudentPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  accessToken: string | null;
};

export function StudentPasswordDialog({
  open,
  onOpenChange,
  student,
  accessToken,
}: StudentPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSavePassword = async () => {
    if (!password) {
      toast.error("Please enter a new password.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!student?.id || !accessToken) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${student.id}/password`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update password");

      toast.success(`Password for ${student.full_name} updated successfully!`);
      setPassword("");
      setConfirmPassword("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Set Student Password: {student?.full_name}
          </DialogTitle>
          <DialogDescription>
            Update the login password for {student?.email || "this student account"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="student-new-password">New Password *</Label>
            <Input
              id="student-new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password (min. 6 characters)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="student-confirm-password">Confirm New Password *</Label>
            <Input
              id="student-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSavePassword} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Update Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2, RefreshCw } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let rand = "";
    for (let i = 0; i < 8; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const generated = `Student#${rand}`;
    setPassword(generated);
    setConfirmPassword(generated);
    setCopied(false);
    toast.info("Generated new student password");
  };

  const handleCopyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success("Password copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePassword = async () => {
    if (!password) {
      toast.error("Please enter or generate a new password.");
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
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
            Generate Password: {student?.full_name}
          </DialogTitle>
          <DialogDescription>
            Set or generate a new login password for student {student?.email || "account"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Random Generate Button */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
            <div className="text-xs text-muted-foreground">
              Generate a secure student login password.
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateRandomPassword}
              className="gap-1.5 font-bold text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Generate Password
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="student-new-password">New Password *</Label>
              {password && (
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy Password"}
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="student-new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter or generate password"
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="student-confirm-password">Confirm New Password *</Label>
            <Input
              id="student-confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSavePassword} disabled={saving} className="font-bold">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Save Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

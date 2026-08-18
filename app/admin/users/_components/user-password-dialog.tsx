"use client";

import { useState } from "react";
import { KeyRound, Loader2, RefreshCw, Copy, Check, Eye, EyeOff } from "lucide-react";
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
import type { User } from "../columns";

type UserPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  accessToken: string | null;
};

export function UserPasswordDialog({
  open,
  onOpenChange,
  user,
  accessToken,
}: UserPasswordDialogProps) {
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
    const generated = `EduBird#${rand}`;
    setPassword(generated);
    setConfirmPassword(generated);
    setCopied(false);
    toast.info("Generated new random password");
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
    if (!user?.id || !accessToken) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/password?id=${user.id}`, {
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

      toast.success(`Password for ${user.full_name} updated successfully!`);
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
            <KeyRound className="h-5 w-5 text-red-600" />
            Generate Password: {user?.full_name}
          </DialogTitle>
          <DialogDescription>
            Set or generate a new login password for {user?.email || "this user"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Random Generate Button */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
            <div className="text-xs text-muted-foreground">
              Need a strong password? Click to auto-generate.
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
              <Label htmlFor="user-new-password">New Password *</Label>
              {password && (
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="flex items-center gap-1 text-xs text-[#800000] font-semibold hover:underline"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy Password"}
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="user-new-password"
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
            <Label htmlFor="user-confirm-password">Confirm Password *</Label>
            <Input
              id="user-confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSavePassword}
            disabled={saving}
            className="bg-[#800000] hover:bg-[#600000] text-white font-bold"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Save Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

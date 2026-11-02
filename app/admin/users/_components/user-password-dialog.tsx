"use client";

import { useState, useEffect } from "react";
import {
  KeyRound,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Mail,
  Phone,
  Lock,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import type { User } from "../columns";

type UserPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  accessToken: string | null;
  onSaved?: () => void;
};

export function UserPasswordDialog({
  open,
  onOpenChange,
  user,
  accessToken,
  onSaved,
}: UserPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  useEffect(() => {
    if (open && user) {
      const initial = user.generated_password || "";
      setPassword(initial);
      setConfirmPassword(initial);
      setCopied(false);
      setCopiedAll(false);
    }
  }, [open, user]);

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
    toast.info("Generated new strong password");
  };

  const handleCopyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success("Password copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCredentials = () => {
    if (!user || !password) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const portalUrl = `${origin}/login`;
    const textToCopy = `Staff Portal Access Credentials:
Staff Name: ${user.full_name}
Role / Designation: ${(user.roles || []).join(", ") || "Staff"}
Login Email: ${user.email} (Primary username)
Login Phone: ${user.phone || "Not configured"} (Alternative username)
Password: ${password}
Portal URL: ${portalUrl}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedAll(true);
    toast.success("Staff portal login credentials copied to clipboard!");
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleSavePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

      toast.success(`Password for ${user.full_name} saved successfully!`);
      if (onSaved) onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const hasExistingPassword = Boolean(user?.generated_password);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[95vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <KeyRound className="h-5 w-5 text-primary" />
            <span>Generate Staff Credentials: {user?.full_name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Generate or manage portal login credentials for{" "}
            <strong className="text-foreground">{user?.full_name}</strong>. Staff can log in with
            their primary email or phone number.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSavePassword} className="space-y-4 py-2">
          {/* Active Saved Account Banner */}
          {hasExistingPassword && (
            <div className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Active Staff Portal Credentials Found
                </p>
                <p className="text-muted-foreground text-[11px]">
                  This staff member already has portal access. You can view, copy, or reset their password below.
                </p>
              </div>
            </div>
          )}

          {/* User Details Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-xl border text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3 text-primary" />
                <span>Login Email (Primary)</span>
              </Label>
              <div className="font-mono font-medium text-foreground truncate bg-background px-2.5 py-1.5 rounded-lg border">
                {user?.email || "No email set"}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>Login Phone (Alternative)</span>
              </Label>
              <div className="font-mono font-medium text-foreground truncate bg-background px-2.5 py-1.5 rounded-lg border">
                {user?.phone || "No phone set"}
              </div>
            </div>

            {user?.roles && user.roles.length > 0 && (
              <div className="sm:col-span-2 pt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-muted-foreground">Assigned Roles:</span>
                {user.roles.map((r, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0 capitalize">
                    {r}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Auto-Generate Button Card */}
          <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/40">
            <div>
              <p className="text-xs font-semibold text-foreground">Need a secure password?</p>
              <p className="text-[11px] text-muted-foreground">Click to auto-generate a strong randomized password.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateRandomPassword}
              className="gap-1.5 font-bold text-xs border-primary/40 text-primary hover:bg-primary/10 shadow-2xs shrink-0 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Generate Strong Password
            </Button>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Staff Password *</Label>
              {password && (
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="flex items-center gap-1 text-[11px] text-primary font-semibold hover:underline cursor-pointer"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy Password Only"}
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setConfirmPassword(e.target.value);
                }}
                placeholder="Enter or generate staff password"
                className="pl-9 pr-10 font-mono text-xs h-9 bg-background"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Portal Login Summary Card with 1-Click Copy */}
          {password && (
            <div className="p-3.5 rounded-xl bg-muted/40 border text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Portal Login Summary</span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCredentials}
                  className="h-7 px-2.5 text-[11px] font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer shadow-2xs"
                >
                  {copiedAll ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied All!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full Credentials</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="font-mono text-[11px] bg-background p-2.5 rounded-lg border space-y-1 text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">Email: </span>
                  {user?.email}
                </div>
                {user?.phone && (
                  <div>
                    <span className="font-semibold text-foreground">Phone: </span>
                    {user.phone}
                  </div>
                )}
                <div>
                  <span className="font-semibold text-foreground">Password: </span>
                  <span className="font-bold text-primary">{password}</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">Portal URL: </span>
                  <span className="text-blue-600 underline">
                    {typeof window !== "undefined" ? window.location.origin : ""}/login
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs cursor-pointer shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving Password...
                </>
              ) : (
                <>
                  <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Save Credentials
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

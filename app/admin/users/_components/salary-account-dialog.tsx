"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Landmark,
  Building2,
  CreditCard,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/app/admin/users/columns";
import type { AdminUserDetails } from "@/lib/queries/user";

export interface SalaryAccountFormState {
  payment_mode: string;
  account_type: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name: string;
  upi_id: string;
  pan_number: string;
  uan_number: string;
  esi_number: string;
  salary_notes: string;
}

const DEFAULT_STATE: SalaryAccountFormState = {
  payment_mode: "BANK_TRANSFER",
  account_type: "SALARY",
  bank_name: "",
  account_holder_name: "",
  account_number: "",
  ifsc_code: "",
  branch_name: "",
  upi_id: "",
  pan_number: "",
  uan_number: "",
  esi_number: "",
  salary_notes: "",
};

interface SalaryAccountDialogProps {
  user: User | AdminUserDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
  onSaved?: () => void;
}

export function SalaryAccountDialog({
  user,
  open,
  onOpenChange,
  accessToken,
  onSaved,
}: SalaryAccountDialogProps) {
  const [form, setForm] = useState<SalaryAccountFormState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !user) {
      setForm(DEFAULT_STATE);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    async function loadAccountDetails() {
      try {
        const res = await fetch(`/api/admin/users/${user?.id}`, {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load employee details");
        }

        const data = await res.json();
        const profile = data?.data?.profile || data?.profile || {};

        if (isMounted) {
          setForm({
            payment_mode: profile.payment_mode || "BANK_TRANSFER",
            account_type: profile.account_type || "SALARY",
            bank_name: profile.bank_name || "",
            account_holder_name: profile.account_holder_name || user?.full_name || "",
            account_number: profile.account_number || "",
            ifsc_code: profile.ifsc_code || "",
            branch_name: profile.branch_name || "",
            upi_id: profile.upi_id || "",
            pan_number: profile.pan_number || "",
            uan_number: profile.uan_number || "",
            esi_number: profile.esi_number || "",
            salary_notes: profile.salary_notes || "",
          });
        }
      } catch (err) {
        console.error("Error loading salary account details:", err);
        if (isMounted) {
          setForm({
            ...DEFAULT_STATE,
            account_holder_name: user.full_name || "",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAccountDetails();

    return () => {
      isMounted = false;
    };
  }, [open, user, accessToken]);

  const isDisbursementReady = Boolean(
    form.account_number.trim() &&
    (form.payment_mode === "UPI" ? form.upi_id.trim() : form.ifsc_code.trim())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    startTransition(async () => {
      try {
        const payload = {
          salary_account: {
            payment_mode: form.payment_mode,
            account_type: form.account_type,
            bank_name: form.bank_name.trim(),
            account_holder_name: form.account_holder_name.trim(),
            account_number: form.account_number.trim(),
            ifsc_code: form.ifsc_code.trim().toUpperCase(),
            branch_name: form.branch_name.trim(),
            upi_id: form.upi_id.trim().toLowerCase(),
            pan_number: form.pan_number.trim().toUpperCase(),
            uan_number: form.uan_number.trim(),
            esi_number: form.esi_number.trim(),
          },
          salary_notes: form.salary_notes.trim(),
        };

        const res = await fetch(`/api/admin/users/${user.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.message || json.error || "Failed to update salary account details");
        }

        toast.success(`Salary account for ${user.full_name} updated successfully`);
        onSaved?.();
        onOpenChange(false);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Something went wrong saving salary account");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  Salary Account & Bank Details
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Direct salary disbursement account and statutory numbers for{" "}
                  <span className="font-semibold text-foreground">{user?.full_name}</span>
                </DialogDescription>
              </div>
            </div>

            {isDisbursementReady ? (
              <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                Disbursement Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300">
                <AlertCircle className="h-3 w-3 mr-1 text-amber-600" />
                Setup Pending
              </Badge>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading salary account details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3.5">
              {/* Payment Mode & Account Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Disbursement / Payment Method</Label>
                  <Select
                    value={form.payment_mode}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, payment_mode: val }))}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Select Payment Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">🏦 Direct Bank Transfer (NEFT / RTGS / IMPS)</SelectItem>
                      <SelectItem value="UPI">📱 UPI / VPA Transfer</SelectItem>
                      <SelectItem value="CHEQUE">📝 Company Cheque</SelectItem>
                      <SelectItem value="CASH">💵 Cash Disbursement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Account Type</Label>
                  <Select
                    value={form.account_type}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, account_type: val }))}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Select Account Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SALARY">💼 Salary Account (Zero Balance)</SelectItem>
                      <SelectItem value="SAVINGS">🏦 Savings Account</SelectItem>
                      <SelectItem value="CURRENT">🏢 Current Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bank Name & Account Holder Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bank Name</Label>
                  <Input
                    placeholder="e.g. State Bank of India, HDFC, ICICI..."
                    value={form.bank_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                    className="h-9 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Account Holder Name</Label>
                  <Input
                    placeholder="Full name as per bank records"
                    value={form.account_holder_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, account_holder_name: e.target.value }))}
                    className="h-9 text-xs bg-background"
                  />
                </div>
              </div>

              {/* Account Number & IFSC Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bank Account Number</Label>
                  <Input
                    placeholder="e.g. 12345678901234"
                    value={form.account_number}
                    onChange={(e) => setForm((prev) => ({ ...prev, account_number: e.target.value }))}
                    className="h-9 text-xs bg-background font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">IFSC Code</Label>
                  <Input
                    placeholder="e.g. SBIN0001234"
                    value={form.ifsc_code}
                    onChange={(e) => setForm((prev) => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))}
                    className="h-9 text-xs bg-background uppercase font-mono"
                  />
                </div>
              </div>

              {/* Branch Name & UPI ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Branch Name / Location</Label>
                  <Input
                    placeholder="e.g. Connaught Place, New Delhi"
                    value={form.branch_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, branch_name: e.target.value }))}
                    className="h-9 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">UPI ID / VPA (Optional)</Label>
                  <Input
                    placeholder="e.g. staff@okhdfcbank / 9876543210@paytm"
                    value={form.upi_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, upi_id: e.target.value.toLowerCase().trim() }))}
                    className="h-9 text-xs bg-background font-mono"
                  />
                </div>
              </div>

              {/* Statutory Compliance Identifiers: PAN, UAN/PF, ESI */}
              <div className="pt-2 border-t border-border/60">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Statutory Identification (PAN / PF / ESI)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">PAN Card Number</Label>
                    <Input
                      placeholder="e.g. ABCDE1234F"
                      maxLength={10}
                      value={form.pan_number}
                      onChange={(e) => setForm((prev) => ({ ...prev, pan_number: e.target.value.toUpperCase().trim() }))}
                      className="h-9 text-xs bg-background uppercase font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">EPF / UAN Number</Label>
                    <Input
                      placeholder="12-digit UAN"
                      maxLength={12}
                      value={form.uan_number}
                      onChange={(e) => setForm((prev) => ({ ...prev, uan_number: e.target.value.trim() }))}
                      className="h-9 text-xs bg-background font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">ESI Number</Label>
                    <Input
                      placeholder="17-digit ESI Number"
                      maxLength={17}
                      value={form.esi_number}
                      onChange={(e) => setForm((prev) => ({ ...prev, esi_number: e.target.value.trim() }))}
                      className="h-9 text-xs bg-background font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Salary Remarks */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Salary Terms & Remarks (Optional)</Label>
              <Textarea
                placeholder="Bank details, probation terms, revision period, appraisal notes..."
                value={form.salary_notes}
                onChange={(e) => setForm((prev) => ({ ...prev, salary_notes: e.target.value }))}
                className="min-h-[70px] text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save Salary Account
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  BadgeDollarSign,
  CheckCircle2,
  DollarSign,
  Loader2,
  Percent,
  Plus,
  Trash2,
  X,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type CommissionRule = {
  trigger_condition: string;
  reward_type: "PERCENTAGE" | "FIXED_AMOUNT";
  commission_rate: number;
  threshold?: string;
  notes?: string;
};

export type StaffCommissionData = {
  commission_type: "RULES_BASED" | "PERCENTAGE" | "FIXED_AMOUNT" | "NONE";
  commission_rate?: number | string | null;
  commission_trigger?: string;
  minimum_threshold?: number | string | null;
  payout_frequency?: string;
  notes?: string | null;
  rules?: CommissionRule[];
};

type StaffCommissionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffUser: { id: number; full_name: string } | null;
  accessToken: string | null;
  onSaved?: () => void;
};

export function StaffCommissionDialog({
  open,
  onOpenChange,
  staffUser,
  accessToken,
  onSaved,
}: StaffCommissionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commission, setCommission] = useState<StaffCommissionData>({
    commission_type: "RULES_BASED",
    commission_rate: 10,
    commission_trigger: "course_admission",
    minimum_threshold: "",
    payout_frequency: "MONTHLY",
    notes: "",
    rules: [
      {
        trigger_condition: "Successful Student Enrollment / Admission",
        reward_type: "PERCENTAGE",
        commission_rate: 10,
        threshold: "",
        notes: "",
      },
    ],
  });

  useEffect(() => {
    if (!open || !staffUser?.id || !accessToken) return;

    const fetchCommission = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/staff/commission?staffUserId=${staffUser.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const j = await res.json();
          if (j.data) {
            setCommission({
              commission_type: j.data.commission_type || "RULES_BASED",
              commission_rate: j.data.commission_rate ?? 10,
              commission_trigger: j.data.commission_trigger || "course_admission",
              minimum_threshold: j.data.minimum_threshold || "",
              payout_frequency: j.data.payout_frequency || "MONTHLY",
              notes: j.data.notes || "",
              rules: Array.isArray(j.data.rules) && j.data.rules.length > 0 ? j.data.rules : [
                {
                  trigger_condition: "Successful Student Enrollment / Admission",
                  reward_type: "PERCENTAGE",
                  commission_rate: 10,
                  threshold: "",
                  notes: "",
                },
              ],
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchCommission();
  }, [open, staffUser?.id, accessToken]);

  const handleSave = async () => {
    if (!staffUser?.id || !accessToken) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/staff/commission", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffUserId: staffUser.id,
          commission,
        }),
      });

      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Failed to save commission structure");
      }

      toast.success("Commission & Incentive Structure saved successfully");
      onOpenChange(false);
      onSaved?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save commission");
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    setCommission((prev) => ({
      ...prev,
      rules: [
        ...(prev.rules || []),
        {
          trigger_condition: "Course / Service Sale",
          reward_type: "PERCENTAGE",
          commission_rate: 5,
          threshold: "",
          notes: "",
        },
      ],
    }));
  };

  const removeRule = (index: number) => {
    setCommission((prev) => ({
      ...prev,
      rules: (prev.rules || []).filter((_, i) => i !== index),
    }));
  };

  const updateRule = (index: number, patch: Partial<CommissionRule>) => {
    setCommission((prev) => {
      const updated = [...(prev.rules || [])];
      if (updated[index]) {
        updated[index] = { ...updated[index], ...patch };
      }
      return { ...prev, rules: updated };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeDollarSign className="size-5 text-primary" />
            Commission & Incentive Structure
          </DialogTitle>
          <DialogDescription>
            Configure commission rules, lead incentives, admission rewards, and payout terms for{" "}
            <span className="font-semibold text-foreground">{staffUser?.full_name}</span>.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Model Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Commission Model</Label>
              <Select
                value={commission.commission_type}
                onValueChange={(val: any) =>
                  setCommission((prev) => ({ ...prev, commission_type: val }))
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RULES_BASED">Condition-Based Rules (Enrollment, Leads, Fees, Custom)</SelectItem>
                  <SelectItem value="PERCENTAGE">Flat Percentage (%) on All Admissions</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Flat Fixed Amount (₹) per Admission</SelectItem>
                  <SelectItem value="NONE">No Commission (Standard Salary Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Flat Percentage */}
            {commission.commission_type === "PERCENTAGE" && (
              <div className="rounded-lg border p-4 bg-muted/10 space-y-2">
                <Label className="text-xs font-semibold">Flat Commission Rate (%)</Label>
                <div className="relative max-w-xs">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={commission.commission_rate ?? ""}
                    onChange={(e) =>
                      setCommission((prev) => ({
                        ...prev,
                        commission_rate: e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                    placeholder="e.g. 10"
                    className="h-9 text-xs pr-8"
                  />
                  <Percent className="size-3.5 absolute right-2.5 top-3 text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Flat Fixed Amount */}
            {commission.commission_type === "FIXED_AMOUNT" && (
              <div className="rounded-lg border p-4 bg-muted/10 space-y-2">
                <Label className="text-xs font-semibold">Fixed Commission Amount (₹)</Label>
                <div className="relative max-w-xs">
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={commission.commission_rate ?? ""}
                    onChange={(e) =>
                      setCommission((prev) => ({
                        ...prev,
                        commission_rate: e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                    placeholder="e.g. 500"
                    className="h-9 text-xs pr-8"
                  />
                  <DollarSign className="size-3.5 absolute right-2.5 top-3 text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Condition-Based Rules */}
            {commission.commission_type === "RULES_BASED" && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Condition-Specific Rules</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addRule} className="h-7 text-xs gap-1">
                    <Plus className="size-3.5" /> Add Rule
                  </Button>
                </div>

                <div className="space-y-3">
                  {(commission.rules || []).map((rule, idx) => (
                    <div key={idx} className="rounded-lg border bg-card p-3 space-y-2 text-xs relative shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-primary">RULE #{idx + 1}</span>
                        {(commission.rules || []).length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeRule(idx)}
                            className="text-destructive h-6 w-6"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-1 space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Trigger Condition</Label>
                          <Input
                            value={rule.trigger_condition}
                            onChange={(e) => updateRule(idx, { trigger_condition: e.target.value })}
                            placeholder="e.g. Enrollment / Lead"
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Reward Type</Label>
                          <Select
                            value={rule.reward_type}
                            onValueChange={(val: any) => updateRule(idx, { reward_type: val })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PERCENTAGE">% Percentage</SelectItem>
                              <SelectItem value="FIXED_AMOUNT">₹ Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            {rule.reward_type === "PERCENTAGE" ? "Rate (%)" : "Amount (₹)"}
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={rule.commission_rate ?? ""}
                            onChange={(e) => updateRule(idx, { commission_rate: Number(e.target.value) || 0 })}
                            placeholder={rule.reward_type === "PERCENTAGE" ? "10" : "500"}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <Input
                          value={rule.threshold || ""}
                          onChange={(e) => updateRule(idx, { threshold: e.target.value })}
                          placeholder="Condition threshold (e.g. Min 5 leads)"
                          className="h-8 text-xs"
                        />
                        <Input
                          value={rule.notes || ""}
                          onChange={(e) => updateRule(idx, { notes: e.target.value })}
                          placeholder="Rule notes / eligibility conditions..."
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payout Terms & Notes */}
            {commission.commission_type !== "NONE" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Payout Terms</Label>
                  <Select
                    value={commission.payout_frequency || "MONTHLY"}
                    onValueChange={(val) => setCommission((prev) => ({ ...prev, payout_frequency: val }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly with Salary</SelectItem>
                      <SelectItem value="ON_APPROVAL">Immediately upon Transaction Approval</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly Payout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Minimum Eligibility Threshold (₹ optional)</Label>
                  <Input
                    type="number"
                    value={commission.minimum_threshold || ""}
                    onChange={(e) => setCommission((prev) => ({ ...prev, minimum_threshold: e.target.value }))}
                    placeholder="e.g. 10000"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold">Special Terms & Notes</Label>
                  <Textarea
                    value={commission.notes || ""}
                    onChange={(e) => setCommission((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter any additional commission terms or agreements..."
                    className="text-xs resize-none"
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t pt-3 sm:justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || loading} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Save Commission Structure
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

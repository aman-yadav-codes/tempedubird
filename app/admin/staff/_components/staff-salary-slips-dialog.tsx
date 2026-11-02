"use client";

import { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Download,
  ExternalLink,
  Printer,
  Calendar,
  Loader2,
  Plus,
  Building2,
  FileCheck,
  CheckCircle2,
  Pencil,
  Trash2,
  Eye,
  IndianRupee,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveInstitution } from "@/hooks/use-active-institution";

type SalarySlipItem = {
  id: number;
  institution_id: number;
  institution_name?: string;
  staff_user_id: number;
  full_name: string;
  email?: string;
  title: string;
  letter_type: string;
  rendered_html?: string;
  field_values?: {
    month?: string;
    month_name?: string;
    gross_salary?: number;
    deductions?: number;
    net_salary?: number;
    earnings?: { name: string; amount: number }[];
    deductions_list?: { name: string; amount: number }[];
    notes?: string;
    [key: string]: any;
  };
  salary_month?: string;
  gross_salary?: number;
  deductions?: number;
  net_salary?: number;
  created_at: string;
  file_url?: string;
};

type StaffSalarySlipsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffUser: { id: number; full_name: string; email?: string } | null;
  accessToken: string | null;
};

export function StaffSalarySlipsDialog({
  open,
  onOpenChange,
  staffUser,
  accessToken,
}: StaffSalarySlipsDialogProps) {
  const { activeInstitutionId } = useActiveInstitution();
  const [loading, setLoading] = useState(false);
  const [slips, setSlips] = useState<SalarySlipItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Preview State
  const [previewSlip, setPreviewSlip] = useState<SalarySlipItem | null>(null);

  // Edit State
  const [editingSlip, setEditingSlip] = useState<SalarySlipItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editEarnings, setEditEarnings] = useState<{ name: string; amount: number }[]>([]);
  const [editDeductions, setEditDeductions] = useState<{ name: string; amount: number }[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadSlips = async () => {
    if (!staffUser || !accessToken) return;
    try {
      const instQuery = activeInstitutionId ? `&institutionId=${activeInstitutionId}` : "";
      const res = await fetch(
        `/api/admin/staff/salary-slips?staffUserId=${staffUser.id}${instQuery}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setSlips(json.data);
      }
    } catch (err) {
      console.error("Failed to load salary slips:", err);
    }
  };

  useEffect(() => {
    if (!open || !staffUser || !accessToken) return;

    let isMounted = true;
    setLoading(true);

    loadSlips().finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [open, staffUser, accessToken, activeInstitutionId]);

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });

  const handleGenerateSlip = async () => {
    if (!staffUser || !accessToken) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/staff/salary-slips`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffUserId: staffUser.id,
          month: selectedMonth,
          institutionId: activeInstitutionId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate salary slip");

      toast.success("Salary slip generated successfully");
      await loadSlips();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate salary slip");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteSlip = async (slipId: number) => {
    if (!accessToken) return;
    if (!window.confirm("Are you sure you want to delete this salary slip?")) return;

    try {
      const res = await fetch(`/api/admin/staff/salary-slips?id=${slipId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete salary slip");
      toast.success("Salary slip deleted");
      setSlips((prev) => prev.filter((s) => s.id !== slipId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleOpenEdit = (slip: SalarySlipItem) => {
    setEditingSlip(slip);
    setEditTitle(slip.title);
    const fv = slip.field_values || {};
    const defaultEarn = [
      { name: "Basic Salary", amount: 24000 },
      { name: "House Rent Allowance (HRA)", amount: 8000 },
      { name: "Special Allowance", amount: 3500 },
    ];
    const defaultDed = [
      { name: "Provident Fund (EPF)", amount: 1800 },
      { name: "Professional Tax", amount: 200 },
    ];
    setEditEarnings(Array.isArray(fv.earnings) && fv.earnings.length > 0 ? fv.earnings : defaultEarn);
    setEditDeductions(Array.isArray(fv.deductions_list) && fv.deductions_list.length > 0 ? fv.deductions_list : defaultDed);
    setEditNotes(fv.notes || "Salary disbursed via direct bank transfer.");
  };

  const handleSaveEdit = async () => {
    if (!editingSlip || !accessToken) return;
    setSavingEdit(true);
    try {
      const gross = editEarnings.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const totalDed = editDeductions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const net = Math.max(0, gross - totalDed);

      const updatedFieldValues = {
        ...(editingSlip.field_values || {}),
        gross_salary: gross,
        deductions: totalDed,
        net_salary: net,
        earnings: editEarnings,
        deductions_list: editDeductions,
        notes: editNotes,
      };

      const res = await fetch(`/api/admin/staff/salary-slips`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingSlip.id,
          title: editTitle,
          fieldValues: updatedFieldValues,
        }),
      });

      if (!res.ok) throw new Error("Failed to update salary slip");
      toast.success("Salary slip updated successfully");
      setEditingSlip(null);
      await loadSlips();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update salary slip");
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePrintSlip = (htmlContent?: string) => {
    if (!htmlContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="border-b pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Salary Slips: {staffUser?.full_name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Generate monthly payslips, customize allowances/deductions, view, and print.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-8 text-xs w-36 bg-background">
                    <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {new Date(m + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleGenerateSlip}
                  disabled={generating}
                  className="h-8 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium"
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Generate
                </Button>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
              <p className="text-xs text-muted-foreground font-medium">Fetching salary slips...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pt-3 space-y-3 pr-1 pb-6">
              {slips.length === 0 ? (
                <div className="rounded-xl border border-dashed p-10 text-center bg-muted/5">
                  <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-semibold text-foreground">No salary slips generated yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Choose a month and click "Generate" to synthesize an official payslip for {staffUser?.full_name}.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleGenerateSlip}
                    disabled={generating}
                    className="h-8 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Generate Payslip for {selectedMonth}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {slips.map((slip) => {
                    const fv = slip.field_values || {};
                    const gross = fv.gross_salary || slip.gross_salary || 0;
                    const deductions = fv.deductions || slip.deductions || 0;
                    const net = fv.net_salary || slip.net_salary || Math.max(0, gross - deductions);

                    return (
                      <div
                        key={slip.id}
                        className="p-3.5 rounded-xl border bg-card hover:bg-muted/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-foreground truncate">
                              {slip.title || `Salary Slip - ${fv.month_name || fv.month || slip.created_at?.slice(0, 7)}`}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-2 py-0 bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20 font-semibold">
                              {fv.month || slip.created_at?.slice(0, 7)}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span>
                              Gross: <strong className="text-foreground">₹{Number(gross).toLocaleString("en-IN")}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Deductions: <strong className="text-destructive">₹{Number(deductions).toLocaleString("en-IN")}</strong>
                            </span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              Net Pay: ₹{Number(net).toLocaleString("en-IN")}
                            </span>
                          </div>

                          <div className="text-[11px] text-muted-foreground">
                            Issued: {new Date(slip.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            {slip.institution_name ? ` • ${slip.institution_name}` : ""}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewSlip(slip)}
                            className="h-8 text-xs gap-1"
                            title="View Payslip"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-600" />
                            View
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintSlip(slip.rendered_html)}
                            className="h-8 text-xs gap-1"
                            title="Print Payslip"
                          >
                            <Printer className="h-3.5 w-3.5 text-teal-600" />
                            Print
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(slip)}
                            className="h-8 text-xs gap-1"
                            title="Edit components / figures"
                          >
                            <Pencil className="h-3.5 w-3.5 text-amber-600" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteSlip(slip.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            title="Delete slip"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* VIEW / PREVIEW SLIP MODAL */}
      {previewSlip && (
        <Dialog open={Boolean(previewSlip)} onOpenChange={(open) => !open && setPreviewSlip(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
            <DialogHeader className="border-b pb-3 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {previewSlip.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Official employee payslip preview
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handlePrintSlip(previewSlip.rendered_html)}
                  className="h-8 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / Save PDF
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 bg-muted/20 rounded-xl my-2 border">
              {previewSlip.rendered_html ? (
                <div
                  dangerouslySetInnerHTML={{ __html: previewSlip.rendered_html }}
                  className="bg-white rounded-lg shadow-sm"
                />
              ) : (
                <p className="text-xs text-muted-foreground text-center py-10">No rendered content available.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT SLIP MODAL */}
      {editingSlip && (
        <Dialog open={Boolean(editingSlip)} onOpenChange={(open) => !open && setEditingSlip(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
            <DialogHeader className="border-b pb-3">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Pencil className="h-4 w-4 text-amber-600" />
                Edit Salary Slip
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Adjust salary earnings, deductions, and notes for this payslip.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payslip Title</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Earnings Section */}
              <div className="space-y-2 rounded-xl border p-3 bg-muted/10">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Earnings Breakdown
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditEarnings([...editEarnings, { name: "New Allowance", amount: 1000 }])}
                    className="h-7 text-xs"
                  >
                    + Add Earning
                  </Button>
                </div>

                <div className="space-y-2">
                  {editEarnings.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={item.name}
                        onChange={(e) => {
                          const next = [...editEarnings];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setEditEarnings(next);
                        }}
                        placeholder="Component name (e.g. Basic Salary)"
                        className="h-8 text-xs flex-1"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          value={item.amount}
                          onChange={(e) => {
                            const next = [...editEarnings];
                            next[idx] = { ...next[idx], amount: Number(e.target.value) || 0 };
                            setEditEarnings(next);
                          }}
                          className="h-8 text-xs pl-6"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditEarnings(editEarnings.filter((_, i) => i !== idx))}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deductions Section */}
              <div className="space-y-2 rounded-xl border p-3 bg-muted/10">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Deductions Breakdown
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditDeductions([...editDeductions, { name: "Other Deduction", amount: 500 }])}
                    className="h-7 text-xs"
                  >
                    + Add Deduction
                  </Button>
                </div>

                <div className="space-y-2">
                  {editDeductions.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={item.name}
                        onChange={(e) => {
                          const next = [...editDeductions];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setEditDeductions(next);
                        }}
                        placeholder="Deduction name (e.g. EPF, TDS)"
                        className="h-8 text-xs flex-1"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          value={item.amount}
                          onChange={(e) => {
                            const next = [...editDeductions];
                            next[idx] = { ...next[idx], amount: Number(e.target.value) || 0 };
                            setEditDeductions(next);
                          }}
                          className="h-8 text-xs pl-6"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditDeductions(editDeductions.filter((_, i) => i !== idx))}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Remarks / Notes</Label>
                <Input
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Disbursed on 1st of month via bank transfer"
                  className="h-9 text-xs"
                />
              </div>

              {/* Calculated Summary Banner */}
              <div className="p-3 rounded-lg border bg-teal-50 dark:bg-teal-950/40 border-teal-200/50 flex items-center justify-between text-xs">
                <div>
                  <span className="text-teal-700 dark:text-teal-300 font-semibold block">Estimated Net Salary:</span>
                  <span className="text-[11px] text-muted-foreground">
                    Gross: ₹{editEarnings.reduce((a, c) => a + (Number(c.amount) || 0), 0).toLocaleString("en-IN")} | Deductions: ₹{editDeductions.reduce((a, c) => a + (Number(c.amount) || 0), 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="text-base font-black text-teal-700 dark:text-teal-300">
                  ₹{Math.max(0, editEarnings.reduce((a, c) => a + (Number(c.amount) || 0), 0) - editDeductions.reduce((a, c) => a + (Number(c.amount) || 0), 0)).toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-3 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingSlip(null)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white"
              >
                {savingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Update Slip
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

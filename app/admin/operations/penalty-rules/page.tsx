"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  Flame,
  Loader2,
  Minus,
  PlusCircle,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

type RuleType = "attendance_late" | "task_deadline";
type PenaltyMode = "fixed" | "per_unit";
type ThresholdUnit = "minutes" | "hours" | "days";

interface PenaltyRule {
  id: number;
  institution_id: number | null;
  rule_type: RuleType;
  name: string;
  is_active: boolean;
  threshold_value: string;
  threshold_unit: ThresholdUnit;
  penalty_mode: PenaltyMode;
  penalty_points: string;
  max_penalty: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface RuleFormState {
  rule_type: RuleType;
  name: string;
  is_active: boolean;
  threshold_value: string;
  threshold_unit: ThresholdUnit;
  penalty_mode: PenaltyMode;
  penalty_points: string;
  max_penalty: string;
  description: string;
}

const EMPTY_FORM: RuleFormState = {
  rule_type: "attendance_late",
  name: "",
  is_active: true,
  threshold_value: "15",
  threshold_unit: "minutes",
  penalty_mode: "fixed",
  penalty_points: "10",
  max_penalty: "",
  description: "",
};

// ─── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: PenaltyRule;
  onEdit: (r: PenaltyRule) => void;
  onDelete: (id: number) => void;
  onToggle: (r: PenaltyRule) => void;
}) {
  const isAttendance = rule.rule_type === "attendance_late";

  const thresholdLabel =
    `> ${rule.threshold_value} ${rule.threshold_unit}`;

  const penaltyLabel =
    rule.penalty_mode === "fixed"
      ? `-${rule.penalty_points} pts (flat)`
      : `-${rule.penalty_points} pts / ${rule.threshold_unit}${rule.max_penalty ? `, max -${rule.max_penalty}` : ""}`;

  return (
    <Card
      className={`rounded-2xl border transition-all ${
        rule.is_active
          ? "border-rose-400/40 bg-rose-500/5 hover:border-rose-400/70"
          : "border-border/60 bg-muted/20 opacity-60"
      }`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {isAttendance ? (
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <Flame className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm text-foreground truncate">{rule.name}</p>
              {rule.description && (
                <p className="text-[11px] text-muted-foreground leading-snug">{rule.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Active toggle */}
            <button
              onClick={() => onToggle(rule)}
              title={rule.is_active ? "Disable rule" : "Enable rule"}
              className={`h-7 w-12 rounded-full relative transition-all border ${
                rule.is_active
                  ? "bg-emerald-500 border-emerald-500"
                  : "bg-muted border-border"
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 bg-white rounded-full shadow transition-all ${
                  rule.is_active ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(rule)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(rule.id)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Condition + Penalty pills */}
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold border border-amber-400/30">
            <Clock className="w-3 h-3" />
            Trigger: {thresholdLabel}
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold border border-rose-400/30">
            <Minus className="w-3 h-3" />
            Penalty: {penaltyLabel}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full font-semibold border ${
              rule.is_active
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400/30"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {rule.is_active ? "Active" : "Disabled"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Rule Form Dialog ─────────────────────────────────────────────────────────

function RuleFormDialog({
  open,
  onOpenChange,
  editingRule,
  institutionId,
  accessToken,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingRule: PenaltyRule | null;
  institutionId: number | null;
  accessToken: string | null;
  onSaved: (rule: PenaltyRule) => void;
}) {
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingRule) {
      setForm({
        rule_type: editingRule.rule_type,
        name: editingRule.name,
        is_active: editingRule.is_active,
        threshold_value: editingRule.threshold_value,
        threshold_unit: editingRule.threshold_unit,
        penalty_mode: editingRule.penalty_mode,
        penalty_points: editingRule.penalty_points,
        max_penalty: editingRule.max_penalty ?? "",
        description: editingRule.description ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingRule, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Rule name is required"); return; }
    const pts = parseFloat(form.penalty_points);
    if (!pts || pts <= 0) { toast.error("Penalty points must be > 0"); return; }

    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const payload = {
        ...form,
        institution_id: institutionId,
        max_penalty: form.max_penalty ? parseFloat(form.max_penalty) : null,
        ...(editingRule ? { id: editingRule.id } : {}),
      };

      const res = await fetch("/api/admin/operations/penalty-rules", {
        method: editingRule ? "PUT" : "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      toast.success(editingRule ? "Rule updated" : "Rule created");
      onSaved(data.rule);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof RuleFormState, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-[94vw] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-500" />
            {editingRule ? "Edit Penalty Rule" : "Create Penalty Rule"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Define a condition and penalty. The system evaluates this rule automatically every time the trigger event occurs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Rule type */}
          <div className="grid grid-cols-2 gap-3">
            {(["attendance_late", "task_deadline"] as RuleType[]).map((rt) => (
              <button
                key={rt}
                type="button"
                onClick={() => {
                  set("rule_type", rt);
                  set("threshold_unit", rt === "attendance_late" ? "minutes" : "hours");
                }}
                className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                  form.rule_type === rt
                    ? "border-rose-500 bg-rose-500/8 shadow-sm"
                    : "border-border bg-card/60 hover:bg-muted/40"
                }`}
              >
                {rt === "attendance_late" ? (
                  <Clock className="w-4.5 h-4.5 text-amber-500 mb-1" />
                ) : (
                  <Flame className="w-4.5 h-4.5 text-rose-500 mb-1" />
                )}
                <span className="text-xs font-bold text-foreground">
                  {rt === "attendance_late" ? "Late Attendance" : "Task Deadline"}
                </span>
                <span className="text-[10px] text-muted-foreground leading-snug">
                  {rt === "attendance_late"
                    ? "Fires when staff checks in after grace period"
                    : "Fires when a task or sub-task misses its deadline"}
                </span>
              </button>
            ))}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Rule Name *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={
                form.rule_type === "attendance_late"
                  ? "e.g. Minor Late Penalty (< 30 min)"
                  : "e.g. 1-Day Overdue Penalty"
              }
              className="text-xs h-9"
            />
          </div>

          {/* Threshold */}
          <div className="space-y-1.5 p-3.5 rounded-xl border bg-muted/20">
            <Label className="text-xs font-bold text-foreground">Trigger Condition</Label>
            <p className="text-[10px] text-muted-foreground">
              Rule fires when the overrun exceeds this value
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.threshold_value}
                  onChange={(e) => set("threshold_value", e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Unit</Label>
                <Select value={form.threshold_unit} onValueChange={(v) => set("threshold_unit", v as ThresholdUnit)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {form.rule_type === "attendance_late" && (
                      <SelectItem value="minutes" className="text-xs">Minutes</SelectItem>
                    )}
                    <SelectItem value="hours" className="text-xs">Hours</SelectItem>
                    <SelectItem value="days" className="text-xs">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Penalty calculation */}
          <div className="space-y-3 p-3.5 rounded-xl border bg-muted/20">
            <Label className="text-xs font-bold text-foreground">Penalty Calculation</Label>

            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-2">
              {(["fixed", "per_unit"] as PenaltyMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => set("penalty_mode", mode)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    form.penalty_mode === mode
                      ? "border-rose-500 bg-rose-500/8"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <p className="text-xs font-bold text-foreground">
                    {mode === "fixed" ? "⚡ Fixed Amount" : "📈 Per Unit"}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    {mode === "fixed"
                      ? "Same deduction regardless of how late"
                      : `Multiplied by units overdue (e.g. -5 per ${form.threshold_unit})`}
                  </p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  {form.penalty_mode === "fixed" ? "Penalty Points" : `Points per ${form.threshold_unit}`}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={form.penalty_points}
                    onChange={(e) => set("penalty_points", e.target.value)}
                    className="text-xs h-9 font-mono text-rose-600 pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-500">-PTS</span>
                </div>
              </div>
              {form.penalty_mode === "per_unit" && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Max Penalty (optional cap)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={form.max_penalty}
                      onChange={(e) => set("max_penalty", e.target.value)}
                      placeholder="No cap"
                      className="text-xs h-9 font-mono pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">MAX</span>
                  </div>
                </div>
              )}
            </div>

            {/* Live preview */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/8 border border-rose-400/20 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="text-muted-foreground">
                Example: Staff is{" "}
                <strong className="text-foreground">
                  {parseInt(form.threshold_value) + (form.rule_type === "attendance_late" ? 20 : 3)}{" "}
                  {form.threshold_unit}
                </strong>{" "}
                {form.rule_type === "attendance_late" ? "late" : "overdue"} →
                deduction:{" "}
                <strong className="text-rose-600">
                  {form.penalty_mode === "fixed"
                    ? `-${form.penalty_points} pts`
                    : `-${
                        form.max_penalty
                          ? Math.min(
                              parseFloat(form.penalty_points) * (form.rule_type === "attendance_late" ? 20 : 3),
                              parseFloat(form.max_penalty)
                            )
                          : parseFloat(form.penalty_points) * (form.rule_type === "attendance_late" ? 20 : 3)
                      } pts`}
                </strong>
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description (optional)</Label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Notes for other admins..."
              className="w-full text-xs rounded-xl border px-3 py-2.5 bg-background resize-none outline-none focus:ring-2 ring-primary/30 transition"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border bg-card/60">
            <div>
              <p className="text-xs font-bold text-foreground">Rule Active</p>
              <p className="text-[10px] text-muted-foreground">Inactive rules are never evaluated</p>
            </div>
            <button
              type="button"
              onClick={() => set("is_active", !form.is_active)}
              className={`h-7 w-12 rounded-full relative transition-all border ${
                form.is_active ? "bg-emerald-500 border-emerald-500" : "bg-muted border-border"
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 bg-white rounded-full shadow transition-all ${
                  form.is_active ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingRule ? "Save Changes" : "Create Rule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PenaltyRulesPage() {
  const { user, accessToken } = useAuthStore();
  const [rules, setRules] = useState<PenaltyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RuleType>("attendance_late");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PenaltyRule | null>(null);
  const [runningCheck, setRunningCheck] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<any>(null);
  const [showCheckResult, setShowCheckResult] = useState(false);

  const institutionId =
    (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch(
        `/api/admin/operations/penalty-rules${institutionId ? `?institution_id=${institutionId}` : ""}`,
        { headers }
      );
      const data = await res.json();
      if (res.ok) setRules(data.rules || []);
    } catch {
      toast.error("Failed to load penalty rules");
    } finally {
      setLoading(false);
    }
  }, [accessToken, institutionId]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this penalty rule permanently?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch(`/api/admin/operations/penalty-rules?id=${id}`, {
        method: "DELETE", headers,
      });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== id));
        toast.success("Rule deleted");
      } else {
        const d = await res.json();
        toast.error(d.error || "Delete failed");
      }
    } catch { toast.error("Delete failed"); }
  };

  const handleToggle = async (rule: PenaltyRule) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch("/api/admin/operations/penalty-rules", {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...rule, is_active: !rule.is_active }),
      });
      const data = await res.json();
      if (res.ok) {
        setRules((prev) => prev.map((r) => r.id === rule.id ? data.rule : r));
        toast.success(`Rule ${!rule.is_active ? "enabled" : "disabled"}`);
      }
    } catch { toast.error("Toggle failed"); }
  };

  const handleRunDeadlineCheck = async () => {
    setRunningCheck(true);
    setShowCheckResult(false);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch("/api/admin/operations/tasks/check-deadlines", {
        method: "POST",
        headers,
        body: JSON.stringify({ institution_id: institutionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLastCheckResult(data);
      setShowCheckResult(true);
      toast.success(
        `Deadline check complete — ${data.summary.penalisedCount} item(s) penalised`
      );
    } catch (err: any) {
      toast.error(err.message || "Deadline check failed");
    } finally {
      setRunningCheck(false);
    }
  };

  const displayedRules = rules.filter((r) => r.rule_type === activeTab);

  const TABS = [
    { id: "attendance_late" as RuleType, label: "Late Attendance", icon: Clock, color: "text-amber-500" },
    { id: "task_deadline" as RuleType, label: "Task Deadline",     icon: Flame,  color: "text-rose-500"  },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-rose-500" />
            Penalty Rule Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure automatic score deductions for late attendance and missed task deadlines.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunDeadlineCheck}
            disabled={runningCheck}
            className="text-xs font-bold gap-1.5 border-rose-400/50 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10"
          >
            {runningCheck ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            Run Deadline Check
          </Button>
          <Button
            size="sm"
            onClick={() => { setEditingRule(null); setDialogOpen(true); }}
            className="text-xs font-bold gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" /> New Rule
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3.5 rounded-2xl border bg-primary/5 border-primary/20 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-foreground">How automatic penalties work</p>
          <p className="text-muted-foreground leading-relaxed">
            <strong>Late attendance</strong> — fires automatically when an admin marks a staff
            member as <em>LATE</em> with a check-in time recorded. The engine reads your
            attendance setup&apos;s start time + grace period to calculate minutes late, then
            finds the best matching rule below.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong>Task deadlines</strong> — click <em>Run Deadline Check</em> (or set up a
            daily scheduled call) to scan all overdue tasks and sub-tasks. The engine calculates
            hours overdue and applies matching rules — safely idempotent (no double-penalising).
          </p>
        </div>
      </div>

      {/* Deadline check result */}
      {showCheckResult && lastCheckResult && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Deadline Check Results
            </p>
            <Button size="icon" variant="ghost" onClick={() => setShowCheckResult(false)} className="h-7 w-7">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { label: "Items Checked", val: lastCheckResult.summary.totalItems, color: "text-foreground" },
              { label: "Penalised",     val: lastCheckResult.summary.penalisedCount, color: "text-rose-600" },
              { label: "Skipped",       val: lastCheckResult.summary.skippedCount, color: "text-muted-foreground" },
              { label: "Total Deducted", val: `-${lastCheckResult.summary.totalPenaltyApplied} pts`, color: "text-rose-600" },
            ].map(({ label, val, color }) => (
              <div key={label} className="text-center p-2.5 rounded-xl bg-muted/30 border">
                <p className="text-muted-foreground text-[10px]">{label}</p>
                <p className={`font-black text-lg font-mono ${color}`}>{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-muted/40 rounded-2xl border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = rules.filter((r) => r.rule_type === tab.id).length;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isSelected
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                isSelected ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground"
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Rules list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : displayedRules.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-3xl bg-muted/10 space-y-3">
          <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <h3 className="text-base font-bold">No {activeTab === "attendance_late" ? "Attendance Late" : "Task Deadline"} Rules Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Click &ldquo;New Rule&rdquo; to create your first automatic penalty condition.
          </p>
          <Button
            size="sm"
            onClick={() => { setEditingRule(null); setDialogOpen(true); }}
            className="mt-2 font-bold gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Create First Rule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedRules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={(r) => { setEditingRule(r); setDialogOpen(true); }}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Rule form dialog */}
      <RuleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingRule={editingRule}
        institutionId={institutionId}
        accessToken={accessToken}
        onSaved={(rule) => {
          setRules((prev) =>
            editingRule
              ? prev.map((r) => r.id === rule.id ? rule : r)
              : [rule, ...prev]
          );
        }}
      />
    </div>
  );
}

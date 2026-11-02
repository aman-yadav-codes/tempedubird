"use client";

import React, { useState, useEffect } from "react";
import {
  Trophy,
  ShieldCheck,
  Save,
  Clock,
  Coins,
  Briefcase,
  UserPlus,
  Award,
  History,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

interface PerformanceRule {
  id: number;
  rule_key: string;
  name: string;
  category: "attendance" | "finance" | "leads_projects" | "admin" | "recruitment";
  description: string;
  is_enabled: boolean;
  calc_type: "fixed" | "percentage";
  point_value: number;
  percentage_value: number;
  frequency: string;
  action_type: "add" | "deduct";
  version: number;
  updated_by?: string;
  updated_at?: string;
}

interface SettingsHistoryRecord {
  id: number;
  rule_key: string;
  rule_name: string;
  previous_values: any;
  new_values: any;
  changed_by: string;
  change_reason: string;
  created_at: string;
}

export default function PerformanceSettingsPage() {
  const [rules, setRules] = useState<PerformanceRule[]>([]);
  const [originalRules, setOriginalRules] = useState<PerformanceRule[]>([]);
  const [history, setHistory] = useState<SettingsHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings/performance");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load performance settings");

      setRules(data.rules || []);
      setOriginalRules(JSON.parse(JSON.stringify(data.rules || [])));
      setHistory(data.history || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleRule = (key: string) => {
    setRules((prev) =>
      prev.map((r) => (r.rule_key === key ? { ...r, is_enabled: !r.is_enabled } : r))
    );
  };

  const handleValueChange = (key: string, field: "point_value" | "percentage_value", val: string) => {
    const num = parseFloat(val) || 0;
    setRules((prev) =>
      prev.map((r) => (r.rule_key === key ? { ...r, [field]: num } : r))
    );
  };

  const hasUnsavedChanges = JSON.stringify(rules) !== JSON.stringify(originalRules);

  const handleSaveConfirmed = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/settings/performance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules,
          changeReason: changeReason.trim() || "Performance rules updated by Administrator",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update performance rules");

      toast.success(data.message || "Settings updated successfully");
      setConfirmOpen(false);
      setChangeReason("");
      fetchSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const categoryIcons: Record<string, any> = {
    attendance: Clock,
    finance: Coins,
    leads_projects: Briefcase,
    admin: ShieldCheck,
    recruitment: UserPlus,
  };

  const categoryLabels: Record<string, string> = {
    attendance: "Attendance & Punctuality",
    finance: "Finance & Accounting",
    leads_projects: "Leads & Projects",
    admin: "Admin Role Rewards",
    recruitment: "Recruitment & Onboarding",
  };

  const filteredRules =
    activeTab === "all" ? rules : rules.filter((r) => r.category === activeTab);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Performance Settings
                <Badge variant="outline" className="text-xs bg-muted font-mono">
                  v2.0
                </Badge>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Configure automated performance point calculation rules, salary percentages, and reward frequencies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSettings}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs border-primary/30 text-primary">
            <Link href="/admin/performance/leaderboard">
              <Award className="w-3.5 h-3.5" />
              Leaderboard
              <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Link>
          </Button>

          <Button
            size="sm"
            disabled={!hasUnsavedChanges || saving}
            onClick={() => setConfirmOpen(true)}
            className="gap-1.5 text-xs bg-primary font-bold shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            You have unsaved changes in your performance rules. Save changes to activate them for future employee activities.
          </span>
          <Button size="sm" onClick={() => setConfirmOpen(true)} className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white">
            Apply Now
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">
            All Rules ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-500" /> Attendance
          </TabsTrigger>
          <TabsTrigger value="finance" className="text-xs gap-1.5">
            <Coins className="w-3.5 h-3.5 text-emerald-500" /> Finance & Accounting
          </TabsTrigger>
          <TabsTrigger value="leads_projects" className="text-xs gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-indigo-500" /> Leads & Projects
          </TabsTrigger>
          <TabsTrigger value="admin" className="text-xs gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> Admin Role
          </TabsTrigger>
          <TabsTrigger value="recruitment" className="text-xs gap-1.5">
            <UserPlus className="w-3.5 h-3.5 text-rose-500" /> Recruitment
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1.5">
            <History className="w-3.5 h-3.5" /> Audit History
          </TabsTrigger>
        </TabsList>

        {activeTab !== "history" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRules.map((rule) => {
              const Icon = categoryIcons[rule.category] || Award;
              const isDeduct = rule.action_type === "deduct";

              return (
                <Card
                  key={rule.rule_key}
                  className={`border transition-all duration-200 relative overflow-hidden ${
                    !rule.is_enabled ? "opacity-60 bg-muted/20" : "bg-card shadow-xs hover:border-primary/40"
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      isDeduct ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                  />
                  <CardHeader className="pb-3 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded-md ${
                            isDeduct
                              ? "bg-rose-500/10 text-rose-600"
                              : "bg-emerald-500/10 text-emerald-600"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold leading-tight">
                            {rule.name}
                          </CardTitle>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                            {categoryLabels[rule.category]}
                          </span>
                        </div>
                      </div>

                      <Switch
                        checked={rule.is_enabled}
                        onCheckedChange={() => handleToggleRule(rule.rule_key)}
                        aria-label={`Toggle ${rule.name}`}
                      />
                    </div>
                    <CardDescription className="text-xs mt-2 line-clamp-2">
                      {rule.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-4 pb-4 pt-1 space-y-3">
                    <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Calculation Type:</span>
                        <Badge
                          variant="outline"
                          className={
                            rule.calc_type === "percentage"
                              ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-400/30"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400/30"
                          }
                        >
                          {rule.calc_type === "percentage" ? "Percentage %" : "Fixed Points"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-foreground">
                          {rule.calc_type === "percentage" ? "Configured Rate:" : "Point Value:"}
                        </span>

                        <div className="flex items-center gap-1.5 w-32">
                          <Input
                            type="number"
                            step={rule.calc_type === "percentage" ? "0.01" : "1"}
                            min="0"
                            value={
                              rule.calc_type === "percentage"
                                ? rule.percentage_value
                                : rule.point_value
                            }
                            onChange={(e) =>
                              handleValueChange(
                                rule.rule_key,
                                rule.calc_type === "percentage"
                                  ? "percentage_value"
                                  : "point_value",
                                e.target.value
                              )
                            }
                            disabled={!rule.is_enabled}
                            className="h-8 text-xs font-bold text-right"
                          />
                          <span className="text-xs font-bold text-muted-foreground">
                            {rule.calc_type === "percentage" ? "%" : "pts"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <span>Frequency:</span>
                        <span className="font-semibold capitalize">{rule.frequency}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Action:</span>
                        <span
                          className={`font-bold ${
                            isDeduct ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {isDeduct ? "− Deduct Points" : "+ Award Points"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                      <span>Rule Version: v{rule.version}</span>
                      {rule.updated_by && <span>By {rule.updated_by}</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Audit History Tab */
          <Card className="border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Settings Change Audit Trail
              </CardTitle>
              <CardDescription className="text-xs">
                Complete historical record of all modifications made to performance point rules. Changes never modify historical transactions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No configuration updates have been recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-y bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                        <th className="py-2.5 px-4">Rule Name</th>
                        <th className="py-2.5 px-4">Previous Value</th>
                        <th className="py-2.5 px-4">New Value</th>
                        <th className="py-2.5 px-4">Changed By</th>
                        <th className="py-2.5 px-4">Reason / Notes</th>
                        <th className="py-2.5 px-4">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {history.map((h) => {
                        const prev = typeof h.previous_values === "string" ? JSON.parse(h.previous_values) : h.previous_values;
                        const curr = typeof h.new_values === "string" ? JSON.parse(h.new_values) : h.new_values;

                        return (
                          <tr key={h.id} className="hover:bg-muted/20">
                            <td className="py-2.5 px-4 font-semibold text-foreground">
                              {h.rule_name || h.rule_key}
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground font-mono">
                              {prev.calc_type === "percentage"
                                ? `${prev.percentage_value}%`
                                : `${prev.point_value} pts`}{" "}
                              ({prev.is_enabled ? "Enabled" : "Disabled"})
                            </td>
                            <td className="py-2.5 px-4 font-bold text-foreground font-mono">
                              {curr.calc_type === "percentage"
                                ? `${curr.percentage_value}%`
                                : `${curr.point_value} pts`}{" "}
                              ({curr.is_enabled ? "Enabled" : "Disabled"})
                            </td>
                            <td className="py-2.5 px-4 text-foreground font-medium">
                              {h.changed_by}
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground max-w-xs truncate" title={h.change_reason}>
                              {h.change_reason || "Admin update"}
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                              {new Date(h.created_at).toLocaleString("en-IN", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </Tabs>

      {/* Confirmation Dialog before applying changes */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Confirm Performance Rule Updates
            </DialogTitle>
            <DialogDescription className="text-xs">
              These changes will strictly take effect for <strong>future employee activities</strong>. Historical performance transactions and past rankings will remain unchanged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-foreground">
              Reason for Change (Required for audit log):
            </label>
            <Input
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="e.g., Updated project creation bonus to 10% for Q4"
              className="text-xs h-9"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={handleSaveConfirmed}
              className="text-xs bg-primary font-bold"
            >
              {saving ? "Applying Changes..." : "Confirm & Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


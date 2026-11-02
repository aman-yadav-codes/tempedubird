"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ListTree,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Building2,
  Trash2,
  Loader2,
  DollarSign,
  Sparkles,
  TrendingUp,
  UserCheck,
  Edit2,
  ShieldCheck,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { OperationTask, SubTask, getCurrencySymbol } from "./page";

type BreakdownItem = {
  id: string;
  title: string;
  price: number; // Price addition (₹ / $ / £)
  is_extra_task: boolean; // TRUE if client added new task & will pay extra!
  scope_type: "base_scope" | "client_extra";
  client_approval: "approved" | "pending" | "draft";
  assigned_employee_id?: number | null;
  assigned_employee_name?: string | null;
  assigned_employee_role?: string | null;
  duration_hours?: number;
  urgency: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "under_review" | "completed" | "cancelled";
  notes?: string | null;
  created_at?: string;
};

type Props = {
  task: OperationTask | null;
  staffList?: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated?: () => void;
  onSaved?: () => void;
};

export function ProjectBreakdownDialog({
  task,
  staffList,
  open,
  onOpenChange,
  onTaskUpdated,
  onSaved,
}: Props) {
  const { accessToken } = useAuthStore();
  const [breakdownItems, setBreakdownItems] = useState<BreakdownItem[]>([]);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // New Item Form State
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("0");
  const [newIsExtra, setNewIsExtra] = useState(true);
  const [newApproval, setNewApproval] = useState<"approved" | "pending" | "draft">("approved");
  const [newStaffId, setNewStaffId] = useState("none");
  const [newHours, setNewHours] = useState("4");
  const [newUrgency, setNewUrgency] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [newNotes, setNewNotes] = useState("");

  const sym = getCurrencySymbol(task?.currency || "INR");

  // Load existing subtasks into breakdown items on open
  useEffect(() => {
    if (open && task) {
      const initialBase = parseFloat(String(task.base_price || task.cost || task.price || 0));
      setBasePrice(initialBase);

      const items: BreakdownItem[] = [];
      if (Array.isArray(task.sub_tasks)) {
        task.sub_tasks.forEach((st: any, idx: number) => {
          items.push({
            id: st.id || `sub_${idx}_${Date.now()}`,
            title: st.title || "Deliverable Item",
            price: parseFloat(String(st.price || 0)),
            is_extra_task: Boolean(st.is_extra_task || st.scope_type === "client_extra"),
            scope_type: st.is_extra_task || st.scope_type === "client_extra" ? "client_extra" : "base_scope",
            client_approval: st.client_approval || (st.is_extra_task ? "approved" : "approved"),
            assigned_employee_id: st.assigned_employee_id,
            assigned_employee_name: st.assigned_employee_name,
            assigned_employee_role: st.assigned_employee_role,
            duration_hours: st.duration_hours || 4,
            urgency: st.urgency || "medium",
            status: st.status || "pending",
            notes: st.notes || null,
            created_at: st.created_at || new Date().toISOString(),
          });
        });
      }
      setBreakdownItems(items);
      setShowAddForm(false);
    }
  }, [open, task]);

  // Financial Calculations
  const extraAdditionsTotal = useMemo(() => {
    return breakdownItems
      .filter((i) => i.is_extra_task)
      .reduce((sum, i) => sum + (parseFloat(String(i.price)) || 0), 0);
  }, [breakdownItems]);

  const totalRevisedProjectValue = useMemo(() => {
    return basePrice + extraAdditionsTotal;
  }, [basePrice, extraAdditionsTotal]);

  const extraCount = useMemo(() => {
    return breakdownItems.filter((i) => i.is_extra_task).length;
  }, [breakdownItems]);

  const handleAddNewItem = () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a deliverable / task title");
      return;
    }

    const assignedStaff = staffList.find((s) => String(s.id) === newStaffId);
    const priceVal = parseFloat(newPrice) || 0;

    const newItem: BreakdownItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newTitle.trim(),
      price: priceVal,
      is_extra_task: newIsExtra,
      scope_type: newIsExtra ? "client_extra" : "base_scope",
      client_approval: newApproval,
      assigned_employee_id: assignedStaff ? assignedStaff.id : null,
      assigned_employee_name: assignedStaff ? assignedStaff.name : null,
      assigned_employee_role: assignedStaff ? assignedStaff.role : null,
      duration_hours: parseFloat(newHours) || 4,
      urgency: newUrgency,
      status: "pending",
      notes: newNotes.trim() || null,
      created_at: new Date().toISOString(),
    };

    setBreakdownItems((prev) => [newItem, ...prev]);

    // Reset Form
    setNewTitle("");
    setNewPrice("0");
    setNewIsExtra(true);
    setNewApproval("approved");
    setNewStaffId("none");
    setNewHours("4");
    setNewNotes("");
    setShowAddForm(false);

    toast.success(
      newIsExtra
        ? `Extra Task added (+${sym}${priceVal.toLocaleString("en-IN")})!`
        : "Base Task added to breakdown!"
    );
  };

  const handleRemoveItem = (id: string) => {
    setBreakdownItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleToggleStatus = (id: string) => {
    setBreakdownItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const nextStatus =
          i.status === "completed"
            ? "pending"
            : i.status === "pending"
            ? "in_progress"
            : "completed";
        return { ...i, status: nextStatus };
      })
    );
  };

  const handleSaveBreakdownToProject = async () => {
    if (!task?.id) return;

    setSaving(true);
    try {
      // Map breakdown items to sub_tasks array
      const mappedSubtasks = breakdownItems.map((b) => ({
        id: b.id,
        title: b.title,
        price: b.price,
        is_extra_task: b.is_extra_task,
        scope_type: b.scope_type,
        client_approval: b.client_approval,
        assigned_employee_id: b.assigned_employee_id,
        assigned_employee_name: b.assigned_employee_name,
        assigned_employee_role: b.assigned_employee_role,
        duration_hours: b.duration_hours,
        urgency: b.urgency,
        status: b.status,
        notes: b.notes,
        created_at: b.created_at,
      }));

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          id: task.id,
          base_price: basePrice,
          extra_cost: extraAdditionsTotal,
          cost: totalRevisedProjectValue,
          price: totalRevisedProjectValue,
          sub_tasks: mappedSubtasks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update project breakdown");

      toast.success("Project breakdown and total revised value saved successfully!");
      onTaskUpdated?.();
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save breakdown");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0 bg-background/95 backdrop-blur-xs flex flex-row items-center justify-between">
          <div className="space-y-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ListTree className="w-5 h-5 text-primary" />
              <span>Project Task & Cost Breakdown</span>
              <Badge variant="outline" className="text-xs font-mono ml-1 font-bold">
                {task?.title}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manage original agreed deliverables vs. client-requested extra tasks with price additions.
            </DialogDescription>
          </div>

          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {showAddForm ? "Close Form" : "+ Add Task Addition"}
          </Button>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. Agreed Base Price */}
            <div className="p-4 rounded-xl border bg-muted/20 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] uppercase font-bold tracking-wider">Agreed Base Scope</span>
                <Building2 className="w-4 h-4 text-muted-foreground/60" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold font-mono text-foreground">
                  {sym}{basePrice.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">Initial agreed project cost</p>
            </div>

            {/* 2. Extra Client Additions */}
            <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30 space-y-1">
              <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                <span className="text-[10px] uppercase font-bold tracking-wider">Client Extra Scope Additions</span>
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                  + {sym}{extraAdditionsTotal.toLocaleString("en-IN")}
                </span>
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-400 text-[10px] py-0">
                  {extraCount} Extra Task{extraCount === 1 ? "" : "s"}
                </Badge>
              </div>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
                Extra payable additions requested by client
              </p>
            </div>

            {/* 3. Total Revised Project Value */}
            <div className="p-4 rounded-xl border bg-primary/10 border-primary/30 space-y-1">
              <div className="flex items-center justify-between text-primary">
                <span className="text-[10px] uppercase font-bold tracking-wider">Total Revised Value</span>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black font-mono text-primary">
                  {sym}{totalRevisedProjectValue.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Base ({sym}{basePrice.toLocaleString("en-IN")}) + Extra ({sym}{extraAdditionsTotal.toLocaleString("en-IN")})
              </p>
            </div>
          </div>

          {/* Collapsible "+ Add New Task with Price Addition" Card */}
          {showAddForm && (
            <div className="p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 space-y-4 shadow-sm animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between border-b border-primary/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-bold text-foreground">
                    Add New Task / Deliverable with Price Addition
                  </h4>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Track client change requests & bill extra
                </span>
              </div>

              <div className="space-y-3">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Deliverable / Task Title *</Label>
                  <Input
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Razorpay Payment Gateway Integration, Mobile Push Notification Module"
                    className="text-xs h-9 bg-background"
                    autoFocus
                  />
                </div>

                {/* Scope Classification & Price Addition */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Scope Type Toggle */}
                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs font-semibold">Scope Classification *</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setNewIsExtra(true)}
                        className={`p-2 rounded-lg border text-xs text-left font-bold transition-all ${
                          newIsExtra
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        🚀 Client Extra (+ Extra Pay)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewIsExtra(false)}
                        className={`p-2 rounded-lg border text-xs text-left font-bold transition-all ${
                          !newIsExtra
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        📦 Base Scope (Included)
                      </button>
                    </div>
                  </div>

                  {/* Price Addition */}
                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Price Addition ({sym}) *</span>
                      {newIsExtra && (
                        <span className="text-[10px] text-emerald-600 font-bold">Extra Billable</span>
                      )}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">
                        {sym}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder="5000"
                        className="text-xs h-9 font-mono pl-6 bg-background"
                      />
                    </div>
                  </div>

                  {/* Client Approval Status */}
                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs font-semibold">Client Approval *</Label>
                    <select
                      value={newApproval}
                      onChange={(e) => setNewApproval(e.target.value as any)}
                      className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground cursor-pointer"
                    >
                      <option value="approved">✅ Approved by Client (Will Pay Extra)</option>
                      <option value="pending">⏳ Pending Client Approval</option>
                      <option value="draft">📝 Internal Draft / Discussion</option>
                    </select>
                  </div>
                </div>

                {/* Assigned Staff, Duration, Urgency */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Assign Staff Developer</Label>
                    <select
                      value={newStaffId}
                      onChange={(e) => setNewStaffId(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground cursor-pointer"
                    >
                      <option value="none">-- Unassigned --</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.name} ({s.role || "Staff"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Estimated Duration (Hours)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newHours}
                      onChange={(e) => setNewHours(e.target.value)}
                      placeholder="e.g. 6"
                      className="text-xs h-9 font-mono bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Urgency Level</Label>
                    <select
                      value={newUrgency}
                      onChange={(e) => setNewUrgency(e.target.value as any)}
                      className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Task Notes / Reason for Scope Addition</Label>
                  <Input
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="e.g. Client requested webhook receiver & auto reconciliation after SOW sign-off"
                    className="text-xs h-8 bg-background"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-primary/20">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddNewItem}
                    className="bg-primary font-bold gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Task to Breakdown
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Breakdown Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary" />
                <span>All Project Deliverables & Additions ({breakdownItems.length})</span>
              </h4>

              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Extra Client Scope
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50"></span> Base Scope
                </span>
              </div>
            </div>

            {breakdownItems.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed bg-muted/10 p-6 space-y-3">
                <ListTree className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <div>
                  <h5 className="text-sm font-bold text-foreground">No Sub-Tasks in Breakdown</h5>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    The project currently has base budget of {sym}{basePrice.toLocaleString("en-IN")}. Add deliverables or client change requests to track extra prices.
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowAddForm(true)} className="font-bold gap-1.5">
                  <Plus className="w-4 h-4" /> + Add First Task
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {breakdownItems.map((item, idx) => {
                  const isCompleted = item.status === "completed";
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.is_extra_task
                          ? "bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50"
                          : "bg-card/60 hover:bg-card border-border"
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item.id)}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            title="Click to toggle status"
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                            )}
                          </button>

                          <span className={`font-bold text-xs text-foreground truncate ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                            {item.title}
                          </span>

                          {item.is_extra_task ? (
                            <Badge className="bg-emerald-600 text-white font-bold text-[9px] py-0 px-2 uppercase tracking-wide">
                              + Client Extra Task
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 text-muted-foreground">
                              Base Scope
                            </Badge>
                          )}

                          {item.is_extra_task && item.client_approval && (
                            <Badge
                              variant="outline"
                              className={`text-[9px] py-0 px-1.5 font-semibold ${
                                item.client_approval === "approved"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400"
                              }`}
                            >
                              {item.client_approval === "approved" ? "Client Approved" : "Pending Client Approval"}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          {item.assigned_employee_name && (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <UserCheck className="w-3 h-3 text-primary" />
                              {item.assigned_employee_name}
                            </span>
                          )}
                          {item.duration_hours && (
                            <span>{item.duration_hours} hrs</span>
                          )}
                          <span className="capitalize">Urgency: {item.urgency}</span>
                          <span className="capitalize">Status: {item.status}</span>
                          {item.notes && (
                            <span className="text-muted-foreground italic truncate max-w-xs">
                              &ldquo;{item.notes}&rdquo;
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Price & Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className={`font-mono font-bold text-sm ${item.is_extra_task ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                            {item.is_extra_task ? "+ " : ""}
                            {sym}{parseFloat(String(item.price)).toLocaleString("en-IN")}
                          </div>
                          <span className="text-[10px] text-muted-foreground block">
                            {item.is_extra_task ? "Extra addition" : "Included in base"}
                          </span>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t bg-muted/20 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Total Revised Budget:</span>
            <span className="font-mono font-black text-sm text-primary">
              {sym}{totalRevisedProjectValue.toLocaleString("en-IN")}
            </span>
            {extraAdditionsTotal > 0 && (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400 font-bold">
                +{sym}{extraAdditionsTotal.toLocaleString("en-IN")} Extra
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={handleSaveBreakdownToProject}
              className="bg-primary font-bold shadow-xs"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Save & Sync to Project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


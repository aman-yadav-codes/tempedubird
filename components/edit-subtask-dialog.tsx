"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit2, IndianRupee, Clock, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export interface EditSubtaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any | null;
  subtask: any | null;
  staffOptions: Array<{ id: number | string; name: string; role?: string | null }>;
  onSaved: () => void | Promise<void>;
  accessToken?: string | null;
}

export function EditSubtaskDialog({
  open,
  onOpenChange,
  task,
  subtask,
  staffOptions,
  onSaved,
  accessToken,
}: EditSubtaskDialogProps) {
  const [title, setTitle] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const [price, setPrice] = useState("0");
  const [assignedStaffId, setAssignedStaffId] = useState("none");
  const [cadence, setCadence] = useState("once");
  const [durationHours, setDurationHours] = useState("1");
  const [durationMinutes, setDurationMinutes] = useState("0");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("18:00");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [points, setPoints] = useState("20");
  const [penaltyPoints, setPenaltyPoints] = useState("10");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (subtask) {
      setTitle(subtask.title || "");
      setDeliverable(subtask.deliverable || "");
      setPrice(subtask.price !== undefined ? String(subtask.price) : "0");
      setAssignedStaffId(subtask.assigned_employee_id ? String(subtask.assigned_employee_id) : "none");
      const cad = subtask.cadence || (subtask.is_daily_recurring ? "daily" : "once");
      setCadence(cad);
      setDurationHours(subtask.duration_hours !== undefined ? String(subtask.duration_hours) : "1");
      setDurationMinutes(subtask.duration_minutes !== undefined ? String(subtask.duration_minutes) : "0");
      setDeadlineDate(subtask.deadline_date || "");
      setDeadlineTime(subtask.deadline_time || "18:00");
      setUrgency(subtask.urgency || "medium");
      setPoints(subtask.points !== undefined ? String(subtask.points) : "20");
      setPenaltyPoints(subtask.penalty_points !== undefined ? String(subtask.penalty_points) : "10");
    }
  }, [subtask]);

  if (!task || !subtask) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a deliverable title");
      return;
    }

    setSaving(true);
    try {
      const selectedStaff = staffOptions.find((s) => String(s.id) === assignedStaffId);
      const isDaily = cadence !== "once";

      const currentSubs = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
      const exists = currentSubs.some((s: any) => String(s.id) === String(subtask.id));
      
      const newSubData = {
        id: subtask.id,
        title: title.trim(),
        deliverable: deliverable.trim() || null,
        price: parseFloat(price) || 0,
        assigned_employee_id: assignedStaffId !== "none" ? parseInt(assignedStaffId) : null,
        assigned_employee_name: selectedStaff ? selectedStaff.name : null,
        assigned_employee_role: selectedStaff ? selectedStaff.role : null,
        cadence,
        is_daily_recurring: isDaily,
        duration_hours: parseFloat(durationHours) || 0,
        duration_minutes: parseFloat(durationMinutes) || 0,
        deadline_date: deadlineDate || null,
        deadline_time: deadlineTime || null,
        urgency,
        points: parseFloat(points) || 20,
        penalty_points: parseFloat(penaltyPoints) || 10,
        status: subtask.status || "pending",
      };

      let updatedSubs: any[];
      if (exists) {
        updatedSubs = currentSubs.map((s: any) => {
          if (String(s.id) === String(subtask.id)) {
            return {
              ...s,
              ...newSubData,
            };
          }
          return s;
        });
      } else {
        updatedSubs = [...currentSubs, newSubData];
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          id: task.id,
          sub_tasks: updatedSubs,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to update sub-task");
      }

      toast.success("Sub-task updated successfully");
      onOpenChange(false);
      await onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to update sub-task");
    } finally {
      setSaving(false);
    }
  };

  const isNewSubtask = !Array.isArray(task?.sub_tasks) || !task.sub_tasks.some((s: any) => String(s.id) === String(subtask?.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[92vh] overflow-y-auto p-6" style={{ translate: "-50% -50%" }}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-primary" />
            <span>{isNewSubtask ? "Add Deliverable / Sub-Task" : "Edit Deliverable / Sub-Task"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isNewSubtask ? "Add a new deliverable, pricing, cadence, and urgency for: " : "Modify deliverables, pricing, duration, urgency, and deadlines for: "}
            <strong className="text-foreground">{task.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Sub-Task Deliverable Name *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Curriculum Design, Lab Environment Setup"
              className="text-xs h-9"
              required
            />
          </div>

          {/* Deliverable Details / Item */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Deliverable Details / Requirement</span>
              <span className="text-[10px] text-muted-foreground font-normal">Shown on sub-task card</span>
            </Label>
            <Input
              value={deliverable}
              onChange={(e) => setDeliverable(e.target.value)}
              placeholder="e.g. Event home page, Wireframes, Final Report"
              className="text-xs h-9"
            />
          </div>

          {/* Price & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Task Cost / Price (₹)</Label>
              <div className="relative">
                <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pl-8 text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Assign Staff Member</Label>
              <select
                value={assignedStaffId}
                onChange={(e) => setAssignedStaffId(e.target.value)}
                className="w-full h-9 text-xs bg-background rounded-md border border-input px-3 font-medium outline-none cursor-pointer text-foreground"
              >
                <option value="none">-- Unassigned --</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name} {s.role ? `(${s.role})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Single Dropdown for Task Cadence / Frequency */}
          <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Task Cadence / Frequency</span>
            </Label>
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value)}
              className="w-full h-9 text-xs bg-background rounded-md border border-input px-3 font-semibold outline-none cursor-pointer text-foreground shadow-2xs"
            >
              <option value="once">⚡ Once (One-Time)</option>
              <option value="daily">🔁 Daily Basis</option>
              <option value="weekly">📅 Weekly Basis</option>
              <option value="monthly">🗓️ Monthly Basis</option>
            </select>
          </div>

          {/* Duration & Scheduling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Duration Required</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    placeholder="1"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="pr-7 text-xs h-9 font-mono"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">h</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="0"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="pr-7 text-xs h-9 font-mono"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">m</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Deadline Date</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Deadline Time</Label>
                <div className="relative">
                  <Input
                    type="time"
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Urgency & Points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Urgency Level</Label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="w-full h-9 text-xs bg-background rounded-md border border-input px-3 font-medium outline-none cursor-pointer text-foreground"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Bonus Points</Label>
              <Input
                type="number"
                min="0"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="text-xs h-9 font-mono border-emerald-500/30"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-rose-700 dark:text-rose-400">Penalty Points</Label>
              <Input
                type="number"
                min="0"
                value={penaltyPoints}
                onChange={(e) => setPenaltyPoints(e.target.value)}
                className="text-xs h-9 font-mono border-rose-500/30"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="h-8 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
            >
              {saving ? "Saving Changes..." : "Save Sub-Task Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useState } from "react";
import {
  FileText,
  FileCode,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  Download,
  Loader2,
  Clock,
  User,
  Plus,
  Send,
  MessageSquare,
  CheckCircle2,
  Paperclip,
  Upload,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { requireBrowserLocation } from "@/app/lib/geolocation";
import { useAuthStore } from "@/store";
import { OperationTask, SubTask, TaskStatus } from "./page";

export type SubTaskWorkUpdateItem = {
  id: string;
  notes: string;
  status?: TaskStatus;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  created_at: string;
  created_by_id: number | string;
  created_by_name: string;
  created_by_role?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: OperationTask | null;
  subtask: SubTask | null;
  onSaved?: () => void;
};

export function SubTaskWorkUpdateDialog({
  open,
  onOpenChange,
  task,
  subtask,
  onSaved,
}: Props) {
  const { user } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>("keep");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!task || !subtask) return null;

  const currentUserId = user?.id ? String(user.id) : "";
  const roleCodes: string[] = (user as any)?.role_codes || [(user as any)?.role || (user as any)?.primary_role || ""];
  const isOwnerOrAdmin =
    Boolean((user as any)?.is_super_admin) ||
    roleCodes.some((r) =>
      ["platform_admin", "super_admin", "institution_admin", "school_owner", "college_owner", "university_owner", "director", "principal"].includes(r)
    );

  const existingUpdates: SubTaskWorkUpdateItem[] = Array.isArray((subtask as any).work_updates)
    ? (subtask as any).work_updates
    : [];

  const getFileIcon = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".pdf")) return <FileText className="w-4 h-4 text-rose-600 shrink-0" />;
    if (lower.endsWith(".doc") || lower.endsWith(".docx")) return <FileCode className="w-4 h-4 text-blue-600 shrink-0" />;
    if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp"))
      return <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />;
    return <FileText className="w-4 h-4 text-muted-foreground shrink-0" />;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExts = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp"];
    const lower = file.name.toLowerCase();
    const hasValidExt = validExts.some((ext) => lower.endsWith(ext));

    if (!hasValidExt) {
      toast.error("Please select a PDF, Word (.doc/.docx), or Image file (.jpg, .jpeg, .png)");
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() && !selectedFile) {
      toast.error("Please enter update notes or attach a file");
      return;
    }

    let startLoc: any = null;
    if (status === "in_progress" && subtask.status !== "in_progress") {
      try {
        toast.info("Requesting location to start deliverable...");
        startLoc = await requireBrowserLocation();
      } catch (locErr: any) {
        toast.error(locErr?.message || "Location permission is required to start a task. You cannot start without sharing location.");
        return;
      }
    }

    setSubmitting(true);
    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;

      // 1. Upload attachment if provided
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("documentType", "task_update");

        const uploadRes = await fetch("/api/admin/uploads/documents", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Failed to upload file");

        fileUrl = uploadData.data?.url || uploadData.url;
        fileName = selectedFile.name;
        fileType = selectedFile.name.split(".").pop()?.toLowerCase() || null;
      }

      // 2. Build work update record
      const newUpdateRecord: SubTaskWorkUpdateItem = {
        id: `upd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        notes: notes.trim(),
        status: status !== "keep" ? (status as TaskStatus) : undefined,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
        created_at: new Date().toISOString(),
        created_by_id: user?.id || "unknown",
        created_by_name: (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Staff Member",
        created_by_role: roleCodes[0] || "Staff",
      };

      // 3. Update the subtask inside task's sub_tasks array
      const currentSubtasks = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
      const subIndex = currentSubtasks.findIndex((s) => s.id === subtask.id);
      if (subIndex === -1) throw new Error("Sub-task not found in project");

      const updatedSub = {
        ...currentSubtasks[subIndex],
        status: status !== "keep" ? (status as TaskStatus) : currentSubtasks[subIndex].status,
        work_updates: [newUpdateRecord, ...existingUpdates],
      };
      currentSubtasks[subIndex] = updatedSub;

      // 4. Record history event
      const currentHistory = Array.isArray(task.history) ? [...task.history] : [];
      currentHistory.push({
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        action: "work_updated",
        timestamp: new Date().toISOString(),
        user_id: user?.id || null,
        user_name: newUpdateRecord.created_by_name,
        user_role: newUpdateRecord.created_by_role,
        subtask_id: subtask.id,
        subtask_title: subtask.title,
        new_status: status !== "keep" ? status : undefined,
        details: `Work update on "${subtask.title}": ${newUpdateRecord.notes}${fileName ? ` (Attached: ${fileName})` : ""}${status !== "keep" ? ` [Status: ${status}]` : ""}`,
      });

      // 5. Persist to DB
      const saveRes = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          sub_tasks: currentSubtasks,
          history: currentHistory,
          subtask_id: subtask.id,
          subtask_title: subtask.title,
          start_location: startLoc && startLoc.latitude ? startLoc : undefined,
          action: status === "in_progress" ? "start_task" : undefined,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to save work update");

      toast.success("Work update logged successfully!");
      setNotes("");
      setSelectedFile(null);
      setStatus("keep");
      onSaved?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to post work update");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    if (!confirm("Are you sure you want to delete this work update?")) return;

    try {
      const currentSubtasks = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
      const subIndex = currentSubtasks.findIndex((s) => s.id === subtask.id);
      if (subIndex === -1) throw new Error("Sub-task not found in project");

      const filtered = existingUpdates.filter((u) => u.id !== updateId);
      currentSubtasks[subIndex] = {
        ...currentSubtasks[subIndex],
        work_updates: filtered,
      };

      const saveRes = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          sub_tasks: currentSubtasks,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to delete work update");

      toast.success("Work update deleted");
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete work update");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[94vw] max-h-[88vh] flex flex-col p-0 overflow-hidden shadow-2xl border">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0 bg-background/95 backdrop-blur-xs">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span>Work Updates & Progress Log</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Deliverable: <strong className="text-foreground">{subtask.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Post New Update Form */}
          <form onSubmit={handleSubmitUpdate} className="p-4 rounded-xl border bg-muted/20 space-y-3">
            <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
              <Plus className="w-4 h-4 text-primary" /> Post Work Update
            </Label>

            <Textarea
              required={!selectedFile}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What progress did you make on this task? Enter notes, completed milestones, blockers..."
              className="text-xs min-h-[75px] bg-background"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Optional Attachment */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold flex items-center gap-1 text-muted-foreground">
                  <Paperclip className="w-3 h-3" /> Attach File (PDF, Word, Image)
                </Label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                  onChange={handleFileChange}
                  className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer w-full"
                />
              </div>

              {/* Status Update */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Update Task Status
                </Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-8 text-xs bg-background rounded-md border border-input px-2.5 font-medium outline-none focus:ring-1 focus:ring-ring cursor-pointer text-foreground"
                >
                  <option value="keep">Keep Current Status ({subtask.status})</option>
                  <option value="in_progress">In Progress</option>
                  <option value="under_review">Submit for Review</option>
                  <option value="completed">Mark Completed</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end pt-1">
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-primary font-bold text-xs gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {submitting ? "Posting..." : "Post Work Update"}
              </Button>
            </div>
          </form>

          {/* Timeline of Past Updates */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Past Updates & Deliverables ({existingUpdates.length})
            </h4>

            {existingUpdates.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed bg-muted/10 p-4 space-y-2">
                <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-semibold text-foreground">No work updates posted yet</p>
                <p className="text-[11px] text-muted-foreground">
                  Post daily updates above to record progress, work notes, and deliverable attachments.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {existingUpdates.map((upd) => {
                  const canDelete =
                    isOwnerOrAdmin || String(upd.created_by_id) === currentUserId;

                  const dateFormatted = upd.created_at
                    ? new Date(upd.created_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  return (
                    <div
                      key={upd.id}
                      className="p-3.5 rounded-xl border bg-card/60 hover:bg-card shadow-2xs space-y-2 text-xs transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-primary" />
                            {upd.created_by_name}
                          </span>
                          {upd.created_by_role && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-normal text-muted-foreground">
                              {upd.created_by_role}
                            </Badge>
                          )}
                          {upd.status && (
                            <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1.5 font-semibold capitalize">
                              {upd.status}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {dateFormatted}
                          </span>

                          {canDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteUpdate(upd.id)}
                              className="h-6 w-6 text-destructive hover:bg-destructive/10 -mr-1"
                              title="Delete update"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {upd.notes && (
                        <p className="text-foreground whitespace-pre-wrap leading-relaxed text-xs bg-background/60 p-2.5 rounded-lg border">
                          {upd.notes}
                        </p>
                      )}

                      {upd.file_url && (
                        <div className="pt-1 flex items-center gap-2">
                          <a
                            href={upd.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-background hover:bg-muted font-semibold text-xs text-primary transition-colors cursor-pointer"
                            title="Open attachment in browser"
                          >
                            {getFileIcon(upd.file_name || "")}
                            <span>{upd.file_name || "Attachment"}</span>
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>

                          <a
                            href={upd.file_url}
                            download={upd.file_name || "attachment"}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border bg-background hover:bg-muted font-semibold text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Download attachment"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


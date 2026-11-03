"use client";

import React, { useState, useEffect } from "react";
import {
  Upload,
  Edit2,
  Maximize2,
  FileText,
  FileCode,
  Image as ImageIcon,
  FileSpreadsheet,
  Video,
  Trash2,
  ExternalLink,
  Download,
  Loader2,
  Calendar,
  User,
  Clock,
  Plus,
  AlertCircle,
  X,
  CheckCircle2,
  Check,
  ClipboardPaste,
  History,
  MessageSquare,
  Send,
  Paperclip,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { OperationTask, SubTask } from "./page";

export type SubTaskCommentAttachment = {
  id: string;
  name: string;
  url: string;
  type?: string;
  size?: number;
  is_completed?: boolean;
};

export type SubTaskUploadComment = {
  id: string;
  user_id: number | string | null;
  user_name: string;
  user_role?: string;
  comment: string;
  created_at: string;
  attachments?: SubTaskCommentAttachment[];
  reply_to_comment_id?: string;
};

export type SubTaskUploadHistoryEntry = {
  id?: string;
  action: "uploaded" | "status_changed" | "comment_added" | string;
  status?: string;
  previous_status?: string;
  changed_at: string;
  changed_by_id?: number | string | null;
  changed_by_name: string;
  notes?: string | null;
};

export type SubTaskUploadItem = {
  id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  notes?: string | null;
  uploaded_at: string;
  uploaded_by_id: number | string;
  uploaded_by_name: string;
  uploaded_by_role?: string;
  status?: "pending" | "completed" | string;
  status_modified_at?: string;
  status_modified_by_id?: number | string;
  status_modified_by_name?: string;
  status_history?: SubTaskUploadHistoryEntry[];
  comments?: SubTaskUploadComment[];
};


export function getUploadStatusSelectClass(status?: string) {
  switch (status) {
    case "completed":
    case "passed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25";
    case "failed":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 hover:bg-rose-500/25";
    case "stuck":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40 hover:bg-orange-500/25";
    case "in_progress":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40 hover:bg-blue-500/25";
    case "ready_for_testing":
      return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40 hover:bg-purple-500/25";
    case "awaiting_confirmation":
      return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25";
    case "pending":
    default:
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/25";
  }
}

export function getUploadStatusBadgeClass(status?: string) {
  switch (status) {
    case "completed":
    case "passed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "failed":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "stuck":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
    case "in_progress":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    case "ready_for_testing":
      return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
    case "awaiting_confirmation":
      return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30";
    case "pending":
    default:
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  }
}

export function formatUploadStatusLabel(status?: string) {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "ready_for_testing":
      return "Ready for testing";
    case "passed":
      return "Passed";
    case "failed":
      return "Failed";
    case "stuck":
      return "Stuck";
    case "awaiting_confirmation":
      return "Awaiting confirmation";
    case "completed":
      return "Completed";
    case "pending":
    default:
      return "Pending";
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: OperationTask | null;
  subtask: SubTask | null;
  onSaved?: () => void;
};

export function SubTaskUploadDialog({
  open,
  onOpenChange,
  task,
  subtask,
  onSaved,
}: Props) {
  const { user } = useAuthStore();
  const accessToken = useAuthStore((state) => state.accessToken);

  const getAuthHeaders = (extra?: Record<string, string>) => {
    const h: Record<string, string> = { ...extra };
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    return h;
  };
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadNotes, setUploadNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deliverableMode, setDeliverableMode] = useState<"single" | "bulk">("single");
  const [bulkDeliverablesText, setBulkDeliverablesText] = useState("");
  const [bulkStripBullets, setBulkStripBullets] = useState(true);

  const parsedBulkDeliverables = React.useMemo(() => {
    if (!bulkDeliverablesText.trim()) return [];
    const lines = bulkDeliverablesText.split(/\r?\n/);
    const result: string[] = [];
    const seen = new Set<string>();

    for (const rawLine of lines) {
      let line = rawLine.trim();
      if (!line) continue;

      if (bulkStripBullets) {
        line = line.replace(/^(\d+[\.\)]\s*|[-*•]\s*)/, "").trim();
      }

      if (!line) continue;
      const lower = line.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      result.push(line);
    }

    return result;
  }, [bulkDeliverablesText, bulkStripBullets]);

  const handleBulkDeliverablesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedBulkDeliverables.length === 0) {
      toast.error("Please enter at least one deliverable name (one per line)");
      return;
    }
    if (!task || !subtask) return;

    setUploading(true);
    try {
      const authorName = (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Staff Member";
      const nowIso = new Date().toISOString();

      const newRecords: SubTaskUploadItem[] = parsedBulkDeliverables.map((itemTitle, idx) => ({
        id: `task_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        file_name: itemTitle,
        file_url: "",
        file_type: "task_item",
        file_size: 0,
        notes: null,
        uploaded_at: nowIso,
        uploaded_by_id: user?.id || "unknown",
        uploaded_by_name: authorName,
        uploaded_by_role: roleCodes[0] || "Staff",
        status: "pending",
        status_history: [
          {
            id: `uph_${Date.now()}_${idx}`,
            action: "task_created",
            status: "pending",
            changed_at: nowIso,
            changed_by_id: user?.id || null,
            changed_by_name: authorName,
            notes: `Bulk deliverable created: ${itemTitle}`,
          },
        ],
        comments: [],
      }));

      const updatedUploads = [...newRecords, ...uploadsList];
      setUploadsList(updatedUploads);

      const currentSubtasks = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
      const subIndex = currentSubtasks.findIndex((s) => String(s.id) === String(subtask.id));
      if (subIndex === -1) throw new Error("Sub-task not found in project");

      currentSubtasks[subIndex] = {
        ...currentSubtasks[subIndex],
        uploads: updatedUploads,
      };

      const currentHistory = Array.isArray(task.history) ? [...task.history] : [];
      currentHistory.push({
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        action: "deliverable_bulk_created",
        timestamp: nowIso,
        user_id: user?.id || null,
        user_name: authorName,
        user_role: roleCodes[0] || "Staff",
        subtask_id: subtask.id,
        subtask_title: subtask.title,
        details: `Created ${newRecords.length} bulk deliverables on "${subtask.title}"`,
      });

      const saveRes = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id: task.id,
          sub_tasks: currentSubtasks,
          history: currentHistory,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to save bulk deliverables");

      if (saveData.task && Array.isArray(saveData.task.sub_tasks)) {
        const savedSub = saveData.task.sub_tasks.find((s: any) => String(s.id) === String(subtask.id));
        if (savedSub && Array.isArray(savedSub.uploads)) {
          setUploadsList(savedSub.uploads);
        }
      }

      toast.success(`Created ${newRecords.length} deliverables successfully!`);
      setBulkDeliverablesText("");
      onSaved?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create bulk deliverables");
    } finally {
      setUploading(false);
    }
  };
  const [editingItem, setEditingItem] = useState<SubTaskUploadItem | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemNotes, setEditItemNotes] = useState("");
  const [editItemStatus, setEditItemStatus] = useState("pending");
  const [savingEditItem, setSavingEditItem] = useState(false);


  const handleOpenEditItem = (item: SubTaskUploadItem) => {
    setEditingItem(item);
    setEditItemName(item.file_name || "");
    setEditItemNotes(item.notes || "");
    setEditItemStatus(item.status || "pending");
  };

  const handleSaveEditedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !task || !subtask) return;
    if (!editItemName.trim()) {
      toast.error("Please enter a deliverable / task name");
      return;
    }

    setSavingEditItem(true);
    try {
      const authorName = (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Staff Member";
      const nowIso = new Date().toISOString();

      const updatedUploads = uploadsList.map((upl) => {
        if (upl.id !== editingItem.id) return upl;

        const hist = Array.isArray(upl.status_history) ? [...upl.status_history] : [];
        if (upl.status !== editItemStatus) {
          hist.push({
            id: `uph_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            action: "status_changed",
            status: editItemStatus,
            previous_status: upl.status,
            changed_at: nowIso,
            changed_by_id: user?.id || null,
            changed_by_name: authorName,
            notes: `Status updated to ${editItemStatus}`,
          });
        }
        hist.push({
          id: `uph_${Date.now()}_edit`,
          action: "item_edited",
          status: editItemStatus,
          changed_at: nowIso,
          changed_by_id: user?.id || null,
          changed_by_name: authorName,
          notes: `Edited title/notes`,
        });

        return {
          ...upl,
          file_name: editItemName.trim(),
          notes: editItemNotes.trim() || null,
          status: editItemStatus,
          status_modified_at: nowIso,
          status_modified_by_id: user?.id || null,
          status_modified_by_name: authorName,
          status_history: hist,
        };
      });

      setUploadsList(updatedUploads);

      const currentSubtasks = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
      const subIndex = currentSubtasks.findIndex((s) => String(s.id) === String(subtask.id));
      if (subIndex !== -1) {
        currentSubtasks[subIndex] = {
          ...currentSubtasks[subIndex],
          uploads: updatedUploads,
        };
      }

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id: task.id,
          sub_tasks: currentSubtasks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update deliverable item");

      toast.success("Deliverable item updated successfully!");
      setEditingItem(null);
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save changes");
    } finally {
      setSavingEditItem(false);
    }
  };

  // Inline comment state below attachments
  const [inlineCommentText, setInlineCommentText] = useState<Record<string, string>>({});

  // Toggle completion checkbox on comment attachment (default pending; green tick when completed)
  const handleToggleAttachmentCompletion = async (uploadId: string, commentId: string, attId: string) => {
    if (!task || !subtask) return;

    const updatedUploads = uploadsList.map((upl) => {
      if (upl.id !== uploadId) return upl;

      const updatedComments = (upl.comments || []).map((c) => {
        if (c.id !== commentId) return c;
        const updatedAtts = (c.attachments || []).map((a) => {
          if (a.id === attId) {
            return { ...a, is_completed: !a.is_completed };
          }
          return a;
        });
        return { ...c, attachments: updatedAtts };
      });

      return { ...upl, comments: updatedComments };
    });

    setUploadsList(updatedUploads);

    try {
      const currentSubtasks = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
      const subIndex = currentSubtasks.findIndex((s: any) => String(s.id) === String(subtask.id));
      if (subIndex !== -1) {
        currentSubtasks[subIndex] = {
          ...currentSubtasks[subIndex],
          uploads: updatedUploads,
        };
      }

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id: task.id,
          sub_tasks: currentSubtasks,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      toast.success("Attachment status updated");
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
      setUploadsList(uploadsList);
    }
  };

  // Post comment directly below an attachment
  const handlePostInlineComment = async (uploadId: string, replyToCommentId: string, replyToAuthor: string) => {
    const text = (inlineCommentText[replyToCommentId] || "").trim();
    if (!text || !task || !subtask) return;

    setPostingCommentFor(uploadId);
    try {
      const authorName = (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Staff Member";
      const authorRole = roleCodes[0] || (user as any)?.role || "Staff";

      const newComment: SubTaskUploadComment = {
        id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: user?.id || null,
        user_name: authorName,
        user_role: authorRole,
        comment: text,
        created_at: new Date().toISOString(),
        attachments: [],
        reply_to_comment_id: replyToCommentId,
      };

      const updatedUploads = uploadsList.map((upl) => {
        if (upl.id !== uploadId) return upl;
        const currentComments = Array.isArray(upl.comments) ? [...upl.comments] : [];
        const hist = Array.isArray(upl.status_history) ? [...upl.status_history] : [];
        hist.push({
          id: `uph_${Date.now()}_comm`,
          action: "comment_added",
          status: upl.status,
          changed_at: new Date().toISOString(),
          changed_by_id: user?.id || null,
          changed_by_name: authorName,
          notes: `Commented: "${text.substring(0, 80)}"`,
        });

        return {
          ...upl,
          comments: [...currentComments, newComment],
          status_history: hist,
        };
      });

      setUploadsList(updatedUploads);
      setInlineCommentText((prev) => ({ ...prev, [replyToCommentId]: "" }));

      const currentSubtasks = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
      const subIndex = currentSubtasks.findIndex((s: any) => String(s.id) === String(subtask.id));
      if (subIndex !== -1) {
        currentSubtasks[subIndex] = {
          ...currentSubtasks[subIndex],
          uploads: updatedUploads,
        };
      }

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id: task.id,
          sub_tasks: currentSubtasks,
        }),
      });

      if (!res.ok) throw new Error("Failed to post comment");
      toast.success("Comment posted successfully!");
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to post comment");
    } finally {
      setPostingCommentFor(null);
    }
  };

  // Dedicated reactive state for uploads to ensure instant UI updates & avoid stale props
  const [uploadsList, setUploadsList] = useState<SubTaskUploadItem[]>(() => {
    let list: SubTaskUploadItem[] = Array.isArray((subtask as any)?.uploads) ? [...(subtask as any).uploads] : [];
    if (subtask?.image_url && !list.some((u: any) => u.file_url === subtask.image_url)) {
      list.unshift({
        id: `pasted_${subtask.id}_0`,
        file_name: subtask.image_name || "Pasted Screenshot.png",
        file_url: subtask.image_url,
        file_type: "png",
        uploaded_at: new Date().toISOString(),
        uploaded_by_id: "admin",
        uploaded_by_name: "Platform Admin",
        status: "pending",
      });
    }
    if (Array.isArray((subtask as any)?.images)) {
      (subtask as any).images.forEach((img: any, iIdx: number) => {
        if (img?.url && !list.some((u: any) => u.file_url === img.url)) {
          list.push({
            id: `img_${subtask.id}_${iIdx}`,
            file_name: img.name || `Image_${iIdx + 1}.png`,
            file_url: img.url,
            file_type: "png",
            uploaded_at: new Date().toISOString(),
            uploaded_by_id: "admin",
            uploaded_by_name: "Platform Admin",
            status: "pending",
          });
        }
      });
    }
    return list;
  });

  // Keep uploadsList in sync whenever a new subtask prop arrives
  useEffect(() => {
    if (subtask) {
      let list: SubTaskUploadItem[] = Array.isArray((subtask as any)?.uploads) ? [...(subtask as any).uploads] : [];
      if (subtask.image_url && !list.some((u: any) => u.file_url === subtask.image_url)) {
        list.unshift({
          id: `pasted_${subtask.id}_${Date.now()}`,
          file_name: subtask.image_name || "Pasted Screenshot.png",
          file_url: subtask.image_url,
          file_type: "png",
          uploaded_at: new Date().toISOString(),
          uploaded_by_id: user?.id || "admin",
          uploaded_by_name: user?.full_name || "Platform Admin",
          status: "pending",
        });
      }
      if (Array.isArray((subtask as any)?.images)) {
        (subtask as any).images.forEach((img: any, iIdx: number) => {
          if (img?.url && !list.some((u: any) => u.file_url === img.url)) {
            list.push({
              id: `img_${subtask.id}_${iIdx}`,
              file_name: img.name || `Image_${iIdx + 1}.png`,
              file_url: img.url,
              file_type: "png",
              uploaded_at: new Date().toISOString(),
              uploaded_by_id: user?.id || "admin",
              uploaded_by_name: user?.full_name || "Platform Admin",
              status: "pending",
            });
          }
        });
      }
      setUploadsList(list);
    }
  }, [subtask, user]);

  // Sidebar Drawer state: opens Comments or History in a dedicated right-side panel
  const [activeSidebar, setActiveSidebar] = useState<{
    uploadId: string;
    tab: "comments" | "history";
  } | null>(null);

  // Comments state
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentAttachments, setCommentAttachments] = useState<Record<string, SubTaskCommentAttachment[]>>({});
  const [uploadingCommentAttFor, setUploadingCommentAttFor] = useState<string | null>(null);
  const [postingCommentFor, setPostingCommentFor] = useState<string | null>(null);

  // Lightbox / Image Preview Popup state
  const [previewModalItem, setPreviewModalItem] = useState<{
    url: string;
    name: string;
    userName?: string;
    userRole?: string;
    message?: string;
    date?: string;
    type?: string;
    size?: number;
  } | null>(null);

  const isImageAttachment = (url?: string, name?: string, type?: string) => {
    if (type && type.startsWith("image/")) return true;
    const target = `${url || ""} ${name || ""}`.toLowerCase();
    return Boolean(target.match(/\.(png|jpg|jpeg|webp|gif|svg)(\?|$)/i));
  };

  if (!task || !subtask) return null;

  const activeFile = activeSidebar
    ? uploadsList.find((u) => u.id === activeSidebar.uploadId)
    : null;

  const currentUserId = user?.id ? String(user.id) : "";
  const roleCodes: string[] = (user as any)?.role_codes || [(user as any)?.role || (user as any)?.primary_role || ""];
  const isOwnerOrAdmin =
    Boolean((user as any)?.is_super_admin) ||
    roleCodes.some((r) =>
      ["platform_admin", "super_admin", "institution_admin", "school_owner", "college_owner", "university_owner", "director", "principal"].includes(r)
    );

  const getFileIcon = (fileName: string) => {
    const lower = (fileName || "").toLowerCase();
    if (lower.endsWith(".pdf")) return <FileText className="w-4 h-4 text-rose-600 shrink-0" />;
    if (lower.endsWith(".doc") || lower.endsWith(".docx")) return <FileCode className="w-4 h-4 text-blue-600 shrink-0" />;
    if (lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".csv"))
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />;
    if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm") || lower.endsWith(".avi") || lower.endsWith(".mkv"))
      return <Video className="w-4 h-4 text-purple-600 shrink-0" />;
    if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp") || lower.endsWith(".gif") || lower.endsWith(".svg"))
      return <ImageIcon className="w-4 h-4 text-indigo-600 shrink-0" />;
    return <FileText className="w-4 h-4 text-muted-foreground shrink-0" />;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExts = [
      ".pdf", ".doc", ".docx",
      ".xls", ".xlsx", ".csv",
      ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg",
      ".mp4", ".mov", ".webm", ".avi", ".mkv"
    ];
    const lower = file.name.toLowerCase();
    const hasValidExt = validExts.some((ext) => lower.endsWith(ext));

    if (!hasValidExt) {
      toast.error("Please upload an Image, Video (.mp4, .mov, etc.), PDF, Word (.doc/.docx), or Excel (.xls/.xlsx/.csv) file");
      return;
    }

    setSelectedFile(file);
  };

  // Upload single chosen file or create task item if no file chosen
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setUploading(true);
    try {
      const authorName = (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Staff Member";
      const nowIso = new Date().toISOString();

      let newUploadRecord: SubTaskUploadItem;
      let toastMsg = "Task created successfully!";

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("documentType", "task_deliverable");

        const uploadRes = await fetch("/api/admin/uploads/documents", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Failed to upload document");

        const fileUrl = uploadData.data?.url || uploadData.url;
        if (!fileUrl) throw new Error("Did not receive uploaded file URL");

        newUploadRecord = {
          id: `upl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          file_name: selectedFile.name,
          file_url: fileUrl,
          file_type: selectedFile.name.split(".").pop()?.toLowerCase(),
          file_size: selectedFile.size,
          notes: uploadNotes.trim() || null,
          uploaded_at: nowIso,
          uploaded_by_id: user?.id || "unknown",
          uploaded_by_name: authorName,
          uploaded_by_role: roleCodes[0] || "Staff",
          status: "pending",
          status_history: [
            {
              id: `uph_${Date.now()}_0`,
              action: "uploaded",
              status: "pending",
              changed_at: nowIso,
              changed_by_id: user?.id || null,
              changed_by_name: authorName,
              notes: uploadNotes.trim() || null,
            },
          ],
          comments: [],
        };
        toastMsg = "Task file uploaded successfully!";
      } else {
        // Create task without file using deliverable name
        const enteredText = uploadNotes.trim();
        if (!enteredText && !selectedFile) {
          toast.error("Please enter a task name or description");
          setUploading(false);
          return;
        }
        const taskName = enteredText ? (enteredText.length > 80 ? enteredText.substring(0, 77) + "..." : enteredText) : (subtask.title || "Deliverable Task");
        newUploadRecord = {
          id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          file_name: taskName,
          file_url: "",
          file_type: "task_item",
          file_size: 0,
          notes: uploadNotes.trim() || null,
          uploaded_at: nowIso,
          uploaded_by_id: user?.id || "unknown",
          uploaded_by_name: authorName,
          uploaded_by_role: roleCodes[0] || "Staff",
          status: "pending",
          status_history: [
            {
              id: `uph_${Date.now()}_0`,
              action: "task_created",
              status: "pending",
              changed_at: nowIso,
              changed_by_id: user?.id || null,
              changed_by_name: authorName,
              notes: uploadNotes.trim()
                ? `Task created: ${uploadNotes.trim()}`
                : `Task created for deliverable "${subtask.title}"`,
            },
          ],
          comments: [],
        };
      }

      const updatedUploads = [newUploadRecord, ...uploadsList];
      setUploadsList(updatedUploads);

      const currentSubtasks = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
      const subIndex = currentSubtasks.findIndex((s) => String(s.id) === String(subtask.id));
      if (subIndex === -1) throw new Error("Sub-task not found in project");

      currentSubtasks[subIndex] = {
        ...currentSubtasks[subIndex],
        uploads: updatedUploads,
      };

      const currentHistory = Array.isArray(task.history) ? [...task.history] : [];
      currentHistory.push({
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        action: selectedFile ? "task_file_uploaded" : "deliverable_task_created",
        timestamp: nowIso,
        user_id: user?.id || null,
        user_name: newUploadRecord.uploaded_by_name,
        user_role: newUploadRecord.uploaded_by_role,
        subtask_id: subtask.id,
        subtask_title: subtask.title,
        details: selectedFile
          ? `Uploaded file "${newUploadRecord.file_name}" on deliverable "${subtask.title}"${newUploadRecord.notes ? `: ${newUploadRecord.notes}` : ""}`
          : `Created task "${newUploadRecord.file_name}" on deliverable "${subtask.title}"${newUploadRecord.notes ? `: ${newUploadRecord.notes}` : ""}`,
      });

      const saveRes = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id: task.id,
          sub_tasks: currentSubtasks,
          history: currentHistory,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to save task");

      if (saveData.task && Array.isArray(saveData.task.sub_tasks)) {
        const savedSub = saveData.task.sub_tasks.find((s: any) => String(s.id) === String(subtask.id));
        if (savedSub && Array.isArray(savedSub.uploads)) {
          setUploadsList(savedSub.uploads);
        }
      }

      toast.success(toastMsg);
      setSelectedFile(null);
      const fileInput = document.getElementById("subtask-file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      setUploadNotes("");
      onSaved?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create task");
    } finally {
      setUploading(false);
    }
  };

  // Paste multiple images directly from clipboard into main upload form (Ctrl+V)
  const handlePasteImages = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    const files = e.clipboardData?.files;
    const imageFiles: File[] = [];

    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const blob = items[i].getAsFile();
          if (blob) imageFiles.push(blob);
        }
      }
    }

    if (imageFiles.length === 0 && files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/") || file.name.match(/\.(png|jpg|jpeg|webp|gif)/i)) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length === 0) return;

    e.preventDefault();
    setUploading(true);
    const toastId = toast.loading(`Uploading ${imageFiles.length} pasted image${imageFiles.length > 1 ? "s" : ""}...`);

    try {
      const newUploadRecords: SubTaskUploadItem[] = [];
      const authorName = (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Staff Member";
      const nowIso = new Date().toISOString();

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const generatedName = file.name && !file.name.startsWith("image.")
          ? file.name
          : `screenshot_${Date.now()}_${i + 1}.png`;

        const formData = new FormData();
        formData.append("file", file, generatedName);
        formData.append("documentType", "task_deliverable");

        const uploadRes = await fetch("/api/admin/uploads/documents", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Failed to upload pasted image");

        const fileUrl = uploadData.data?.url || uploadData.url;
        if (!fileUrl) throw new Error("Did not receive uploaded image URL");

        newUploadRecords.push({
          id: `upl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${i}`,
          file_name: generatedName,
          file_url: fileUrl,
          file_type: "png",
          file_size: file.size,
          notes: uploadNotes.trim() || "Pasted screenshot",
          uploaded_at: nowIso,
          uploaded_by_id: user?.id || "unknown",
          uploaded_by_name: authorName,
          uploaded_by_role: roleCodes[0] || "Staff",
          status: "pending",
          status_history: [
            {
              id: `uph_${Date.now()}_${i}`,
              action: "uploaded",
              status: "pending",
              changed_at: nowIso,
              changed_by_id: user?.id || null,
              changed_by_name: authorName,
              notes: uploadNotes.trim() || "Pasted screenshot",
            },
          ],
          comments: [],
        });
      }

      // Optimistically update uploads list so it immediately appears in the dialog!
      const updatedUploads = [...newUploadRecords, ...uploadsList];
      setUploadsList(updatedUploads);

      const currentSubtasks = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
      const subIndex = currentSubtasks.findIndex((s) => String(s.id) === String(subtask.id));
      if (subIndex === -1) throw new Error("Sub-task not found in project");

      currentSubtasks[subIndex] = {
        ...currentSubtasks[subIndex],
        uploads: updatedUploads,
      };

      const currentHistory = Array.isArray(task.history) ? [...task.history] : [];
      currentHistory.push({
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        action: "task_file_uploaded",
        timestamp: nowIso,
        user_id: user?.id || null,
        user_name: newUploadRecords[0].uploaded_by_name,
        user_role: newUploadRecords[0].uploaded_by_role,
        subtask_id: subtask.id,
        subtask_title: subtask.title,
        details: `Pasted ${newUploadRecords.length} image(s) on deliverable "${subtask.title}"`,
      });

      const saveRes = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id: task.id,
          sub_tasks: currentSubtasks,
          history: currentHistory,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to save pasted images to task");

      // Sync confirmed state from server response
      if (saveData.task && Array.isArray(saveData.task.sub_tasks)) {
        const savedSub = saveData.task.sub_tasks.find((s: any) => String(s.id) === String(subtask.id));
        if (savedSub && Array.isArray(savedSub.uploads)) {
          setUploadsList(savedSub.uploads);
        }
      }

      toast.success(`${newUploadRecords.length} image${newUploadRecords.length > 1 ? "s" : ""} pasted and uploaded!`, { id: toastId });
      setUploadNotes("");
      onSaved?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload pasted image", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  // Upload files attached directly to a comment (images, docx, excel, pdf, etc.)
  const uploadCommentFiles = async (uploadId: string, files: File[]) => {
    if (!files || files.length === 0) return;
    setUploadingCommentAttFor(uploadId);
    const toastId = toast.loading(`Uploading ${files.length} attachment${files.length > 1 ? "s" : ""}...`);

    try {
      const uploadedList: SubTaskCommentAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentType", "comment_attachment");

        const res = await fetch("/api/admin/uploads/documents", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to upload ${file.name}`);

        const fileUrl = data.data?.url || data.url;
        if (!fileUrl) throw new Error("File URL not returned");

        const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
        uploadedList.push({
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${i}`,
          name: file.name,
          url: fileUrl,
          type: fileExt,
          size: file.size,
        });
      }

      setCommentAttachments((prev) => ({
        ...prev,
        [uploadId]: [...(prev[uploadId] || []), ...uploadedList],
      }));

      toast.success(`${uploadedList.length} attachment${uploadedList.length > 1 ? "s" : ""} ready!`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to attach files", { id: toastId });
    } finally {
      setUploadingCommentAttFor(null);
    }
  };

  // Paste multiple images into comment box
  const handlePasteComment = async (uploadId: string, e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    const files = e.clipboardData?.files;
    const imageFiles: File[] = [];

    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const blob = items[i].getAsFile();
          if (blob) {
            const ext = blob.type.split("/")[1] || "png";
            const namedFile =
              blob instanceof File && blob.name && blob.name !== "image.png"
                ? blob
                : new File([blob], `screenshot_${Date.now()}_${i}.${ext}`, { type: blob.type || "image/png" });
            imageFiles.push(namedFile);
          }
        }
      }
    }

    if (imageFiles.length === 0 && files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.type.startsWith("image/") || f.name.match(/\.(png|jpg|jpeg|webp|gif)/i)) {
          imageFiles.push(f);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      await uploadCommentFiles(uploadId, imageFiles);
    }
  };

  // Handle comment file input change (PDF, Word, Excel, Images)
  const handleCommentFileInputChange = async (uploadId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await uploadCommentFiles(uploadId, files);
    e.target.value = "";
  };

  const handleRemoveCommentAttachment = (uploadId: string, attId: string) => {
    setCommentAttachments((prev) => ({
      ...prev,
      [uploadId]: (prev[uploadId] || []).filter((a) => a.id !== attId),
    }));
  };

  // Update status of individual uploaded file (pending <-> completed)
  const handleUploadStatusChange = async (uploadId: string, newStatus: string) => {
    setSaving(true);
    try {
      const modifierName = (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Staff Member";
      const modifierId = user?.id || null;
      const nowIso = new Date().toISOString();

      let targetFileName = uploadId;
      const updatedUploads = uploadsList.map((upl) => {
        if (upl.id === uploadId) {
          targetFileName = upl.file_name;
          const prevStatus = upl.status || "pending";
          const newHistoryEntry: SubTaskUploadHistoryEntry = {
            id: `uph_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            action: "status_changed",
            status: newStatus,
            previous_status: prevStatus,
            changed_at: nowIso,
            changed_by_id: modifierId,
            changed_by_name: modifierName,
          };

          const existingHist = Array.isArray(upl.status_history) ? [...upl.status_history] : [];
          if (existingHist.length === 0) {
            existingHist.push({
              id: `uph_init_${upl.id}`,
              action: "uploaded",
              status: "pending",
              changed_at: upl.uploaded_at || nowIso,
              changed_by_id: upl.uploaded_by_id || null,
              changed_by_name: upl.uploaded_by_name || "Staff Member",
              notes: upl.notes || null,
            });
          }
          existingHist.push(newHistoryEntry);

          return {
            ...upl,
            status: newStatus,
            status_modified_at: nowIso,
            status_modified_by_id: modifierId,
            status_modified_by_name: modifierName,
            status_history: existingHist,
          };
        }
        return upl;
      });

      setUploadsList(updatedUploads);

      const currentSubtasks = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
      const subIndex = currentSubtasks.findIndex((s) => String(s.id) === String(subtask.id));
      if (subIndex === -1) throw new Error("Sub-task not found in project");

      currentSubtasks[subIndex] = {
        ...currentSubtasks[subIndex],
        uploads: updatedUploads,
      };

      const currentHistory = Array.isArray(task.history) ? [...task.history] : [];
      currentHistory.push({
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        action: "task_file_status_updated",
        timestamp: nowIso,
        user_id: modifierId,
        user_name: modifierName,
        user_role: roleCodes[0] || "Staff",
        subtask_id: subtask.id,
        subtask_title: subtask.title,
        details: `Updated status of file "${targetFileName}" to "${newStatus}" on deliverable "${subtask.title}"`,
      });

      const saveRes = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id: task.id,
          sub_tasks: currentSubtasks,
          history: currentHistory,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to update file status");

      if (saveData.task && Array.isArray(saveData.task.sub_tasks)) {
        const savedSub = saveData.task.sub_tasks.find((s: any) => String(s.id) === String(subtask.id));
        if (savedSub && Array.isArray(savedSub.uploads)) {
          setUploadsList(savedSub.uploads);
        }
      }

      toast.success(`File marked as ${newStatus}`);
      onSaved?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update file status");
    } finally {
      setSaving(false);
    }
  };

  // Add comment to individual file (with optional text & attachments)
  const handleAddComment = async (uploadId: string) => {
    const commentText = (commentDrafts[uploadId] || "").trim();
    const currentAtts = commentAttachments[uploadId] || [];

    if (!commentText && currentAtts.length === 0) {
      toast.error("Please enter a comment or attach a file/image");
      return;
    }

    setPostingCommentFor(uploadId);
    try {
      const authorName = (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Staff Member";
      const authorId = user?.id || null;
      const authorRole = roleCodes[0] || "Staff";
      const nowIso = new Date().toISOString();

      let targetFileName = uploadId;
      const updatedUploads = uploadsList.map((upl) => {
        if (upl.id === uploadId) {
          targetFileName = upl.file_name;
          const newComment: SubTaskUploadComment = {
            id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            user_id: authorId,
            user_name: authorName,
            user_role: authorRole,
            comment: commentText,
            created_at: nowIso,
            attachments: currentAtts,
          };

          const existingComments = Array.isArray(upl.comments) ? [...upl.comments] : [];
          existingComments.push(newComment);

          const existingHist = Array.isArray(upl.status_history) ? [...upl.status_history] : [];
          if (existingHist.length === 0) {
            existingHist.push({
              id: `uph_init_${upl.id}`,
              action: "uploaded",
              status: upl.status || "pending",
              changed_at: upl.uploaded_at || nowIso,
              changed_by_id: upl.uploaded_by_id || null,
              changed_by_name: upl.uploaded_by_name || "Staff Member",
              notes: upl.notes || null,
            });
          }
          existingHist.push({
            id: `uph_comm_${Date.now()}`,
            action: "comment_added",
            status: upl.status || "pending",
            changed_at: nowIso,
            changed_by_id: authorId,
            changed_by_name: authorName,
            notes: commentText || `Attached ${currentAtts.length} file(s)`,
          });

          return {
            ...upl,
            comments: existingComments,
            status_history: existingHist,
          };
        }
        return upl;
      });

      setUploadsList(updatedUploads);

      const currentSubtasks = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
      const subIndex = currentSubtasks.findIndex((s) => String(s.id) === String(subtask.id));
      if (subIndex === -1) throw new Error("Sub-task not found in project");

      currentSubtasks[subIndex] = {
        ...currentSubtasks[subIndex],
        uploads: updatedUploads,
      };

      const currentHistory = Array.isArray(task.history) ? [...task.history] : [];
      currentHistory.push({
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        action: "task_file_comment_added",
        timestamp: nowIso,
        user_id: authorId,
        user_name: authorName,
        user_role: authorRole,
        subtask_id: subtask.id,
        subtask_title: subtask.title,
        details: `Commented on file "${targetFileName}"${currentAtts.length > 0 ? ` (with ${currentAtts.length} file(s))` : ""}${commentText ? `: "${commentText}"` : ""}`,
      });

      const saveRes = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id: task.id,
          sub_tasks: currentSubtasks,
          history: currentHistory,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to post comment");

      if (saveData.task && Array.isArray(saveData.task.sub_tasks)) {
        const savedSub = saveData.task.sub_tasks.find((s: any) => String(s.id) === String(subtask.id));
        if (savedSub && Array.isArray(savedSub.uploads)) {
          setUploadsList(savedSub.uploads);
        }
      }

      toast.success("Comment added!");
      setCommentDrafts((prev) => ({ ...prev, [uploadId]: "" }));
      setCommentAttachments((prev) => ({ ...prev, [uploadId]: [] }));
      onSaved?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to post comment");
    } finally {
      setPostingCommentFor(null);
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    if (!confirm("Are you sure you want to delete this uploaded file?")) return;

    setSaving(true);
    try {
      const filteredUploads = uploadsList.filter((u) => u.id !== uploadId);
      setUploadsList(filteredUploads);

      // If deleted file was currently open in sidebar, close sidebar
      if (activeSidebar?.uploadId === uploadId) {
        setActiveSidebar(null);
      }

      const currentSubtasks = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
      const subIndex = currentSubtasks.findIndex((s) => String(s.id) === String(subtask.id));
      if (subIndex === -1) throw new Error("Sub-task not found in project");

      const uploadToDelete = uploadsList.find((u) => u.id === uploadId);

      currentSubtasks[subIndex] = {
        ...currentSubtasks[subIndex],
        uploads: filteredUploads,
      };

      const currentHistory = Array.isArray(task.history) ? [...task.history] : [];
      currentHistory.push({
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        action: "task_file_deleted",
        timestamp: new Date().toISOString(),
        user_id: user?.id || null,
        user_name: (user as any)?.full_name || (user as any)?.name || "User",
        user_role: roleCodes[0] || "Staff",
        subtask_id: subtask.id,
        subtask_title: subtask.title,
        details: `Deleted file "${uploadToDelete?.file_name || uploadId}" from deliverable "${subtask.title}"`,
      });

      const saveRes = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id: task.id,
          sub_tasks: currentSubtasks,
          history: currentHistory,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to delete file");

      if (saveData.task && Array.isArray(saveData.task.sub_tasks)) {
        const savedSub = saveData.task.sub_tasks.find((s: any) => String(s.id) === String(subtask.id));
        if (savedSub && Array.isArray(savedSub.uploads)) {
          setUploadsList(savedSub.uploads);
        }
      }

      toast.success("File deleted successfully");
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete file");
    } finally {
      setSaving(false);
    }
  };

  // Compile all history events for an upload item (latest first)
  const getUploadHistoryList = (upl: SubTaskUploadItem) => {
    if (Array.isArray(upl.status_history) && upl.status_history.length > 0) {
      return [...upl.status_history].sort(
        (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
      );
    }

    const list: Array<{
      id: string;
      action: string;
      status?: string;
      previous_status?: string;
      changed_at: string;
      changed_by_name: string;
      notes?: string | null;
    }> = [];

    if (upl.status_modified_at) {
      list.push({
        id: `synth_mod_${upl.id}`,
        action: "status_changed",
        status: upl.status || "pending",
        changed_at: upl.status_modified_at,
        changed_by_name: upl.status_modified_by_name || "Staff Member",
      });
    }

    list.push({
      id: `synth_upl_${upl.id}`,
      action: "uploaded",
      status: "pending",
      changed_at: upl.uploaded_at || new Date().toISOString(),
      changed_by_name: upl.uploaded_by_name || "Staff Member",
      notes: upl.notes || null,
    });

    return list;
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setActiveSidebar(null);
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent
          className={cn(
            "w-[96vw] max-h-[90vh] flex flex-row p-0 overflow-hidden shadow-2xl border transition-all duration-200",
            activeSidebar && activeFile
              ? "max-w-6xl md:max-w-7xl"
              : "sm:max-w-2xl max-w-2xl"
          )}
        >
          {/* Main Deliverables & Tasks Left Panel */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden" onPaste={handlePasteImages}>
          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0 bg-background/95 backdrop-blur-xs">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              <span>Uploaded Task Files & Deliverables</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Deliverable: <strong className="text-foreground">{subtask.title}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5" onPaste={handlePasteImages}>
            {/* Deliverable Creation Header: Single Deliverable / Bulk Deliverable Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/70">
                  <button
                    type="button"
                    onClick={() => setDeliverableMode("single")}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                      deliverableMode === "single"
                        ? "bg-background text-foreground shadow-xs border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Single Deliverable</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliverableMode("bulk")}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                      deliverableMode === "bulk"
                        ? "bg-background text-foreground shadow-xs border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Bulk Deliverable</span>
                    {parsedBulkDeliverables.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-0.5">
                        {parsedBulkDeliverables.length}
                      </Badge>
                    )}
                  </button>
                </div>

                {deliverableMode === "bulk" && (
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={bulkStripBullets}
                      onChange={(e) => setBulkStripBullets(e.target.checked)}
                      className="rounded text-primary h-3.5 w-3.5"
                    />
                    <span>Strip bullets & numbering</span>
                  </label>
                )}
              </div>

              {deliverableMode === "single" ? (
                /* Single Deliverable Form */
                <form
                  onSubmit={handleUploadSubmit}
                  onPaste={handlePasteImages}
                  className="p-3 rounded-xl border border-primary/30 bg-primary/5 relative group"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={uploadNotes}
                      onChange={(e) => setUploadNotes(e.target.value)}
                      onPaste={handlePasteImages}
                      placeholder="Optional description / notes for this task (or paste multiple screenshots directly here with Ctrl+V)..."
                      className="text-xs h-9 bg-background flex-1"
                      autoFocus
                    />

                    <Button
                      type="submit"
                      size="sm"
                      disabled={uploading}
                      className="bg-primary hover:bg-primary/90 font-bold text-xs gap-1.5 shrink-0 cursor-pointer h-9 px-4"
                    >
                      {uploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>{uploading ? "Creating..." : "+ Create task"}</span>
                    </Button>
                  </div>
                </form>
              ) : (
                /* Bulk Deliverable Form */
                <form
                  onSubmit={handleBulkDeliverablesSubmit}
                  className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5"
                >
                  <div className="space-y-1.5">
                    <Textarea
                      value={bulkDeliverablesText}
                      onChange={(e) => setBulkDeliverablesText(e.target.value)}
                      placeholder="Enter deliverable names (one per line)&#10;e.g.&#10;1. Header navigation testing&#10;2. Mobile responsive checkout&#10;3. Payment gateway verification"
                      rows={4}
                      className="text-xs bg-background leading-relaxed font-medium"
                      autoFocus
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
                      <span>
                        {parsedBulkDeliverables.length > 0 ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {parsedBulkDeliverables.length} deliverable{parsedBulkDeliverables.length > 1 ? "s" : ""} detected
                          </span>
                        ) : (
                          "Each line creates a separate deliverable task"
                        )}
                      </span>
                      <span className="text-[10px]">Tip: Copy-paste from Excel, Notepad, or ChatGPT</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBulkDeliverablesText("");
                        setDeliverableMode("single");
                      }}
                      className="h-8 text-xs cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={uploading || parsedBulkDeliverables.length === 0}
                      className="bg-primary hover:bg-primary/90 font-bold text-xs gap-1.5 cursor-pointer h-8 px-4"
                    >
                      {uploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {uploading
                          ? "Creating..."
                          : `+ Create ${parsedBulkDeliverables.length > 0 ? `${parsedBulkDeliverables.length} ` : ""}Deliverables`}
                      </span>
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* List of Uploaded Files */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Uploaded Files & Tasks ({uploadsList.length})
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  Only the person who uploaded a file can delete or modify it.
                </span>
              </div>

              {uploadsList.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed bg-muted/10 p-4 space-y-2">
                  <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs font-semibold text-foreground">No tasks or deliverables created yet for this sub-task</p>
                  <p className="text-[11px] text-muted-foreground">
                    Click &quot;Create task&quot; above, attach files, or press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono border">Ctrl+V</kbd> to attach deliverables and screenshots.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {uploadsList.map((upl) => {
                    const canDelete =
                      isOwnerOrAdmin || String(upl.uploaded_by_id) === currentUserId;

                    const dateFormatted = upl.uploaded_at
                      ? new Date(upl.uploaded_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—";

                    const hasUrl = Boolean(upl.file_url && upl.file_url.trim().length > 0);
                    const isImg =
                      hasUrl &&
                      (upl.file_type === "png" ||
                      upl.file_type === "jpg" ||
                      upl.file_type === "jpeg" ||
                      upl.file_type === "webp" ||
                      upl.file_type === "gif" ||
                      upl.file_type === "svg" ||
                      String(upl.file_url || "").match(/\.(png|jpg|jpeg|webp|gif|svg)/i));

                    const fileStatus = upl.status || "pending";
                    const commentCount = upl.comments?.length || 0;
                    const isCommentsActive = activeSidebar?.uploadId === upl.id && activeSidebar.tab === "comments";
                    const isHistoryActive = activeSidebar?.uploadId === upl.id && activeSidebar.tab === "history";

                    return (
                      <div
                        key={upl.id}
                        className={`flex flex-col p-3 rounded-xl border bg-card/60 hover:bg-card shadow-2xs gap-2.5 transition-all text-xs ${
                          activeSidebar?.uploadId === upl.id ? "ring-2 ring-primary/40 border-primary/50" : ""
                        }`}
                      >
                        {/* Top Row: File/Task Details on left, Actions Toolbar on right */}
                        <div className="flex items-center justify-between gap-3 w-full">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            {hasUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewModalItem({
                                    url: upl.file_url,
                                    name: upl.file_name,
                                    userName: upl.uploaded_by_name,
                                    userRole: upl.uploaded_by_role,
                                    message: upl.notes || undefined,
                                    date: upl.uploaded_at,
                                    type: upl.file_type,
                                    size: upl.file_size,
                                  })
                                }
                                className="font-bold text-foreground hover:text-primary hover:underline block text-left cursor-pointer whitespace-pre-wrap break-words leading-relaxed select-text"
                                title="Click to view file & notes"
                              >
                                {upl.file_name}
                              </button>
                            ) : (
                              <span className="font-bold text-foreground block whitespace-pre-wrap break-words leading-relaxed select-text">
                                {upl.file_name}
                              </span>
                            )}

                            {upl.notes && (
                              <p className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words leading-relaxed select-text mt-0.5">
                                {upl.notes}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1 font-medium text-foreground">
                                <User className="w-2.5 h-2.5 text-primary" />
                                {upl.uploaded_by_name} {upl.uploaded_by_role ? `(${upl.uploaded_by_role})` : ""}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="w-2.5 h-2.5" />
                                {dateFormatted}
                              </span>
                              {upl.file_size ? (
                                <>
                                  <span>•</span>
                                  <span>{(upl.file_size / 1024).toFixed(1)} KB</span>
                                </>
                              ) : null}
                            </div>
                          </div>

                          {/* Actions Toolbar */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Status update dropdown */}
                            <select
                              value={fileStatus}
                              onChange={(e) => handleUploadStatusChange(upl.id, e.target.value)}
                              disabled={saving}
                              className={`h-7 text-xs font-bold rounded-md border px-2 outline-none cursor-pointer shadow-2xs transition-colors ${getUploadStatusSelectClass(fileStatus)}`}
                              title="Deliverable verification status"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="ready_for_testing">Ready for testing</option>
                              <option value="passed">Passed</option>
                              <option value="failed">Failed</option>
                              <option value="stuck">Stuck</option>
                              <option value="awaiting_confirmation">Awaiting confirmation</option>
                              {fileStatus === "completed" && <option value="completed">Completed</option>}
                            </select>

                            

                            {/* Delete */}
                            {canDelete && (
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={saving}
                                onClick={() => handleDeleteUpload(upl.id)}
                                className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                                title="Delete file"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* Comments Count */}
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() =>
                                setActiveSidebar((prev) =>
                                  prev?.uploadId === upl.id && prev.tab === "comments"
                                    ? null
                                    : { uploadId: upl.id, tab: "comments" }
                                )
                              }
                              className={`h-7 px-2 w-auto text-xs font-medium border-border cursor-pointer transition-colors relative ${
                                isCommentsActive
                                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                                  : commentCount > 0
                                  ? "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                              title={`Open Comments & History Sidebar (${commentCount})`}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              {commentCount > 0 && (
                                <span className="ml-1 text-[10px] font-bold">
                                  {commentCount}
                                </span>
                              )}
                            </Button>

                            {/* History Icon */}
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() =>
                                setActiveSidebar((prev) =>
                                  prev?.uploadId === upl.id && prev.tab === "history"
                                    ? null
                                    : { uploadId: upl.id, tab: "history" }
                                )
                              }
                              className={`h-7 w-7 border-border cursor-pointer shrink-0 transition-colors ${
                                isHistoryActive
                                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                              title="Open Audit History in Sidebar"
                            >
                              <History className="w-3.5 h-3.5" />
                            </Button>

                            {/* Edit Item Button */}
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => handleOpenEditItem(upl)}
                              className="h-7 w-7 border-border cursor-pointer shrink-0 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="Edit Deliverable / Task"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-primary" />
                            </Button>
                          </div>
                        </div>

                        {/* Inline Task Updates & Attachment Composer (User Request: text box where user can upload multiple images/pdf/word/excel and paste images using Ctrl+V) */}
                        <div className="pt-2 border-t space-y-2">
                          {/* Staged Attachments Preview before sending */}
                          {Array.isArray(commentAttachments[upl.id]) && commentAttachments[upl.id].length > 0 && (
                            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/40 border text-xs">
                              <span className="text-[10px] font-bold text-muted-foreground w-full">
                                Files ready to send ({commentAttachments[upl.id].length}):
                              </span>
                              {commentAttachments[upl.id].map((att) => (
                                <span
                                  key={att.id}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-background border text-[11px] font-medium shadow-2xs"
                                >
                                  <Paperclip className="w-3 h-3 text-primary shrink-0" />
                                  <span className="truncate max-w-[150px]">{att.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCommentAttachment(upl.id, att.id)}
                                    className="text-muted-foreground hover:text-destructive cursor-pointer p-0.5 ml-0.5"
                                    title="Remove attachment"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 bg-background rounded-lg border p-1 shadow-2xs focus-within:ring-1 focus-within:ring-primary/40">
                            <Input
                              value={commentDrafts[upl.id] || ""}
                              onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [upl.id]: e.target.value }))}
                              onPaste={(e) => handlePasteComment(upl.id, e)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddComment(upl.id);
                                }
                              }}
                              placeholder="Type update or paste screenshots (Ctrl+V)..."
                              className="text-xs h-7 border-0 bg-transparent shadow-none focus-visible:ring-0 flex-1 px-2"
                            />

                            {/* File attachment button supporting multiple images, PDF, Word, Excel */}
                            <label
                              className={`h-7 px-2.5 rounded-md border border-dashed flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors shrink-0 ${
                                uploadingCommentAttFor === upl.id ? "opacity-60 pointer-events-none" : ""
                              }`}
                              title="Upload multiple images, PDF, Word, Excel files"
                            >
                              <input
                                type="file"
                                multiple
                                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    uploadCommentFiles(upl.id, Array.from(e.target.files));
                                    e.target.value = "";
                                  }
                                }}
                              />
                              {uploadingCommentAttFor === upl.id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                              ) : (
                                <Paperclip className="w-3 h-3 text-primary" />
                              )}
                              <span className="hidden sm:inline">Attach</span>
                            </label>

                            {/* Send / Post button */}
                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                postingCommentFor === upl.id ||
                                uploadingCommentAttFor === upl.id ||
                                (!(commentDrafts[upl.id] || "").trim() && (commentAttachments[upl.id]?.length || 0) === 0)
                              }
                              onClick={() => handleAddComment(upl.id)}
                              className="h-7 px-3 text-xs font-bold gap-1 bg-red-600 hover:bg-red-700 text-white shrink-0 cursor-pointer shadow-2xs"
                            >
                              {postingCommentFor === upl.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              <span>Send</span>
                            </Button>
                          </div>

                          {/* Existing Updates & Attached Files Feed directly inside the card */}
                          {Array.isArray(upl.comments) && upl.comments.length > 0 && (() => {
                            const allAttachedItems: {
                              att: SubTaskCommentAttachment;
                              comm: SubTaskUploadComment;
                            }[] = [];

                            const textOnlyComments: SubTaskUploadComment[] = [];

                            upl.comments.forEach((comm) => {
                              if (Array.isArray(comm.attachments) && comm.attachments.length > 0) {
                                comm.attachments.forEach((att) => {
                                  allAttachedItems.push({ att, comm });
                                });
                              }
                              if (comm.comment && comm.comment.trim() && (!comm.attachments || comm.attachments.length === 0)) {
                                textOnlyComments.push(comm);
                              }
                            });

                            if (allAttachedItems.length === 0 && textOnlyComments.length === 0) return null;

                            return (
                              <div className="space-y-2 pt-1 border-t border-border/50">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  <span>Updates & Attached Files ({allAttachedItems.length + textOnlyComments.length}):</span>
                                  {allAttachedItems.length > 0 && (
                                    <span className="text-[9px] font-normal lowercase text-muted-foreground/80">
                                      click image to preview with message
                                    </span>
                                  )}
                                </div>

                                {/* Attached Images & Files shown in horizontal row of square thumbnail boxes */}
                                {allAttachedItems.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                                    {allAttachedItems.map(({ att, comm }, attIdx) => {
                                      const isImg = isImageAttachment(att.url, att.name, att.type);
                                      return (
                                        <div
                                          key={att.id || `att_${attIdx}`}
                                          onClick={() =>
                                            setPreviewModalItem({
                                              url: att.url,
                                              name: att.name,
                                              userName: comm.user_name,
                                              userRole: comm.user_role,
                                              message: comm.comment || undefined,
                                              date: comm.created_at,
                                              type: att.type,
                                              size: att.size,
                                            })
                                          }
                                          className="group relative flex flex-col justify-between w-24 h-24 sm:w-28 sm:h-28 rounded-xl border border-border bg-card hover:border-primary/60 hover:shadow-md cursor-pointer transition-all overflow-hidden shrink-0 select-none shadow-2xs"
                                          title={`Click to preview: ${att.name}${comm.comment ? `\nMessage: "${comm.comment}"` : ""}`}
                                        >
                                          {/* Top: Author header & Completion Checkbox */}
                                          <div className="w-full px-1.5 py-0.5 bg-muted/80 border-b flex items-center justify-between text-[9px] font-bold text-foreground shrink-0 gap-1">
                                            <span className="truncate flex-1">{comm.user_name}</span>
                                            <div className="flex items-center gap-1 shrink-0">
                                              {comm.comment && (
                                                <MessageSquare className="w-2.5 h-2.5 text-primary shrink-0" />
                                              )}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleToggleAttachmentCompletion(upl.id, comm.id, att.id);
                                                }}
                                                className="cursor-pointer hover:scale-110 transition-transform p-0.5 rounded focus:outline-none"
                                                title={att.is_completed ? "Completed (click to mark pending)" : "Pending (click to mark completed)"}
                                              >
                                                {att.is_completed ? (
                                                  <div className="w-3.5 h-3.5 rounded bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                  </div>
                                                ) : (
                                                  <div className="w-3.5 h-3.5 rounded border border-muted-foreground/60 bg-background/90 hover:border-emerald-500 transition-colors" />
                                                )}
                                              </button>
                                            </div>
                                          </div>

                                          {/* Center: Image or file preview */}
                                          <div className="flex-1 w-full flex items-center justify-center overflow-hidden bg-muted/15 relative">
                                            {isImg ? (
                                              <>
                                                <img
                                                  src={att.url}
                                                  alt={att.name}
                                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                />
                                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                  <Maximize2 className="w-4 h-4 text-white drop-shadow" />
                                                </div>
                                              </>
                                            ) : (
                                              <div className="flex flex-col items-center justify-center p-1 text-center">
                                                <Paperclip className="w-4 h-4 text-primary mb-0.5" />
                                                <span className="text-[8px] font-mono uppercase text-muted-foreground font-bold">
                                                  {att.name.split(".").pop() || "FILE"}
                                                </span>
                                              </div>
                                            )}
                                          </div>

                                          {/* Bottom: Filename */}
                                          <div className="w-full px-1 py-0.5 bg-background border-t text-[9px] text-muted-foreground truncate text-center shrink-0">
                                            <span className="truncate block font-medium">{att.name}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Text-only comments / updates */}
                                {textOnlyComments.length > 0 && (
                                  <div className="space-y-1.5 pt-1">
                                    {textOnlyComments.map((comm) => (
                                      <div key={comm.id} className="p-2 rounded-lg bg-muted/30 border text-xs space-y-0.5">
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                          <span className="font-semibold text-foreground flex items-center gap-1">
                                            <User className="w-2.5 h-2.5 text-primary" />
                                            {comm.user_name} {comm.user_role ? `(${comm.user_role})` : ""}
                                          </span>
                                          <span>
                                            {new Date(comm.created_at).toLocaleString("en-IN", {
                                              day: "numeric",
                                              month: "short",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </span>
                                        </div>
                                        <p className="text-foreground leading-relaxed pl-3.5 font-medium">{comm.comment}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          </div>

          {/* =========================================================================
              RIGHT-SIDE PANEL: History & Comment Section (Docked inside DialogContent for full interactivity!)
             ========================================================================= */}
          {activeSidebar && activeFile && (
            <div
              data-sidebar-panel="true"
              className="w-full sm:w-[460px] md:w-[500px] border-l bg-background flex flex-col shrink-0 min-h-0 animate-in slide-in-from-right duration-150"
              onPaste={(e) => activeSidebar.tab === "comments" && handlePasteComment(activeFile.id, e)}
            >
          {/* Sidebar Top Header with Tabs & Close */}
          <div className="px-5 py-3.5 border-b flex items-center justify-between gap-3 bg-muted/20 shrink-0">
            {/* Tab switchers: Comments vs History */}
            <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-border/50">
              <button
                type="button"
                onClick={() => setActiveSidebar((prev) => prev ? { ...prev, tab: "comments" } : null)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeSidebar.tab === "comments"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Comments ({activeFile.comments?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSidebar((prev) => prev ? { ...prev, tab: "history" } : null)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeSidebar.tab === "history"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="w-3.5 h-3.5 text-primary" />
                <span>History</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] font-bold uppercase ${getUploadStatusBadgeClass(activeFile.status)}`}
              >
                {formatUploadStatusLabel(activeFile.status)}
              </Badge>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setActiveSidebar(null)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                title="Close sidebar"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>



          {/* Sidebar Content Body */}
          {activeSidebar.tab === "comments" ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Comments Feed */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {(!activeFile.comments || activeFile.comments.length === 0) ? (
                  <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/40" />
                    <p className="font-semibold text-foreground">No comments yet on this file</p>
                    <p className="text-[11px]">Be the first to leave feedback, paste screenshots, or attach documents below.</p>
                  </div>
                ) : (() => {
                  // Separate top-level comments from inline replies
                  const topLevel = activeFile.comments.filter((c) => !c.reply_to_comment_id);
                  const repliesMap: Record<string, SubTaskUploadComment[]> = {};
                  activeFile.comments.forEach((c) => {
                    if (c.reply_to_comment_id) {
                      if (!repliesMap[c.reply_to_comment_id]) repliesMap[c.reply_to_comment_id] = [];
                      repliesMap[c.reply_to_comment_id].push(c);
                    }
                  });
                  return topLevel.map((comm) => (
                    <div key={comm.id} className="p-3.5 rounded-xl bg-card border shadow-2xs text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <User className="w-3 h-3 text-primary" />
                          {comm.user_name} {comm.user_role ? `(${comm.user_role})` : ""}
                        </span>
                        <span className="font-mono text-[10px]">
                          {new Date(comm.created_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {comm.comment && (
                        <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                          {comm.comment}
                        </p>
                      )}

                      {/* Attachments inside comment */}
                      {comm.attachments && comm.attachments.length > 0 && (
                        <div className="pt-1.5 space-y-2">
                          {/* Images */}
                          {(() => {
                            const imgAtts = comm.attachments.filter(
                              (a) => a.type?.match(/^(png|jpg|jpeg|webp|gif|svg)$/i) || a.url.match(/\.(png|jpg|jpeg|webp|gif|svg)/i)
                            );
                            if (imgAtts.length === 0) return null;
                            return (
                              <div className="flex items-center gap-2 flex-wrap">
                                {imgAtts.map((att, aIdx) => (
                                  <div key={att.id || aIdx} className="relative group/cimg inline-block shrink-0">
                                    <a
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-block"
                                      title={`View ${att.name} full size`}
                                    >
                                      <img
                                        src={att.url}
                                        alt={att.name}
                                        className="w-16 h-16 rounded-lg border object-cover group-hover/cimg:scale-105 transition-transform shadow-xs hover:ring-2 hover:ring-primary/40 cursor-pointer bg-muted/20"
                                      />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleAttachmentCompletion(activeFile.id, comm.id, att.id);
                                      }}
                                      className="absolute top-1 right-1 z-10 cursor-pointer hover:scale-110 transition-transform p-0.5 rounded focus:outline-none"
                                      title={att.is_completed ? "Completed (click to mark pending)" : "Pending (click to mark completed)"}
                                    >
                                      {att.is_completed ? (
                                        <div className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                                        </div>
                                      ) : (
                                        <div className="w-4 h-4 rounded border-2 border-white/90 bg-black/40 hover:border-emerald-400 transition-colors shadow-xs" />
                                      )}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}

                          {/* Documents */}
                          {(() => {
                            const docAtts = comm.attachments.filter(
                              (a) => !(a.type?.match(/^(png|jpg|jpeg|webp|gif|svg)$/i) || a.url.match(/\.(png|jpg|jpeg|webp|gif)/i))
                            );
                            if (docAtts.length === 0) return null;
                            return (
                              <div className="flex flex-col gap-1.5">
                                {docAtts.map((att, aIdx) => (
                                  <div
                                    key={att.id || aIdx}
                                    className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-muted/30 text-xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleAttachmentCompletion(activeFile.id, comm.id, att.id)}
                                        className="cursor-pointer hover:scale-110 transition-transform focus:outline-none shrink-0"
                                        title={att.is_completed ? "Completed (click to mark pending)" : "Pending (click to mark completed)"}
                                      >
                                        {att.is_completed ? (
                                          <div className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                                          </div>
                                        ) : (
                                          <div className="w-4 h-4 rounded border border-muted-foreground/60 bg-background hover:border-emerald-500 transition-colors" />
                                        )}
                                      </button>
                                      {getFileIcon(att.name)}
                                      <span className="truncate font-semibold text-foreground text-[11px]">{att.name}</span>
                                      {att.size && (
                                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                          ({(att.size / 1024).toFixed(0)} KB)
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <a
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-0.5 rounded text-[11px] font-semibold text-primary hover:bg-muted"
                                      >
                                        View
                                      </a>
                                      <a
                                        href={att.url}
                                        download={att.name}
                                        className="px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                                        title="Download"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}

                          {/* Quick comment option directly below all attachments */}
                          <div className="pt-2 mt-1.5 border-t border-border/40">
                            <div className="flex items-center gap-1.5">
                              <Input
                                placeholder={`Comment on ${comm.user_name}'s attachment...`}
                                value={inlineCommentText[comm.id] || ""}
                                onChange={(e) => setInlineCommentText((prev) => ({ ...prev, [comm.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handlePostInlineComment(activeFile.id, comm.id, comm.user_name);
                                  }
                                }}
                                className="h-7 text-xs bg-muted/25 rounded-lg flex-1"
                              />
                              <Button
                                type="button"
                                size="sm"
                                disabled={!(inlineCommentText[comm.id] || "").trim() || postingCommentFor === activeFile.id}
                                onClick={() => handlePostInlineComment(activeFile.id, comm.id, comm.user_name)}
                                className="h-7 text-xs px-2.5 font-bold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 cursor-pointer shadow-2xs"
                              >
                                <Send className="w-3 h-3" />
                                <span>Comment</span>
                              </Button>
                            </div>
                            {/* Inline replies — shown just below this textbox */}
                            {repliesMap[comm.id] && repliesMap[comm.id].length > 0 && (
                              <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-primary/20">
                                {repliesMap[comm.id].map((reply) => (
                                  <div key={reply.id} className="p-2.5 rounded-lg bg-muted/30 border border-border/40 text-xs space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                      <span className="font-bold text-foreground flex items-center gap-1">
                                        <User className="w-3 h-3 text-primary" />
                                        {reply.user_name} {reply.user_role ? `(${reply.user_role})` : ""}
                                      </span>
                                      <span className="font-mono text-[9px]">
                                        {new Date(reply.created_at).toLocaleString("en-IN", {
                                          day: "numeric",
                                          month: "short",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                    {reply.comment && (
                                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{reply.comment}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>


            </div>
          ) : (
            /* History Timeline */
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {(() => {
                const historyList = getUploadHistoryList(activeFile);
                return (
                  <div className="space-y-3">
                    {historyList.map((entry, eIdx) => {
                      const isUploaded = entry.action === "uploaded";
                      const isComment = entry.action === "comment_added";
                      const isCompleted = entry.status === "completed";
                      const formattedTime = new Date(entry.changed_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={entry.id || eIdx}
                          className="flex gap-3 items-start text-xs border-l-2 pl-3.5 py-1.5 relative border-muted-foreground/30"
                        >
                          <span
                            className={`absolute -left-[5px] top-2.5 w-2 h-2 rounded-full ${
                              isUploaded
                                ? "bg-blue-500 ring-2 ring-blue-500/20"
                                : isComment
                                ? "bg-indigo-500 ring-2 ring-indigo-500/20"
                                : isCompleted
                                ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                                : "bg-amber-500 ring-2 ring-amber-500/20"
                            }`}
                          />
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-foreground text-xs">
                                {isUploaded
                                  ? "File Uploaded"
                                  : isComment
                                  ? "Comment Added"
                                  : `Status changed to ${(entry.status || "PENDING").toUpperCase()}`}
                              </span>
                              {entry.status && !isComment && (
                                <Badge
                                  variant="secondary"
                                  className={`text-[9px] px-1.5 py-0 font-bold capitalize ${getUploadStatusBadgeClass(entry.status)}`}
                                >
                                  {formatUploadStatusLabel(entry.status)}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {entry.changed_by_name || "Staff Member"}
                              </span>
                              <span>•</span>
                              <span className="font-mono">{formattedTime}</span>
                            </div>

                            {entry.notes && (
                              <p className="text-[11px] text-muted-foreground italic bg-muted/40 p-2 rounded-md mt-1 border border-border/40">
                                "{entry.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Loader2, MessageSquareWarning, Mic, Plus, RefreshCw, Reply, Search, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useActiveAcademicYearId } from "@/hooks/use-active-academic-year-id";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

const TARGETS: Record<string, string[]> = {
  student: ["institution_admin", "teacher", "driver", "staff"],
  teacher: ["institution_admin", "driver", "student", "parent", "staff"],
  parent: ["institution_admin", "driver", "teacher", "staff"],
  driver: ["institution_admin", "teacher", "parent", "staff"],
  staff: ["institution_admin", "teacher", "driver", "student", "parent"],
  institution_admin: ["teacher", "driver", "student", "parent", "staff"],
};

const MODULES: Record<string, string> = {
  student: "student.myinstitution.complaints",
  teacher: "teacher.myinstitution.complaints",
  parent: "parent.myinstitution.complaints",
  driver: "driver.myinstitution.complaints",
  staff: "staff.myinstitution.complaints",
  institution_admin: "institution.complaints",
};

const ROLE_LABELS: Record<string, string> = {
  institution_admin: "Institution Admin",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
  driver: "Driver",
  staff: "Staff / Employee",
};

type Complaint = {
  id: number;
  complaint_number: string;
  subject: string;
  priority: string;
  creator_role: string;
  target_role: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  creator_name: string;
  target_user_id: number | null;
  target_user_name: string | null;
  is_student_complaint?: boolean;
  can_update_status?: boolean;
  last_message: string | null;
};

type RecipientOption = { id: number; full_name: string; email: string };

type ComplaintMessage = {
  id: number;
  message: string;
  created_at: string;
  user_id: number;
  sender_name: string;
  sender_role: string;
  is_own: boolean;
  reply_to_message_id: number | null;
  replied_message: RepliedComplaintMessage | null;
  attachments: ComplaintAttachment[];
};

type RepliedComplaintMessage = {
  id: number;
  user_id: number;
  sender_name: string;
  message: string;
  has_attachments: boolean;
};

type ComplaintAttachment = { id: number; file_name: string | null; file_url: string; resource_type?: string | null };
type PendingAttachment = { id: string; file: File; previewUrl: string | null };
type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
const MAX_ATTACHMENTS = 5;
const ACCEPTED_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function isImageAttachment(attachment: ComplaintAttachment) {
  return attachment.resource_type === "image" || /\/image\/upload\//i.test(attachment.file_url) || /\.(avif|gif|jpe?g|png|webp)(?:$|\?)/i.test(
    `${attachment.file_name ?? ""} ${attachment.file_url}`
  );
}

function attachmentName(attachment: ComplaintAttachment) {
  if (attachment.file_name) return attachment.file_name;
  try {
    return decodeURIComponent(new URL(attachment.file_url).pathname.split("/").pop() || "Attachment");
  } catch {
    return "Attachment";
  }
}

function messagePreview(message: Pick<ComplaintMessage, "message" | "attachments">) {
  const text = message.message.trim();
  if (text) return text;
  if (message.attachments.some(isImageAttachment)) return "Photo";
  if (message.attachments.length > 0) return "Attachment";
  return "Message";
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function complaintRowActorLabel(complaint: Complaint, currentUserId?: number | null) {
  if (complaint.created_by === currentUserId) {
    return `To: ${complaint.target_user_name ?? ROLE_LABELS[complaint.target_role] ?? complaint.target_role}`;
  }
  return `From: ${complaint.creator_name}`;
}

export default function InstitutionComplaintsPage() {
  const { isReady } = useAdminGuard();
  const searchParams = useSearchParams();
  const { accessToken, user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const activeAcademicYearId = useActiveAcademicYearId();
  const role = ["institution_admin", "teacher", "student", "parent", "driver"]
    .find((code) => user?.role_codes?.includes(code)) || user?.primary_role || ((user as any)?.roles?.[0]?.toLowerCase()) || "student";
  const permissionModule = MODULES[role];
  const canCreate = Boolean(role && (role === "student" || role === "parent" || role === "teacher" || role === "institution_admin" || hasPermission(user, `${permissionModule}.create`)));
  const canReply = Boolean(role && (role === "student" || role === "parent" || role === "teacher" || role === "institution_admin" || hasPermission(user, `${permissionModule}.edit`)));
  const targetOptions = TARGETS[role] ?? TARGETS.student;
  const [rows, setRows] = useState<Complaint[]>([]);
  const [search, setSearch] = useState("");
  const [complaintView, setComplaintView] = useState<"received" | "created">("received");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [targetUserLabel, setTargetUserLabel] = useState("");
  const [resolvingAdmin, setResolvingAdmin] = useState(false);
  const [priority, setPriority] = useState<"normal" | "high">("normal");
  const [subject, setSubject] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [messages, setMessages] = useState<ComplaintMessage[]>([]);
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<ComplaintMessage | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [statusSavingComplaintId, setStatusSavingComplaintId] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [swipingMessageId, setSwipingMessageId] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const openedFromNotificationRef = useRef<number | null>(null);
  const recipientRequestRef = useRef(0);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  const swipeRef = useRef({
    messageId: 0,
    pointerId: -1,
    startX: 0,
    startY: 0,
    horizontal: false,
    offset: 0,
  });

  const headers = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const speechSupported =
    typeof window !== "undefined" &&
    Boolean(
      (window as Window & {
        SpeechRecognition?: new () => BrowserSpeechRecognition;
        webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
      }).SpeechRecognition ||
        (window as Window & {
          webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
        }).webkitSpeechRecognition
    );
  const canUpdateActiveComplaintStatus = Boolean(activeComplaint?.can_update_status && canReply);

  const institutionParams = useCallback(() => {
    const params = new URLSearchParams();
    if (activeInstitution?.id) params.set("institutionId", String(activeInstitution.id));
    if (activeAcademicYearId) params.set("academicYearId", String(activeAcademicYearId));
    return params;
  }, [activeInstitution, activeAcademicYearId]);

  const loadComplaints = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = institutionParams();
      if (search.trim()) params.set("search", search.trim());
      params.set("view", complaintView);
      const res = await fetch(`/api/admin/institution/complaints?${params}`, { headers, cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load complaints");
      setRows(json.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  }, [accessToken, complaintView, headers, institutionParams, search]);

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const scroll = () => {
      const container = messagesContainerRef.current;
      if (!container) return;
      container.scrollTo({ top: container.scrollHeight, behavior });
    };

    window.requestAnimationFrame(() => window.requestAnimationFrame(scroll));
    window.setTimeout(scroll, 120);
  }, []);

  useLayoutEffect(() => {
    if (!activeComplaint || messagesLoading || messages.length === 0) return;
    scrollMessagesToBottom("auto");
  }, [activeComplaint, messages.length, messagesLoading, scrollMessagesToBottom]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void loadComplaints(), 250);
    return () => window.clearTimeout(timeout);
  }, [isReady, loadComplaints]);

  useEffect(() => {
    setActiveComplaint(null);
    setMessages([]);
    openedFromNotificationRef.current = null;
  }, [activeAcademicYearId]);

  const openComplaint = useCallback(async (complaint: Complaint) => {
    setActiveComplaint(complaint);
    setReplyingTo(null);
    setMessage("");
    setSwipingMessageId(null);
    setSwipeOffset(0);
    setMessagesLoading(true);
    try {
      const params = institutionParams();
      params.set("complaintId", String(complaint.id));
      const res = await fetch(`/api/admin/institution/complaints?${params}`, { headers, cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load conversation");
      setMessages(json.data?.messages ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load conversation");
      setActiveComplaint(null);
    } finally {
      setMessagesLoading(false);
    }
  }, [
    headers,
    institutionParams,
    setActiveComplaint,
    setMessage,
    setMessages,
    setMessagesLoading,
    setReplyingTo,
    setSwipeOffset,
    setSwipingMessageId,
  ]);

  useEffect(() => {
    const complaintId = Number(searchParams.get("complaint"));
    if (!Number.isInteger(complaintId) || complaintId <= 0) return;
    if (openedFromNotificationRef.current === complaintId) return;
    const complaint = rows.find((row) => row.id === complaintId);
    if (!complaint) return;
    openedFromNotificationRef.current = complaintId;
    const timeout = window.setTimeout(async () => {
      setActiveComplaint(complaint);
      setMessagesLoading(true);
      try {
        const params = institutionParams();
        params.set("complaintId", String(complaint.id));
        const res = await fetch(`/api/admin/institution/complaints?${params}`, { headers, cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load conversation");
        setMessages(json.data?.messages ?? []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load conversation");
        setActiveComplaint(null);
      } finally {
        setMessagesLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [headers, institutionParams, rows, searchParams]);

  async function createComplaint() {
    if (!targetRole || !targetUserId || !subject.trim() || !initialMessage.trim()) {
      toast.error("Select the recipient role and person, then enter the subject and complaint.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/institution/complaints?${institutionParams()}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ target_role: targetRole, target_user_id: Number(targetUserId), priority, subject, message: initialMessage }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create complaint");
      toast.success("Complaint created.");
      setCreateOpen(false);
      setComplaintView("created");
      setTargetRole(""); setTargetUserId(""); setTargetUserLabel(""); setPriority("normal"); setSubject(""); setInitialMessage("");
      await loadComplaints();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create complaint");
    } finally {
      setSaving(false);
    }
  }

  async function updateComplaintStatus(complaint: Complaint, status: string) {
    setStatusSavingComplaintId(complaint.id);
    try {
      const res = await fetch(`/api/admin/institution/complaints?${institutionParams()}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: complaint.id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update complaint status");
      const updated = json.data as Complaint;
      setRows((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      setActiveComplaint((current) => current?.id === updated.id ? { ...current, ...updated } : current);
      toast.success("Complaint status updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update complaint status");
    } finally {
      setStatusSavingComplaintId(null);
    }
  }

  async function updateSelectedComplaintStatus(
    complaints: Complaint[],
    status: string,
    resetSelection: () => void,
  ) {
    const updatableComplaints = complaints.filter((complaint) => complaint.can_update_status);
    if (updatableComplaints.length === 0) {
      toast.error("Selected complaints cannot be updated by you.");
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        updatableComplaints.map(async (complaint) => {
          const res = await fetch(`/api/admin/institution/complaints?${institutionParams()}`, {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ id: complaint.id, status }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Failed to update complaint status");
        }),
      );
      resetSelection();
      await loadComplaints();
      toast.success(`Updated ${updatableComplaints.length} complaint${updatableComplaints.length === 1 ? "" : "s"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update complaints");
    } finally {
      setSaving(false);
    }
  }

  async function changeTargetRole(value: string) {
    const requestId = ++recipientRequestRef.current;
    setTargetRole(value);
    setTargetUserId("");
    setTargetUserLabel("");
    if (value !== "institution_admin") {
      setResolvingAdmin(false);
      return;
    }

    setResolvingAdmin(true);
    try {
      const params = institutionParams();
      params.set("recipientRole", "institution_admin");
      params.set("page", "1");
      params.set("limit", "1");
      const res = await fetch(`/api/admin/institution/complaints?${params}`, { headers, cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to find institution admin");
      const admin = (json.data?.[0] ?? null) as RecipientOption | null;
      if (!admin) throw new Error("No institution admin is assigned to this institution");
      if (recipientRequestRef.current !== requestId) return;
      setTargetUserId(String(admin.id));
      setTargetUserLabel(`${admin.full_name} · ${admin.email}`);
    } catch (error) {
      if (recipientRequestRef.current === requestId) {
        toast.error(error instanceof Error ? error.message : "Failed to find institution admin");
      }
    } finally {
      if (recipientRequestRef.current === requestId) setResolvingAdmin(false);
    }
  }

  async function sendMessage() {
    if (!activeComplaint || (!message.trim() && pendingAttachments.length === 0)) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append("complaint_id", String(activeComplaint.id));
      form.append("message", message.trim());
      if (replyingTo) form.append("reply_to_message_id", String(replyingTo.id));
      pendingAttachments.forEach((attachment) => form.append("files", attachment.file));
      const res = await fetch(`/api/admin/institution/complaints?${institutionParams()}`, {
        method: "POST",
        headers,
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send reply");
      setMessage("");
      setReplyingTo(null);
      pendingAttachments.forEach((attachment) => { if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl); });
      setPendingAttachments([]);
      await openComplaint(activeComplaint);
      await loadComplaints();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reply");
    } finally {
      setSaving(false);
    }
  }

  function addPendingAttachments(fileList: FileList | null) {
    if (!fileList) return;
    setPendingAttachments((current) => {
      const available = Math.max(MAX_ATTACHMENTS - current.length, 0);
      if (fileList.length > available) toast.error(`You can attach up to ${MAX_ATTACHMENTS} files`);
      const accepted: PendingAttachment[] = [];
      for (const file of Array.from(fileList).slice(0, available)) {
        if (!ACCEPTED_ATTACHMENT_TYPES.has(file.type)) {
          toast.error(`${file.name}: only images and PDFs are supported`);
          continue;
        }
        const maxSize = file.type === "application/pdf" ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(`${file.name} is too large`);
          continue;
        }
        accepted.push({ id: crypto.randomUUID(), file, previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null });
      }
      return [...current, ...accepted];
    });
  }

  function removePendingAttachment(id: string) {
    setPendingAttachments((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  const selectReplyMessage = useCallback((item: ComplaintMessage) => {
    setReplyingTo(item);
    window.requestAnimationFrame(() => replyInputRef.current?.focus());
  }, []);

  const clearReplyContext = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const scrollToMessage = useCallback((messageId: number) => {
    const row = messagesContainerRef.current?.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
    const bubble = messagesContainerRef.current?.querySelector<HTMLElement>(`[data-message-bubble-id="${messageId}"]`) ?? row;
    if (!row || !bubble) {
      toast.error("Original message is no longer available");
      return;
    }
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    const theme = getComputedStyle(document.documentElement);
    const currentBackground = getComputedStyle(bubble).backgroundColor;
    const flashBackground = theme.getPropertyValue("--chat-flash-background").trim() || "rgb(254 226 226)";
    const flashRing = theme.getPropertyValue("--chat-flash-ring").trim() || "rgb(220 38 38 / 0.28)";
    bubble.animate(
      [
        { transform: "translateX(0)", backgroundColor: currentBackground, boxShadow: "0 0 0 0 transparent" },
        { transform: "translateX(10px)", backgroundColor: flashBackground, boxShadow: `0 0 0 7px ${flashRing}` },
        { transform: "translateX(0)", backgroundColor: currentBackground, boxShadow: "0 0 0 0 transparent" },
      ],
      { duration: 1200, easing: "ease-in-out" }
    );
    setHighlightedMessageId(messageId);
    if (highlightTimeoutRef.current) window.clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = window.setTimeout(() => setHighlightedMessageId(null), 1600);
  }, []);

  function finishSwipe(item: ComplaintMessage) {
    const shouldReply = item.is_own ? swipeRef.current.offset <= -56 : swipeRef.current.offset >= 56;
    if (shouldReply) selectReplyMessage(item);
    setSwipingMessageId(null);
    setSwipeOffset(0);
    swipeRef.current.pointerId = -1;
    swipeRef.current.horizontal = false;
    swipeRef.current.offset = 0;
  }

  function toggleDictation() {
    if (!speechSupported) {
      toast.error("Voice typing is not supported in this browser");
      return;
    }
    if (listening) {
      speechRecognitionRef.current?.stop();
      return;
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      const transcript = event.results[event.resultIndex]?.[0]?.transcript?.trim();
      if (!transcript) return;
      setMessage((current) => `${current}${current.trim() ? " " : ""}${transcript}`);
    };
    recognition.onend = () => {
      setListening(false);
      speechRecognitionRef.current = null;
    };
    recognition.onerror = () => {
      setListening(false);
      speechRecognitionRef.current = null;
      toast.error("Voice typing could not start");
    };
    speechRecognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  const columns = useMemo<ColumnDef<Complaint>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
          aria-label="Select all complaints"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          aria-label={`Select ${row.original.subject}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "subject",
      header: "Complaint",
      cell: ({ row }) => (
        <div className="flex min-w-72 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <MessageSquareWarning className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{row.original.subject}</p>
              {row.original.is_student_complaint && <Badge variant="secondary">Student Complaint</Badge>}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {row.original.last_message || "No message yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.original.complaint_number}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "actor",
      header: complaintView === "created" ? "To" : "From",
      cell: ({ row }) => (
        <Badge variant="outline">
          {complaintRowActorLabel(row.original, user?.id)}
        </Badge>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <Badge variant={row.original.priority === "high" ? "destructive" : "outline"}>
          {row.original.priority === "high" ? "Urgent" : "Normal"}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline">{statusLabel(row.original.status)}</Badge>
      ),
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ row }) => formatDate(row.original.updated_at),
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            void openComplaint(row.original);
          }}
        >
          Open
        </Button>
      ),
    },
  ], [complaintView, openComplaint, user?.id]);

  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Complaints</h1>
          <p className="text-muted-foreground">Raise and discuss complaints within your institution.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2 font-bold shadow-xs">
            <Plus className="size-4" /> Create Complaint
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={complaintView === "received" ? "default" : "outline"}
            onClick={() => setComplaintView("received")}
          >
            Complaints I Received
          </Button>
          <Button
            type="button"
            size="sm"
            variant={complaintView === "created" ? "default" : "outline"}
            onClick={() => setComplaintView("created")}
          >
            What I Created
          </Button>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search complaints..." className="pl-9" />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void loadComplaints()}
          disabled={loading}
          aria-label="Refresh complaints"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyText="No complaints yet."
        getRowId={(row) => String(row.id)}
        selectionResetKey={`${complaintView}:${search}`}
        enableRowSelection
        onRowClick={(row) => void openComplaint(row)}
        selectedActions={(selectedRows, resetSelection) => {
          const updatableRows = selectedRows.filter((row) => row.can_update_status);
          return (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving || updatableRows.length === 0}
                onClick={() => void updateSelectedComplaintStatus(updatableRows, "in_progress", resetSelection)}
              >
                In Progress
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving || updatableRows.length === 0}
                onClick={() => void updateSelectedComplaintStatus(updatableRows, "resolved", resetSelection)}
              >
                Resolve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving || updatableRows.length === 0}
                onClick={() => void updateSelectedComplaintStatus(updatableRows, "closed", resetSelection)}
              >
                Close
              </Button>
            </div>
          );
        }}
      />

      <div className="hidden overflow-hidden rounded-xl border bg-card">
        {loading ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageSquareWarning className="size-9" />
            <p>No complaints yet.</p>
          </div>
        ) : rows.map((complaint) => (
          <button key={complaint.id} type="button" onClick={() => void openComplaint(complaint)}
            className="flex w-full items-center gap-4 border-b p-4 text-left transition hover:bg-muted/40 last:border-b-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <MessageSquareWarning className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{complaint.subject}</span>
                <Badge variant="outline">{complaintRowActorLabel(complaint, user?.id)}</Badge>
                {complaint.is_student_complaint && <Badge variant="secondary">Student Complaint</Badge>}
                <Badge variant={complaint.priority === "high" ? "destructive" : "outline"}>{complaint.priority === "high" ? "Urgent" : "Normal"}</Badge>
              </div>
              <p className="truncate text-sm text-muted-foreground">{complaint.last_message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{complaint.complaint_number} · {formatDate(complaint.updated_at)}</p>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>New Complaint</DialogTitle><DialogDescription>Choose who should receive this complaint.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Complaint to whom?</Label>
                <Select value={targetRole} onValueChange={(value) => void changeTargetRole(value)}><SelectTrigger><SelectValue placeholder="Select recipient role" /></SelectTrigger>
                  <SelectContent>{targetOptions.map((target) => <SelectItem key={target} value={target}>{ROLE_LABELS[target]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Priority</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value === "high" ? "high" : "normal")}>
                  <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {targetRole && targetRole !== "institution_admin" && <div className="space-y-2"><Label>Which {ROLE_LABELS[targetRole]}?</Label>
              <AsyncSearchPopover<RecipientOption>
                value={targetUserId}
                onChange={setTargetUserId}
                selectedLabel={targetUserLabel}
                onSelectItem={(item) => setTargetUserLabel(`${item.full_name} · ${item.email}`)}
                placeholder={`Select ${ROLE_LABELS[targetRole].toLowerCase()}...`}
                searchPlaceholder={`Search ${ROLE_LABELS[targetRole].toLowerCase()}s...`}
                emptyText={`No ${ROLE_LABELS[targetRole].toLowerCase()} found in this institution.`}
                fetcher={async (searchValue, page) => {
                  const params = institutionParams();
                  params.set("recipientRole", targetRole);
                  params.set("search", searchValue);
                  params.set("page", String(page));
                  params.set("limit", "20");
                  const res = await fetch(`/api/admin/institution/complaints?${params}`, { headers, cache: "no-store" });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error ?? "Failed to load recipients");
                  return { data: json.data ?? [], hasMore: Boolean(json.hasMore) };
                }}
                getValue={(item) => String(item.id)}
                getLabel={(item) => `${item.full_name} · ${item.email}`}
                renderItem={(item) => <div className="min-w-0"><p className="truncate font-medium">{item.full_name}</p><p className="truncate text-xs text-muted-foreground">{item.email}</p></div>}
              />
            </div>}
            <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={180} placeholder="What is this complaint about?" /></div>
            <div className="space-y-2"><Label>Complaint</Label><Textarea value={initialMessage} onChange={(e) => setInitialMessage(e.target.value)} maxLength={5000} className="min-h-32" placeholder="Describe the issue clearly..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void createComplaint()} disabled={saving || resolvingAdmin} aria-busy={saving || resolvingAdmin}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Creating..." : "Create Complaint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(activeComplaint)} onOpenChange={(open) => !open && setActiveComplaint(null)}>
        <SheetContent className="h-dvh w-full gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b p-5 pr-12 text-left">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <SheetTitle className="flex items-center gap-2">
                  <MessageSquareWarning className="size-5 text-primary" />
                  {activeComplaint?.subject}
                </SheetTitle>
                <SheetDescription className="truncate">
                  {activeComplaint?.complaint_number} · {activeComplaint ? complaintRowActorLabel(activeComplaint, user?.id) : ""}
                  {activeComplaint?.is_student_complaint ? " · Student Complaint" : ""}
                </SheetDescription>
                <SheetDescription className="hidden">
                  {activeComplaint?.complaint_number} · To {activeComplaint?.target_user_name ?? ROLE_LABELS[activeComplaint?.target_role ?? ""]} ({ROLE_LABELS[activeComplaint?.target_role ?? ""]})
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div ref={messagesContainerRef} className="flex-1 space-y-3 overflow-y-auto p-5">
            {messagesLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading conversation...
              </div>
            ) : messages.map((item) => {
              const own = item.is_own;
              return <div key={item.id} data-message-id={item.id} className={cn("relative flex scroll-m-20 rounded-2xl transition-colors duration-500", own ? "justify-end" : "justify-start")}>
                <div className={cn("pointer-events-none absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-primary/10 text-primary transition-opacity", own ? "right-1" : "left-1", swipingMessageId === item.id && Math.abs(swipeOffset) >= 24 ? "opacity-100" : "opacity-0")}>
                  <Reply className="size-4" />
                </div>
                <div
                  data-message-bubble-id={item.id}
                  className={cn("group/message relative max-w-[85%] touch-pan-y cursor-pointer select-none rounded-2xl px-4 py-3 shadow-sm transition-[transform,box-shadow,background-color] duration-500", own ? "rounded-br-sm bg-destructive text-white" : "rounded-bl-sm border bg-card text-card-foreground", swipingMessageId === item.id && "shadow-md", highlightedMessageId === item.id && "ring-2 ring-destructive/45")}
                  style={{ transform: swipingMessageId === item.id ? `translateX(${swipeOffset}px)` : "translateX(0)" }}
                  onPointerDown={(event) => {
                    if (event.button !== 0 || (event.target as HTMLElement).closest("a,button")) return;
                    swipeRef.current = { messageId: item.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, horizontal: false, offset: 0 };
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setSwipingMessageId(item.id);
                    setSwipeOffset(0);
                  }}
                  onPointerMove={(event) => {
                    const swipe = swipeRef.current;
                    if (swipe.pointerId !== event.pointerId || swipe.messageId !== item.id) return;
                    const deltaX = event.clientX - swipe.startX;
                    const deltaY = event.clientY - swipe.startY;
                    if (!swipe.horizontal && Math.abs(deltaX) < 8) return;
                    if (!swipe.horizontal && Math.abs(deltaY) > Math.abs(deltaX)) return;
                    swipe.horizontal = true;
                    const directionalOffset = own ? Math.min(0, deltaX) : Math.max(0, deltaX);
                    const nextOffset = Math.max(-84, Math.min(84, directionalOffset));
                    swipe.offset = nextOffset;
                    setSwipeOffset(nextOffset);
                  }}
                  onPointerUp={(event) => {
                    if (swipeRef.current.pointerId !== event.pointerId || swipeRef.current.messageId !== item.id) return;
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                    finishSwipe(item);
                  }}
                  onPointerCancel={() => {
                    setSwipingMessageId(null);
                    setSwipeOffset(0);
                    swipeRef.current.pointerId = -1;
                    swipeRef.current.offset = 0;
                    swipeRef.current.horizontal = false;
                  }}
                >
                  <div className={cn("mb-1 flex items-center gap-2 text-xs font-semibold", own && "justify-end")}><span>{own ? "You" : item.sender_name}</span>{!own && <span className="opacity-70">({ROLE_LABELS[item.sender_role] ?? item.sender_role})</span>}</div>
                  {item.replied_message && (
                    <button type="button" className={cn("mb-2 block w-full overflow-hidden rounded-lg border-l-4 p-2 text-left transition-colors", own ? "border-primary-foreground/60 bg-primary-foreground/10 hover:bg-primary-foreground/15" : "border-primary bg-muted/70 hover:bg-muted")} onClick={() => scrollToMessage(item.replied_message!.id)}>
                      <span className="block truncate text-xs font-semibold">{item.replied_message.user_id === item.user_id && own ? "You" : item.replied_message.sender_name}</span>
                      <span className="block truncate text-xs opacity-75">{item.replied_message.message || (item.replied_message.has_attachments ? "Attachment" : "Message")}</span>
                    </button>
                  )}
                  {(item.attachments?.length ?? 0) > 0 && (
                    <div className={cn("mb-2 grid gap-2", item.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                      {item.attachments.map((attachment) => isImageAttachment(attachment) ? (
                        <a key={attachment.id} href={attachment.file_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border bg-background/20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={attachment.file_url} alt={attachmentName(attachment)} className="max-h-56 w-full object-cover" />
                        </a>
                      ) : (
                        <a key={attachment.id} href={attachment.file_url} target="_blank" rel="noreferrer" className={cn("flex min-w-48 items-center gap-3 rounded-lg border p-3 transition-colors", own ? "border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/15" : "bg-muted/60 hover:bg-muted")}>
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background/80 text-foreground"><FileText className="size-5 text-primary" /></span>
                          <span className="min-w-0"><span className="block truncate text-sm font-medium">{attachmentName(attachment)}</span><span className="block text-[11px] opacity-70">File attachment</span></span>
                        </a>
                      ))}
                    </div>
                  )}
                  {item.message && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{item.message}</p>}
                  <p className={cn("mt-2 text-[11px] opacity-70", own && "text-right")}>{formatDate(item.created_at)}</p>
                </div>
              </div>;
            })}
          </div>
          {canReply && activeComplaint && (activeComplaint.status === "open" || canUpdateActiveComplaintStatus) && <div className="border-t p-4">
            {pendingAttachments.length > 0 && <div className="mb-2 flex flex-wrap gap-2">
              {pendingAttachments.map((attachment) => (
                <div key={attachment.id} className="group relative flex items-center gap-2 rounded-lg border bg-muted/30 px-2 py-1 text-xs">
                  {attachment.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={attachment.previewUrl} alt={attachment.file.name} className="size-9 rounded object-cover" />
                  ) : (
                    <FileText className="size-4 text-muted-foreground" />
                  )}
                  <span className="max-w-32 truncate">{attachment.file.name}</span>
                  <button type="button" onClick={() => removePendingAttachment(attachment.id)} className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground">
                    <X className="size-3" />
                    <span className="sr-only">Remove attachment</span>
                  </button>
                </div>
              ))}
            </div>}
            <input
              ref={attachmentInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              multiple
              className="hidden"
              onChange={(event) => {
                addPendingAttachments(event.target.files);
                event.target.value = "";
              }}
            />
            {activeComplaint.status !== "open" ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  This complaint is {statusLabel(activeComplaint.status).toLowerCase()}. Replies are disabled.
                </div>
                {canUpdateActiveComplaintStatus && (
                  <Select
                    value={activeComplaint.status}
                    disabled={statusSavingComplaintId === activeComplaint.id}
                    onValueChange={(value) => void updateComplaintStatus(activeComplaint, value)}
                  >
                    <SelectTrigger className="w-full sm:w-44">
                      {statusSavingComplaintId === activeComplaint.id && <Loader2 className="mr-2 size-4 animate-spin" />}
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
            <div className="overflow-hidden rounded-2xl border bg-background shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-primary/20">
              {replyingTo && (
                <div className="mx-3 mt-3 flex items-center gap-3 rounded-lg border-l-4 border-primary bg-muted/60 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-primary">Replying to {replyingTo.is_own ? "You" : replyingTo.sender_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{messagePreview(replyingTo)}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 rounded-full" onClick={clearReplyContext}>
                    <X className="size-4" />
                    <span className="sr-only">Cancel reply</span>
                  </Button>
                </div>
              )}
              <Textarea
                ref={replyInputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a reply..."
                rows={1}
                className="max-h-32 min-h-14 resize-none overflow-y-auto border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center justify-between gap-3 px-3 pb-3">
                <div className="flex items-center gap-2">
                  <Button type="button" size="icon" variant="ghost" className="size-9 rounded-full" onClick={() => attachmentInputRef.current?.click()} disabled={saving || pendingAttachments.length >= MAX_ATTACHMENTS}>
                    <Plus className="size-4" />
                    <span className="sr-only">Add attachment</span>
                  </Button>
                  {canUpdateActiveComplaintStatus && (
                    <Select
                      value={activeComplaint.status}
                      disabled={statusSavingComplaintId === activeComplaint.id}
                      onValueChange={(value) => void updateComplaintStatus(activeComplaint, value)}
                    >
                      <SelectTrigger className="h-9 w-36 rounded-full bg-muted/60 text-xs">
                        {statusSavingComplaintId === activeComplaint.id && <Loader2 className="mr-1 size-3.5 animate-spin" />}
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" className={cn("size-9 rounded-full", listening && "bg-primary/10 text-primary")} title={listening ? "Stop voice typing" : "Voice typing"} onClick={toggleDictation}>
                    <Mic className={cn("size-4", listening && "animate-pulse")} />
                    <span className="sr-only">Voice typing</span>
                  </Button>
                  <Button size="icon" className="size-9 rounded-full" onClick={() => void sendMessage()} disabled={saving || (!message.trim() && pendingAttachments.length === 0)} aria-busy={saving}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    <span className="sr-only">{saving ? "Sending reply" : "Send reply"}</span>
                  </Button>
                </div>
              </div>
            </div>
            )}
            {activeComplaint.status === "open" && <p className="mt-1 text-xs text-muted-foreground">Upload images or PDFs, maximum {MAX_ATTACHMENTS} files.</p>}
          </div>}
        </SheetContent>
      </Sheet>
    </div>
  );
}

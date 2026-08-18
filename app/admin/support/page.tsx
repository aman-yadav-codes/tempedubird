"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  ArrowDown,
  FileText,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Reply,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLiveChat } from "@/components/admin/admin-live-chat";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";

type Ticket = {
  id: number;
  ticket_number: string;
  institution_id: number | null;
  institution_name: string | null;
  created_by: number;
  created_by_name: string | null;
  created_by_avatar_url: string | null;
  assigned_to_name: string | null;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type TicketMessage = {
  id: number;
  user_id: number;
  user_name: string;
  user_role_name: string | null;
  message: string;
  is_internal: boolean;
  reply_to_message_id: number | null;
  replied_message: RepliedMessage | null;
  edited_at: string | null;
  created_at: string;
  event_type: "message" | "call";
  legacy_call_id: number | null;
  call_status: string | null;
  call_answered_by: number | null;
  call_answered_at: string | null;
  call_ended_at: string | null;
  call_duration_seconds: number;
  call_end_reason: string | null;
  attachments: TicketAttachment[];
};

type SupportRequesterProfile = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_profile_complete: boolean;
  created_at: string;
  address: string | null;
  roles: string[];
  institutions: string[];
  previous_tickets: Array<{
    id: number;
    ticket_number: string;
    subject: string;
    category: string;
    status: string;
    created_at: string;
  }>;
};

type RepliedMessage = {
  id: number;
  user_id: number;
  user_name: string;
  message: string;
  has_attachments: boolean;
};

type TicketAttachment = {
  id: number | string;
  file_name: string | null;
  file_url: string;
  uploaded_at?: string;
};

type PendingAttachment = {
  id: string;
  file: File;
  previewUrl: string | null;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

const MESSAGE_PAGE_SIZE = 10;
const MAX_ATTACHMENTS = 5;
const ACCEPTED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid response" };
  }
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function readTokenUserId(token: string | null) {
  if (!token) return null;
  try {
    const payload = JSON.parse(window.atob(token.split(".")[1] ?? ""));
    const id = Number(payload.id);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function isImageAttachment(attachment: TicketAttachment) {
  return /\/image\/upload\//i.test(attachment.file_url) || /\.(avif|gif|jpe?g|png|webp)(?:$|\?)/i.test(
    `${attachment.file_name ?? ""} ${attachment.file_url}`
  );
}

function attachmentName(attachment: TicketAttachment) {
  if (attachment.file_name) return attachment.file_name;
  try {
    return decodeURIComponent(
      new URL(attachment.file_url).pathname.split("/").pop() || "Attachment"
    );
  } catch {
    return "Attachment";
  }
}

function messagePreview(message: Pick<TicketMessage, "message" | "attachments">) {
  const text = message.message.trim();
  if (text) return text;
  if (message.attachments.some(isImageAttachment)) return "Photo";
  if (message.attachments.length > 0) return "Attachment";
  return "Message";
}

export default function SupportPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user, hasPermission } = useAuthStore();
  const searchParams = useSearchParams();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  const swipeRef = useRef({
    messageId: 0,
    pointerId: -1,
    startX: 0,
    startY: 0,
    isOwnMessage: false,
    horizontal: false,
    offset: 0,
  });
  const olderMessagesLoadingRef = useRef(false);
  const shouldScrollToBottomRef = useRef(false);
  const prependScrollHeightRef = useRef<number | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(-1);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    category: "syllabus",
    priority: "medium",
  });
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [olderMessagesLoading, setOlderMessagesLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [openedTicketParam, setOpenedTicketParam] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replyingTo, setReplyingTo] = useState<TicketMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<TicketMessage | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [replySaving, setReplySaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [statusSavingTicketId, setStatusSavingTicketId] = useState<number | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [swipingMessageId, setSwipingMessageId] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [requesterOpen, setRequesterOpen] = useState(false);
  const [requesterLoading, setRequesterLoading] = useState(false);
  const [requesterProfile, setRequesterProfile] = useState<SupportRequesterProfile | null>(null);

  const isPlatformAdmin = Boolean(user?.is_super_admin || user?.role_codes?.includes("platform_admin"));
  const isSupportProvider = isPlatformAdmin || Boolean(user?.role_codes?.includes("institution_admin"));
  const currentUserId = useMemo(() => readTokenUserId(accessToken), [accessToken]);
  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const isActiveTicketClosed = activeTicket?.status === "closed";
  const canEditMessages = hasPermission(
    "support.tickets.edit",
    activeTicket?.institution_id ?? null
  );

  const openRequesterProfile = useCallback(async () => {
    if (!activeTicket || !accessToken) return;
    setRequesterOpen(true);
    setRequesterLoading(true);
    setRequesterProfile(null);
    try {
      const res = await fetch(`/api/admin/support/tickets/${activeTicket.id}/requester`, {
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load requester profile");
      setRequesterProfile(json.data ?? null);
    } catch (error) {
      toast.error(readError(error));
    } finally {
      setRequesterLoading(false);
    }
  }, [accessToken, activeTicket, authHeaders]);
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

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.abort();
      speechRecognitionRef.current = null;
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const fetchTickets = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search: debouncedSearch,
      });
      const res = await fetch(`/api/admin/support/tickets?${params.toString()}`, {
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load support tickets");
      setTickets(json.data ?? []);
      setPageCount(json.pageCount ?? -1);
    } catch (error) {
      toast.error(readError(error));
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeaders, debouncedSearch, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(fetchTickets, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchTickets, isReady]);

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const scroll = () => {
      const container = messagesContainerRef.current;
      if (!container) return;
      container.scrollTo({ top: container.scrollHeight, behavior });
      setShowScrollToBottom(false);
    };

    window.requestAnimationFrame(() => window.requestAnimationFrame(scroll));
    window.setTimeout(scroll, 120);
  }, []);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (prependScrollHeightRef.current != null) {
      const previousScrollHeight = prependScrollHeightRef.current;
      prependScrollHeightRef.current = null;
      window.requestAnimationFrame(() => {
        const nextContainer = messagesContainerRef.current;
        if (!nextContainer) return;
        nextContainer.scrollTop = nextContainer.scrollHeight - previousScrollHeight;
      });
      return;
    }

    if (shouldScrollToBottomRef.current && !messagesLoading) {
      shouldScrollToBottomRef.current = false;
      scrollMessagesToBottom("auto");
    }
  }, [messages, messagesLoading, scrollMessagesToBottom]);

  const fetchMessages = useCallback(async (
    ticket: Ticket,
    options: { beforeId?: number; mode?: "replace" | "prepend" } = {}
  ) => {
    if (!accessToken) return;
    const isPrepend = options.mode === "prepend";
    if (isPrepend) {
      olderMessagesLoadingRef.current = true;
      setOlderMessagesLoading(true);
    } else {
      setMessagesLoading(true);
      setShowScrollToBottom(false);
    }

    try {
      const params = new URLSearchParams({ limit: String(MESSAGE_PAGE_SIZE) });
      if (options.beforeId) params.set("before_id", String(options.beforeId));
      const previousScrollHeight = messagesContainerRef.current?.scrollHeight ?? 0;
      const res = await fetch(`/api/admin/support/tickets/${ticket.id}/messages?${params.toString()}`, {
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load messages");
      const nextMessages = json.data ?? [];
      setHasMoreMessages(Boolean(json.hasMore));
      if (isPrepend) {
        prependScrollHeightRef.current = previousScrollHeight;
        setMessages((current) => [...nextMessages, ...current]);
      } else {
        shouldScrollToBottomRef.current = true;
        setMessages(nextMessages);
      }
    } catch (error) {
      toast.error(readError(error));
    } finally {
      if (isPrepend) {
        olderMessagesLoadingRef.current = false;
        setOlderMessagesLoading(false);
      } else {
        setMessagesLoading(false);
      }
    }
  }, [accessToken, authHeaders]);

  const openTicket = useCallback((ticket: Ticket) => {
    setPendingAttachments((current) => {
      current.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      });
      return [];
    });
    setActiveTicket(ticket);
    setMessages([]);
    setHasMoreMessages(false);
    setShowScrollToBottom(false);
    shouldScrollToBottomRef.current = true;
    prependScrollHeightRef.current = null;
    setReply("");
    setReplyingTo(null);
    setEditingMessage(null);
    fetchMessages(ticket);
  }, [fetchMessages]);

  const selectReplyMessage = useCallback((message: TicketMessage) => {
    setEditingMessage(null);
    setReplyingTo(message);
    window.requestAnimationFrame(() => replyInputRef.current?.focus());
  }, []);

  const startEditingMessage = useCallback((message: TicketMessage) => {
    setReplyingTo(null);
    setEditingMessage(message);
    setReply(message.message);
    setPendingAttachments((current) => {
      current.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      });
      return [];
    });
    window.requestAnimationFrame(() => {
      replyInputRef.current?.focus();
      replyInputRef.current?.setSelectionRange(
        message.message.length,
        message.message.length
      );
    });
  }, []);

  const clearComposerContext = useCallback(() => {
    if (editingMessage) setReply("");
    setEditingMessage(null);
    setReplyingTo(null);
  }, [editingMessage]);

  const scrollToMessage = useCallback(
    async (messageId: number) => {
      const findTarget = () =>
        messagesContainerRef.current?.querySelector<HTMLElement>(
          `[data-message-id="${messageId}"]`
        );
      const findBubble = () =>
        messagesContainerRef.current?.querySelector<HTMLElement>(
          `[data-message-bubble-id="${messageId}"]`
        );
      let target = findTarget();
      let bubble = findBubble();

      if (!target && activeTicket && accessToken) {
        try {
          const params = new URLSearchParams({
            message_id: String(messageId),
            limit: "1",
          });
          const res = await fetch(
            `/api/admin/support/tickets/${activeTicket.id}/messages?${params.toString()}`,
            { headers: authHeaders() }
          );
          const json = await readJson(res);
          if (!res.ok) {
            throw new Error(json.error ?? "Failed to load original message");
          }
          const original = json.data?.[0] as TicketMessage | undefined;
          if (!original) throw new Error("Original message is no longer available");
          setMessages((current) => {
            if (current.some((message) => message.id === original.id)) {
              return current;
            }
            return [...current, original].sort((a, b) => a.id - b.id);
          });
          await new Promise<void>((resolve) =>
            window.requestAnimationFrame(() =>
              window.requestAnimationFrame(() => resolve())
            )
          );
          target = findTarget();
          bubble = findBubble();
        } catch (error) {
          toast.error(readError(error));
          return;
        }
      }

      if (!target) {
        toast.error("Original message is no longer available");
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      const targetBubble = bubble ?? target;
      const theme = getComputedStyle(document.documentElement);
      const currentBackground = getComputedStyle(targetBubble).backgroundColor;
      const flashBackground = theme.getPropertyValue("--chat-flash-background").trim() || "rgb(254 226 226)";
      const flashRing = theme.getPropertyValue("--chat-flash-ring").trim() || "rgb(220 38 38 / 0.28)";
      targetBubble.animate(
        [
          { transform: "translateX(0)", backgroundColor: currentBackground, boxShadow: "0 0 0 0 transparent" },
          { transform: "translateX(10px)", backgroundColor: flashBackground, boxShadow: `0 0 0 7px ${flashRing}` },
          { transform: "translateX(0)", backgroundColor: currentBackground, boxShadow: "0 0 0 0 transparent" },
        ],
        { duration: 1200, easing: "ease-in-out" }
      );
      setHighlightedMessageId(messageId);
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = window.setTimeout(
        () => setHighlightedMessageId(null),
        1600
      );
    },
    [accessToken, activeTicket, authHeaders]
  );

  const finishSwipe = useCallback(
    (message: TicketMessage, isOwnMessage: boolean) => {
      const shouldReply = isOwnMessage
        ? swipeRef.current.offset <= -56
        : swipeRef.current.offset >= 56;
      if (shouldReply) selectReplyMessage(message);
      setSwipingMessageId(null);
      setSwipeOffset(0);
      swipeRef.current.pointerId = -1;
      swipeRef.current.horizontal = false;
      swipeRef.current.offset = 0;
    },
    [selectReplyMessage]
  );

  const removePendingAttachment = useCallback((id: string) => {
    setPendingAttachments((current) => {
      const target = current.find((attachment) => attachment.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((attachment) => attachment.id !== id);
    });
  }, []);

  const addPendingAttachments = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    setPendingAttachments((current) => {
      const availableSlots = Math.max(MAX_ATTACHMENTS - current.length, 0);
      if (files.length > availableSlots) {
        toast.error(`You can attach up to ${MAX_ATTACHMENTS} files`);
      }

      const accepted: PendingAttachment[] = [];
      for (const file of files.slice(0, availableSlots)) {
        if (!ACCEPTED_ATTACHMENT_TYPES.has(file.type)) {
          toast.error(`${file.name}: only images and PDFs are supported`);
          continue;
        }
        const maxSize = file.type === "application/pdf"
          ? 10 * 1024 * 1024
          : 5 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(
            `${file.name}: ${file.type === "application/pdf" ? "PDF" : "image"} is too large`
          );
          continue;
        }
        const duplicate = current.some(
          (attachment) =>
            attachment.file.name === file.name &&
            attachment.file.size === file.size &&
            attachment.file.lastModified === file.lastModified
        );
        if (duplicate) continue;
        accepted.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : null,
        });
      }
      return [...current, ...accepted];
    });
  }, []);

  const toggleDictation = useCallback(() => {
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
    const SpeechRecognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      const transcript = event.results[event.resultIndex]?.[0]?.transcript?.trim();
      if (!transcript) return;
      setReply((current) => `${current}${current.trim() ? " " : ""}${transcript}`);
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
  }, [listening, speechSupported]);

  const loadOlderMessages = useCallback(() => {
    if (!activeTicket || !hasMoreMessages || olderMessagesLoadingRef.current || olderMessagesLoading || messagesLoading) return;
    const oldestMessageId = messages[0]?.id;
    if (!oldestMessageId) return;
    fetchMessages(activeTicket, { beforeId: oldestMessageId, mode: "prepend" });
  }, [activeTicket, fetchMessages, hasMoreMessages, messages, messagesLoading, olderMessagesLoading]);

  const openTicketById = useCallback(async (ticketId: string) => {
    if (!accessToken) return;
    try {
      const params = new URLSearchParams({ ticket_id: ticketId, limit: "1" });
      const res = await fetch(`/api/admin/support/tickets?${params.toString()}`, {
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to open support ticket");
      const ticket = json.data?.[0] as Ticket | undefined;
      if (!ticket) throw new Error("Support ticket not found");
      openTicket(ticket);
      setOpenedTicketParam(ticketId);
    } catch (error) {
      toast.error(readError(error));
    }
  }, [accessToken, authHeaders, openTicket]);

  useEffect(() => {
    if (!isReady || !accessToken) return;
    const ticketId = searchParams.get("ticket");
    if (!ticketId || ticketId === openedTicketParam) return;
    const timeout = window.setTimeout(() => {
      void openTicketById(ticketId);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [accessToken, isReady, openTicketById, openedTicketParam, searchParams]);

  const createTicket = async () => {
    if (!accessToken) return;
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error("Subject and description are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/support/tickets", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to create ticket");
      toast.success("Support ticket created.");
      setCreateOpen(false);
      setForm({ subject: "", description: "", category: "syllabus", priority: "medium" });
      fetchTickets();
    } catch (error) {
      toast.error(readError(error));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = useCallback(async (ticket: Ticket, status: string) => {
    if (!accessToken) return;
    setStatusSavingTicketId(ticket.id);
    try {
      const res = await fetch("/api/admin/support/tickets", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id: ticket.id, status }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to update ticket");
      toast.success("Ticket status updated.");
      const updatedTicket = json.data as Ticket | undefined;
      if (updatedTicket) {
        setActiveTicket((current) => current?.id === updatedTicket.id ? { ...current, ...updatedTicket } : current);
        setTickets((current) => current.map((item) => item.id === updatedTicket.id ? { ...item, ...updatedTicket } : item));
      }
      fetchTickets();
    } catch (error) {
      toast.error(readError(error));
    } finally {
      setStatusSavingTicketId(null);
    }
  }, [accessToken, authHeaders, fetchTickets]);

  const sendReply = async () => {
    if (
      !accessToken ||
      !activeTicket ||
      (!reply.trim() && pendingAttachments.length === 0)
    ) return;
    if (activeTicket.status === "closed") {
      toast.error("This ticket is closed and cannot receive new replies.");
      return;
    }
    setReplySaving(true);
    try {
      if (editingMessage) {
        const res = await fetch(
          `/api/admin/support/tickets/${activeTicket.id}/messages`,
          {
            method: "PATCH",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({
              id: editingMessage.id,
              message: reply.trim(),
            }),
          }
        );
        const json = await readJson(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to edit message");
        setMessages((current) =>
          current.map((message) =>
            message.id === editingMessage.id
              ? {
                  ...message,
                  message: json.data.message,
                  edited_at: json.data.edited_at,
                }
              : message
          )
        );
        setReply("");
        setEditingMessage(null);
        toast.success("Message edited");
        return;
      }

      const formData = new FormData();
      formData.append("message", reply.trim());
      if (replyingTo) {
        formData.append("reply_to_message_id", String(replyingTo.id));
      }
      pendingAttachments.forEach((attachment) => {
        formData.append("files", attachment.file);
      });
      const res = await fetch(`/api/admin/support/tickets/${activeTicket.id}/messages`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to send reply");
      setReply("");
      pendingAttachments.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      });
      setPendingAttachments([]);
      setMessages((current) => [
        ...current,
        {
          ...(json.data as TicketMessage),
          replied_message: replyingTo
            ? {
                id: replyingTo.id,
                user_id: replyingTo.user_id,
                user_name: replyingTo.user_name,
                message: replyingTo.message,
                has_attachments: replyingTo.attachments.length > 0,
              }
            : null,
        },
      ]);
      setReplyingTo(null);
      shouldScrollToBottomRef.current = true;
      fetchTickets();
    } catch (error) {
      toast.error(readError(error));
    } finally {
      setReplySaving(false);
    }
  };

  const columns = useMemo<ColumnDef<Ticket>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
          aria-label="Select all tickets"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          aria-label="Select ticket"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "subject",
      header: "Ticket",
      cell: ({ row }) => (
        <div className="max-w-[420px]">
          <button
            type="button"
            className="block truncate text-left font-semibold hover:text-primary"
            onClick={() => openTicket(row.original)}
          >
            {row.original.subject}
          </button>
          <p className="text-xs text-muted-foreground">{row.original.ticket_number}</p>
        </div>
      ),
    },
    {
      accessorKey: "institution_name",
      header: "Institution",
      cell: ({ row }) => row.original.institution_name ?? "Platform",
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => <Badge variant="outline">{statusLabel(row.original.priority)}</Badge>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "open" ? "destructive" : row.original.status === "resolved" ? "default" : "secondary"}>
          {statusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ row }) => new Date(row.original.updated_at).toLocaleDateString("en-IN"),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => openTicket(row.original)}>View</DropdownMenuItem>
            {isPlatformAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={statusSavingTicketId === row.original.id}>
                    {statusSavingTicketId === row.original.id && (
                      <Loader2 className="mr-2 size-3.5 animate-spin" />
                    )}
                    Status
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      disabled={statusSavingTicketId === row.original.id}
                      onClick={() => updateStatus(row.original, "in_progress")}
                    >
                      In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={statusSavingTicketId === row.original.id}
                      onClick={() => updateStatus(row.original, "resolved")}
                    >
                      Resolved
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={statusSavingTicketId === row.original.id}
                      onClick={() => updateStatus(row.original, "closed")}
                    >
                      Closed
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ], [isPlatformAdmin, openTicket, statusSavingTicketId, updateStatus]);

  if (!isReady) return <div className="text-muted-foreground">Loading support...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
          <p className="text-muted-foreground">
            {isPlatformAdmin
              ? "Manage live visitor chats and institution assistance requests."
              : "Request help from the platform team or chat live."}
          </p>
        </div>
        {!isPlatformAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New Ticket
          </Button>
        )}
      </div>

      <Tabs defaultValue="live_chat" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="live_chat" className="gap-2">
            <MessageSquare className="size-4" />
            <span>Live Visitor Support</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2">
            <LifeBuoy className="size-4" />
            <span>Support Tickets</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live_chat">
          <AdminLiveChat />
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          <DataTable
            columns={columns}
            data={tickets}
            loading={loading}
            emptyText="There is no ticket raised yet."
            manualPagination
            pageCount={pageCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            toolbarLeft={
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tickets..."
                className="w-full sm:w-80"
              />
            }
            toolbarRight={
              <Button type="button" variant="ghost" size="icon" onClick={fetchTickets} disabled={loading}>
                <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                <span className="sr-only">Refresh support tickets</span>
              </Button>
            }
          />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Support Ticket</DialogTitle>
            <DialogDescription>Send a request to the platform team.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="syllabus">Syllabus</SelectItem>
                    <SelectItem value="program">Program</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createTicket} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(activeTicket)} onOpenChange={(open) => !open && setActiveTicket(null)}>
        <SheetContent className="h-dvh w-full gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b p-5 pr-12 text-left">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <SheetTitle className="flex items-center gap-2">
                  <LifeBuoy className="size-5 text-primary" />
                  {activeTicket?.ticket_number}
                </SheetTitle>
                <SheetDescription className="truncate">{activeTicket?.subject}</SheetDescription>
              </div>
              {activeTicket && isSupportProvider && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto shrink-0 rounded-full p-1"
                  onClick={() => void openRequesterProfile()}
                  title={`View ${activeTicket.created_by_name ?? "requester"} profile`}
                >
                  <Avatar className="size-11 border-2 border-primary/30">
                    <AvatarImage src={activeTicket.created_by_avatar_url ?? undefined} />
                    <AvatarFallback>
                      {(activeTicket.created_by_name ?? "U").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              )}
            </div>
          </SheetHeader>
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              ref={messagesContainerRef}
              className="relative min-h-0 flex-1 space-y-3 overflow-y-auto p-5"
              onScroll={(event) => {
                const container = event.currentTarget;
                const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
                setShowScrollToBottom(distanceFromBottom > 180);
                if (container.scrollTop < 80) loadOlderMessages();
              }}
            >
              {messagesLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-36 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  No messages yet.
                </div>
              ) : (
                <>
                  {olderMessagesLoading && (
                    <div className="sticky top-0 z-10 flex justify-center">
                      <span className="inline-flex items-center gap-2 rounded-full border bg-popover px-3 py-1 text-xs text-muted-foreground shadow-sm">
                        <Loader2 className="size-3 animate-spin" />
                        Loading previous messages
                      </span>
                    </div>
                  )}
                  {messages.map((message) => {
                    const isOwnMessage = Number(message.user_id) === Number(currentUserId);

                    return (
                      <div
                        key={message.id}
                        data-message-id={message.id}
                        className={`relative flex scroll-m-20 rounded-2xl transition-colors duration-500 ${
                          isOwnMessage ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`pointer-events-none absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-primary/10 text-primary transition-opacity ${
                            isOwnMessage ? "right-1" : "left-1"
                          } ${
                            swipingMessageId === message.id &&
                            Math.abs(swipeOffset) >= 24
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        >
                          <Reply className="size-4" />
                        </div>
                        <div
                          data-message-bubble-id={message.id}
                          className={`group/message relative max-w-[82%] touch-pan-y cursor-pointer select-none rounded-2xl px-4 py-3 shadow-sm transition-[transform,box-shadow,background-color] duration-500 ${
                            isOwnMessage
                              ? "rounded-br-sm bg-destructive text-white"
                              : "rounded-bl-sm border bg-card text-card-foreground"
                          } ${
                            swipingMessageId === message.id
                              ? "shadow-md"
                              : ""
                          } ${
                            highlightedMessageId === message.id
                              ? "ring-2 ring-destructive/45"
                              : ""
                          }`}
                          style={{
                            transform:
                              swipingMessageId === message.id
                                ? `translateX(${swipeOffset}px)`
                                : "translateX(0)",
                          }}
                          onPointerDown={(event) => {
                            if (
                              event.button !== 0 ||
                              (event.target as HTMLElement).closest("a,button")
                            ) {
                              return;
                            }
                            swipeRef.current = {
                              messageId: message.id,
                              pointerId: event.pointerId,
                              startX: event.clientX,
                              startY: event.clientY,
                              isOwnMessage,
                              horizontal: false,
                              offset: 0,
                            };
                            event.currentTarget.setPointerCapture(event.pointerId);
                            setSwipingMessageId(message.id);
                            setSwipeOffset(0);
                          }}
                          onPointerMove={(event) => {
                            const swipe = swipeRef.current;
                            if (
                              swipe.pointerId !== event.pointerId ||
                              swipe.messageId !== message.id
                            ) {
                              return;
                            }
                            const deltaX = event.clientX - swipe.startX;
                            const deltaY = event.clientY - swipe.startY;
                            if (
                              !swipe.horizontal &&
                              Math.abs(deltaX) < 8
                            ) {
                              return;
                            }
                            if (
                              !swipe.horizontal &&
                              Math.abs(deltaY) > Math.abs(deltaX)
                            ) {
                              return;
                            }
                            swipe.horizontal = true;
                            const directionalOffset = isOwnMessage
                              ? Math.min(0, deltaX)
                              : Math.max(0, deltaX);
                            const nextOffset = Math.max(
                              -84,
                              Math.min(84, directionalOffset)
                            );
                            swipe.offset = nextOffset;
                            setSwipeOffset(nextOffset);
                          }}
                          onPointerUp={(event) => {
                            if (
                              swipeRef.current.pointerId !== event.pointerId ||
                              swipeRef.current.messageId !== message.id
                            ) {
                              return;
                            }
                            if (
                              event.currentTarget.hasPointerCapture(event.pointerId)
                            ) {
                              event.currentTarget.releasePointerCapture(
                                event.pointerId
                              );
                            }
                            finishSwipe(message, isOwnMessage);
                          }}
                          onPointerCancel={() => {
                            setSwipingMessageId(null);
                            setSwipeOffset(0);
                            swipeRef.current.pointerId = -1;
                            swipeRef.current.offset = 0;
                            swipeRef.current.horizontal = false;
                          }}
                        >
                          <div className={`mb-1 flex items-center gap-2 ${isOwnMessage ? "justify-end" : "justify-between"}`}>
                            <span className="text-xs font-semibold opacity-90">
                              {message.user_name}{message.user_role_name ? ` (${message.user_role_name})` : ""}
                            </span>
                            {message.is_internal && <Badge variant="outline">Internal</Badge>}
                          </div>
                          {message.replied_message && (
                            <button
                              type="button"
                              className={`mb-2 block w-full overflow-hidden rounded-lg border-l-4 p-2 text-left transition-colors ${
                                isOwnMessage
                                  ? "border-primary-foreground/60 bg-primary-foreground/10 hover:bg-primary-foreground/15"
                                  : "border-primary bg-muted/70 hover:bg-muted"
                              }`}
                              onClick={() =>
                                void scrollToMessage(message.replied_message!.id)
                              }
                            >
                              <span className="block truncate text-xs font-semibold">
                                {message.replied_message.user_name}
                              </span>
                              <span className="block truncate text-xs opacity-75">
                                {message.replied_message.message ||
                                  (message.replied_message.has_attachments
                                    ? "Attachment"
                                    : "Message")}
                              </span>
                            </button>
                          )}
                          {(message.attachments?.length ?? 0) > 0 && (
                            <div
                              className={`mb-2 grid gap-2 ${
                                message.attachments.length > 1
                                  ? "grid-cols-2"
                                  : "grid-cols-1"
                              }`}
                            >
                              {message.attachments.map((attachment) =>
                                isImageAttachment(attachment) ? (
                                  <a
                                    key={attachment.id}
                                    href={attachment.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block overflow-hidden rounded-lg border bg-background/20"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={attachment.file_url}
                                      alt={attachmentName(attachment)}
                                      className="max-h-56 w-full object-cover"
                                    />
                                  </a>
                                ) : (
                                  <a
                                    key={attachment.id}
                                    href={attachment.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`flex min-w-48 items-center gap-3 rounded-lg border p-3 transition-colors ${
                                      isOwnMessage
                                        ? "border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/15"
                                        : "bg-muted/60 hover:bg-muted"
                                    }`}
                                  >
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background/80 text-foreground">
                                      <FileText className="size-5 text-primary" />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block truncate text-sm font-medium">
                                        {attachmentName(attachment)}
                                      </span>
                                      <span className="block text-[11px] opacity-70">
                                        PDF document
                                      </span>
                                    </span>
                                  </a>
                                )
                              )}
                            </div>
                          )}
                          {message.message && (
                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                              {message.message}
                            </p>
                          )}
                          <div
                            className={`mt-1 flex items-center gap-1 text-[11px] opacity-70 ${
                              isOwnMessage ? "justify-end" : "justify-start"
                            }`}
                          >
                            {isOwnMessage && canEditMessages && message.message && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`size-6 rounded-full opacity-0 transition-opacity group-hover/message:opacity-100 focus-visible:opacity-100 ${
                                  isOwnMessage
                                    ? "text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                                    : ""
                                }`}
                                title="Edit message"
                                onClick={() => startEditingMessage(message)}
                              >
                                <Pencil className="size-3" />
                                <span className="sr-only">Edit message</span>
                              </Button>
                            )}
                            {message.edited_at && (
                              <span className="italic">Edited</span>
                            )}
                            <span>
                              {new Date(message.created_at).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
            {showScrollToBottom && (
              <div className="pointer-events-none absolute bottom-32 left-1/2 z-20 -translate-x-1/2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="pointer-events-auto rounded-full shadow-lg"
                  onClick={() => scrollMessagesToBottom("smooth")}
                >
                  <ArrowDown className="size-4" />
                  Latest
                </Button>
              </div>
            )}
            <div className="shrink-0 border-t p-4">
              {isActiveTicketClosed ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    This ticket is closed. Replies are disabled.
                  </div>
                  {isPlatformAdmin && activeTicket && (
                    <Select
                      value={activeTicket.status}
                      disabled={statusSavingTicketId === activeTicket.id}
                      onValueChange={(value) => updateStatus(activeTicket, value)}
                    >
                      <SelectTrigger className="w-full sm:w-44">
                        {statusSavingTicketId === activeTicket.id && (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
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
                  {(replyingTo || editingMessage) && (
                    <div className="mx-3 mt-3 flex items-center gap-3 rounded-lg border-l-4 border-primary bg-muted/60 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-primary">
                          {editingMessage
                            ? "Editing message"
                            : `Replying to ${replyingTo?.user_name}`}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {editingMessage
                            ? editingMessage.message
                            : replyingTo
                              ? messagePreview(replyingTo)
                              : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 rounded-full"
                        onClick={clearComposerContext}
                      >
                        <X className="size-4" />
                        <span className="sr-only">
                          Cancel {editingMessage ? "editing" : "reply"}
                        </span>
                      </Button>
                    </div>
                  )}
                  {pendingAttachments.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto px-3 pt-3">
                      {pendingAttachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="group relative shrink-0 overflow-hidden rounded-lg border bg-muted"
                        >
                          {attachment.previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={attachment.previewUrl}
                              alt={attachment.file.name}
                              className="size-16 object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-44 items-center gap-2 px-3">
                              <FileText className="size-5 shrink-0 text-primary" />
                              <span className="truncate text-xs font-medium">
                                {attachment.file.name}
                              </span>
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="absolute right-1 top-1 size-6 rounded-full shadow-sm"
                            onClick={() => removePendingAttachment(attachment.id)}
                          >
                            <X className="size-3.5" />
                            <span className="sr-only">
                              Remove {attachment.file.name}
                            </span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Textarea
                    ref={replyInputRef}
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        void sendReply();
                      }
                    }}
                    placeholder={
                      editingMessage ? "Edit your message..." : "Write a reply..."
                    }
                    rows={1}
                    className="max-h-32 min-h-14 resize-none overflow-y-auto border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0"
                  />
                  <div className="flex items-center justify-between gap-3 px-3 pb-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <input
                        ref={attachmentInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                        multiple
                        className="sr-only"
                        onChange={(event) => {
                          addPendingAttachments(event.target.files);
                          event.currentTarget.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-full"
                        title="Add images or PDFs"
                        disabled={
                          Boolean(editingMessage) ||
                          pendingAttachments.length >= MAX_ATTACHMENTS
                        }
                        onClick={() => attachmentInputRef.current?.click()}
                      >
                        <Plus className="size-5" />
                        <span className="sr-only">Add attachments</span>
                      </Button>
                      {isPlatformAdmin && activeTicket && (
                      <Select
                        value={activeTicket.status}
                        disabled={statusSavingTicketId === activeTicket.id}
                        onValueChange={(value) => updateStatus(activeTicket, value)}
                      >
                        <SelectTrigger className="h-9 w-36 rounded-full bg-muted/60 text-xs">
                          {statusSavingTicketId === activeTicket.id && (
                            <Loader2 className="mr-1 size-3.5 animate-spin" />
                          )}
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`size-9 rounded-full ${
                          listening ? "bg-primary/10 text-primary" : ""
                        }`}
                        title={listening ? "Stop voice typing" : "Voice typing"}
                        onClick={toggleDictation}
                      >
                        <Mic className={`size-4 ${listening ? "animate-pulse" : ""}`} />
                        <span className="sr-only">Voice typing</span>
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        className="size-9 rounded-full"
                        onClick={() => void sendReply()}
                        disabled={
                          replySaving ||
                          (!reply.trim() && pendingAttachments.length === 0)
                        }
                      >
                        {replySaving ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        <span className="sr-only">Send reply</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={requesterOpen} onOpenChange={setRequesterOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Support requester</DialogTitle>
            <DialogDescription>Account context and previous support topics.</DialogDescription>
          </DialogHeader>
          {requesterLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" /> Loading profile...
            </div>
          ) : requesterProfile ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 rounded-xl border p-4">
                <Avatar className="size-16 border">
                  <AvatarImage src={requesterProfile.avatar_url ?? undefined} />
                  <AvatarFallback className="text-lg">
                    {requesterProfile.full_name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{requesterProfile.full_name}</p>
                  <p className="text-sm text-muted-foreground">{requesterProfile.roles.join(", ") || "User"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant={requesterProfile.is_active ? "default" : "secondary"}>{requesterProfile.is_active ? "Active" : "Inactive"}</Badge>
                    <Badge variant="outline">{requesterProfile.is_verified ? "Verified" : "Not verified"}</Badge>
                    <Badge variant="outline">{requesterProfile.is_profile_complete ? "Profile complete" : "Profile incomplete"}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Email</p><p className="break-all font-medium">{requesterProfile.email}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{requesterProfile.phone || "Not provided"}</p></div>
                <div className="rounded-lg border p-3 sm:col-span-2"><p className="text-xs text-muted-foreground">Address</p><p className="font-medium">{requesterProfile.address || "Not provided"}</p></div>
                <div className="rounded-lg border p-3 sm:col-span-2"><p className="text-xs text-muted-foreground">Belongs to institution</p><p className="font-medium">{requesterProfile.institutions.join(", ") || "Not assigned to an institution"}</p></div>
              </div>
              <div className="space-y-3">
                <div><h3 className="font-semibold">Previous support</h3><p className="text-sm text-muted-foreground">Earlier tickets and topics from this requester.</p></div>
                {requesterProfile.previous_tickets.length ? requesterProfile.previous_tickets.map((ticket) => (
                  <div key={ticket.id} className="w-full rounded-lg border p-3 text-left">
                    <div className="flex items-center justify-between gap-3"><span className="font-medium">{ticket.subject}</span><Badge variant="outline">{ticket.status}</Badge></div>
                    <p className="mt-1 text-xs text-muted-foreground">{ticket.ticket_number} · {ticket.category} · {new Date(ticket.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                )) : <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No previous support tickets.</div>}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">Profile details are unavailable.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Send,
  User,
  Mail,
  Phone,
  MessageCircle,
  Loader2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  XCircle,
  Sparkles,
  Bot,
  UserCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { readJsonResponse } from "@/lib/api/read-json-response";
import { useAuthStore } from "@/store";

type LiveChatSession = {
  id: number;
  session_token: string;
  full_name: string;
  email: string;
  phone_number: string;
  whatsapp_number: string | null;
  status: "active" | "resolved" | "closed";
  unread_admin_count: number;
  unread_user_count: number;
  last_message_at: string;
  created_at: string;
  last_message_text?: string | null;
};

type LiveChatMessage = {
  id: number;
  session_id: number;
  sender_type: "user" | "admin";
  sender_id: number | null;
  sender_name: string;
  message: string;
  created_at: string;
};

const QUICK_RESPONSES = [
  "Hello! How can I assist you today?",
  "Thank you for contacting support! Let me check the details for you.",
  "Could you please share your registered email or enrollment ID?",
  "We are processing your request. Please hold on for a moment.",
  "Your inquiry has been resolved. Please let us know if you need any further assistance!",
];

export function AdminLiveChat() {
  const { accessToken } = useAuthStore();
  const [sessions, setSessions] = useState<LiveChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<LiveChatSession | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [replyMessage, setReplyMessage] = useState("");

  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch session list
  const fetchSessions = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoadingSessions(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/live-chat/sessions?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await readJsonResponse<{
        sessions: LiveChatSession[];
        total: number;
      }>(res);

      if (res.ok && data.sessions) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error("Error fetching live chat sessions:", err);
    } finally {
      if (showLoading) setIsLoadingSessions(false);
    }
  }, [accessToken, searchQuery, statusFilter]);

  // Fetch messages for selected session
  const fetchMessages = useCallback(async (sessionId: number, showLoading = false) => {
    if (showLoading) setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/live-chat/sessions/${sessionId}/messages`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await readJsonResponse<{
        session: LiveChatSession;
        messages: LiveChatMessage[];
      }>(res);

      if (res.ok && data.session) {
        setSelectedSession(data.session);
        setMessages(data.messages || []);
        
        // Update session in sessions list to sync unread count = 0
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, unread_admin_count: 0 } : s))
        );
      }
    } catch (err) {
      console.error("Error fetching chat messages for admin:", err);
    } finally {
      if (showLoading) setIsLoadingMessages(false);
    }
  }, [accessToken]);

  // Initial load
  useEffect(() => {
    fetchSessions(true);
  }, [fetchSessions]);

  // Polling loop for sessions & active chat
  useEffect(() => {
    pollTimerRef.current = setInterval(() => {
      fetchSessions(false);
      if (selectedSessionId) {
        fetchMessages(selectedSessionId, false);
      }
    }, 3000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchSessions, fetchMessages, selectedSessionId]);

  const handleSelectSession = (session: LiveChatSession) => {
    setSelectedSessionId(session.id);
    setSelectedSession(session);
    fetchMessages(session.id, true);
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyMessage.trim() || !selectedSessionId || isSending) return;

    const messageText = replyMessage.trim();
    setReplyMessage("");
    setIsSending(true);

    try {
      const res = await fetch(`/api/admin/live-chat/sessions/${selectedSessionId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await readJsonResponse<{ message: LiveChatMessage }>(res);

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      // Append new message
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      fetchSessions(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message.");
      setReplyMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: "active" | "resolved" | "closed") => {
    if (!selectedSessionId || isUpdatingStatus) return;
    setIsUpdatingStatus(true);

    try {
      const res = await fetch(`/api/admin/live-chat/sessions/${selectedSessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await readJsonResponse<{ session: LiveChatSession }>(res);

      if (!res.ok || !data.session) {
        throw new Error("Failed to update status");
      }

      toast.success(`Chat session marked as ${newStatus}`);
      setSelectedSession(data.session);
      setSessions((prev) =>
        prev.map((s) => (s.id === selectedSessionId ? { ...s, status: newStatus } : s))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // WhatsApp quick launcher URL
  const getWhatsAppUrl = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(`Hi ${selectedSession?.full_name || ""}, this is EduBird Platform Support.`);
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-[750px]">
      {/* Top Header Bar */}
      <div className="border-b border-border bg-muted/30 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg leading-tight flex items-center gap-2">
              Live Visitor Chats
              <Badge variant="secondary" className="font-normal text-xs">
                {sessions.length} total
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Real-time incoming support requests from website visitors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search visitor, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs bg-background"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9 text-xs bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSessions(true)}
            className="h-9 w-9 p-0"
            title="Refresh Sessions"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingSessions ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[340px_1fr] min-h-0 divide-x divide-border">
        {/* Left: Sessions Sidebar */}
        <div className="flex flex-col min-h-0 bg-muted/10">
          <div className="p-3 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Conversations</span>
            <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {isLoadingSessions ? (
              <div className="p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Loading conversations...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground space-y-2">
                <MessageCircle className="h-8 w-8 mx-auto opacity-40" />
                <p className="text-sm font-medium">No live chat requests found</p>
                <p className="text-xs">New visitor chats will appear here automatically.</p>
              </div>
            ) : (
              sessions.map((sess) => {
                const isSelected = sess.id === selectedSessionId;
                const hasUnread = sess.unread_admin_count > 0;
                const formattedTime = new Date(sess.last_message_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <button
                    key={sess.id}
                    onClick={() => handleSelectSession(sess)}
                    className={`w-full text-left p-4 transition-colors flex flex-col gap-2 relative ${
                      isSelected
                        ? "bg-primary/10 border-l-4 border-l-primary"
                        : hasUnread
                        ? "bg-emerald-500/5 hover:bg-muted/40"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {sess.full_name}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{formattedTime}</span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1 break-all">
                      {sess.last_message_text || "No messages yet"}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                        <Mail className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate">{sess.email}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasUnread && (
                          <span className="rounded-full bg-emerald-500 text-white font-bold text-[10px] px-1.5 py-0.5 animate-pulse">
                            {sess.unread_admin_count} new
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                            sess.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : sess.status === "resolved"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-gray-500/10 text-gray-500"
                          }`}
                        >
                          {sess.status}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Active Session Thread */}
        {!selectedSession ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <div className="p-4 bg-primary/10 rounded-full text-primary mb-3">
              <UserCheck className="h-8 w-8" />
            </div>
            <h4 className="font-semibold text-foreground text-base">Select a conversation</h4>
            <p className="text-xs max-w-sm mt-1">
              Choose a visitor request from the left sidebar to view details, message transcript, and respond in real-time.
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full min-h-0 bg-background">
            {/* Conversation Header */}
            <div className="p-4 border-b border-border bg-card flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-base text-foreground">{selectedSession.full_name}</h4>
                  <span
                    className={`text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full ${
                      selectedSession.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                        : selectedSession.status === "resolved"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30"
                        : "bg-gray-500/10 text-gray-500 ring-1 ring-gray-400/30"
                    }`}
                  >
                    {selectedSession.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <a
                    href={`mailto:${selectedSession.email}`}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span>{selectedSession.email}</span>
                  </a>

                  <a
                    href={`tel:${selectedSession.phone_number.replace(/\s+/g, "")}`}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>{selectedSession.phone_number}</span>
                  </a>

                  {selectedSession.whatsapp_number && (
                    <a
                      href={getWhatsAppUrl(selectedSession.whatsapp_number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>WhatsApp: {selectedSession.whatsapp_number}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Status Controls */}
              <div className="flex items-center gap-2">
                {selectedSession.status !== "resolved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange("resolved")}
                    disabled={isUpdatingStatus}
                    className="text-xs gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Resolved
                  </Button>
                )}

                {selectedSession.status !== "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange("active")}
                    disabled={isUpdatingStatus}
                    className="text-xs gap-1.5"
                  >
                    Reopen Chat
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Response Shortcuts Bar */}
            <div className="bg-muted/30 border-b border-border px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> Quick Replies:
              </span>
              {QUICK_RESPONSES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => setReplyMessage(tmpl)}
                  className="px-2.5 py-1 rounded-md bg-background border border-border hover:border-primary text-foreground text-xs shrink-0 transition-colors"
                >
                  {tmpl.length > 30 ? `${tmpl.slice(0, 30)}...` : tmpl}
                </button>
              ))}
            </div>

            {/* Chat Transcript Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-muted/10">
              {isLoadingMessages && messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-8">
                  No messages exchanged yet in this session.
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.sender_type === "admin";
                  const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? "items-end" : "items-start"} space-y-1`}
                    >
                      <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-muted-foreground">
                        <span>{isAdmin ? `${msg.sender_name || "Admin"} (You)` : msg.sender_name}</span>
                        <span>•</span>
                        <span>{timeStr}</span>
                      </div>

                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          isAdmin
                            ? "bg-primary text-primary-foreground rounded-tr-xs shadow-xs"
                            : "bg-card border border-border text-foreground rounded-tl-xs shadow-xs"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Admin Response Form */}
            <form onSubmit={handleSendReply} className="p-4 border-t border-border bg-card flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Textarea
                  placeholder="Type your response to visitor..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  className="min-h-[70px] max-h-[140px] bg-background text-sm resize-none focus-visible:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground">Press Enter to send, Shift+Enter for new line.</p>
              </div>

              <Button
                type="submit"
                disabled={isSending || !replyMessage.trim()}
                className="h-[70px] px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs shrink-0 flex flex-col items-center justify-center gap-1"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span className="text-xs">Send</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

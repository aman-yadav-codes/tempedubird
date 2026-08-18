"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Send,
  User,
  Mail,
  Phone,
  MessageCircle,
  Loader2,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  X,
  Bot,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LiveChatMessage = {
  id: number;
  session_id: number;
  sender_type: "user" | "admin";
  sender_name: string;
  message: string;
  created_at: string;
};

type LiveChatSession = {
  id: number;
  session_token: string;
  full_name: string;
  email: string;
  phone_number: string;
  whatsapp_number: string | null;
  status: "active" | "resolved" | "closed";
};

const STORAGE_KEY_TOKEN = "edubird_live_chat_token";
const STORAGE_KEY_USER = "edubird_live_chat_user_v1";

export function ContactLiveChat() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [session, setSession] = useState<LiveChatSession | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  
  // Visitor Form inputs
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  const [inputMessage, setInputMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load saved session token & user info from localStorage on mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      const savedUserStr = localStorage.getItem(STORAGE_KEY_USER);

      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phoneNumber) setPhoneNumber(parsed.phoneNumber);
        if (parsed.whatsappNumber) setWhatsappNumber(parsed.whatsappNumber);
      }

      if (savedToken) {
        setSessionToken(savedToken);
        fetchMessages(savedToken, true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Poll for messages every 3 seconds when active session exists
  useEffect(() => {
    if (!sessionToken) return;

    pollIntervalRef.current = setInterval(() => {
      fetchMessages(sessionToken, false);
    }, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [sessionToken]);

  const fetchMessages = async (token: string, initialLoad = false) => {
    if (initialLoad) setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/public/live-chat/messages?session_token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSession(data.session);
        setMessages(data.messages || []);
      } else if (initialLoad && data.error?.includes("not found")) {
        // clear stale token
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        setSessionToken(null);
      }
    } catch (err) {
      console.error("Error fetching chat messages:", err);
    } finally {
      if (initialLoad) setIsLoadingMessages(false);
    }
  };

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMsg("Please enter your phone number.");
      return;
    }

    setIsStarting(true);

    try {
      // Save form details in localStorage
      localStorage.setItem(
        STORAGE_KEY_USER,
        JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          whatsappNumber: whatsappNumber.trim(),
        })
      );

      const res = await fetch("/api/public/live-chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          whatsappNumber: whatsappNumber.trim() || null,
          sessionToken: sessionToken || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to start chat session.");
      }

      const newSession: LiveChatSession = data.session;
      setSession(newSession);
      setSessionToken(newSession.session_token);
      localStorage.setItem(STORAGE_KEY_TOKEN, newSession.session_token);

      // Load messages
      await fetchMessages(newSession.session_token, true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to start live chat.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !sessionToken || isSending) return;

    const messageText = inputMessage.trim();
    setInputMessage("");
    setIsSending(true);

    // Optimistic UI update
    const tempId = Date.now();
    const tempMsg: LiveChatMessage = {
      id: tempId,
      session_id: session?.id ?? 0,
      sender_type: "user",
      sender_name: session?.full_name || fullName || "You",
      message: messageText,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/public/live-chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          message: messageText,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send message.");
      }

      // Re-fetch to get synced message ID
      await fetchMessages(sessionToken, false);
    } catch (err) {
      console.error("Failed to send message:", err);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleResetChat = () => {
    if (confirm("Are you sure you want to start a new chat session?")) {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      setSessionToken(null);
      setSession(null);
      setMessages([]);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-md shadow-xl overflow-hidden transition-all duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary via-primary/90 to-emerald-600 px-6 py-5 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs ring-1 ring-white/20">
              <Headphones className="h-6 w-6 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg leading-tight text-white">Live Support Chat</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping" />
                Online
              </span>
            </div>
            <p className="text-xs text-white/80 mt-0.5">
              Ask any question & get immediate responses from our support team.
            </p>
          </div>
        </div>

        {sessionToken && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetChat}
            className="text-white/80 hover:text-white hover:bg-white/10 text-xs gap-1.5 rounded-lg"
            title="Start New Inquiry"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Session</span>
          </Button>
        )}
      </div>

      {/* Main Body */}
      {!sessionToken ? (
        /* STEP 1: INITIAL VISITOR DETAILS FORM */
        <div className="p-6 lg:p-8 space-y-6">
          <div className="space-y-1">
            <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Introduce Yourself to Start Chatting
            </h4>
            <p className="text-sm text-muted-foreground">
              Please enter your contact details below so our support team can reach out and assist you immediately.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-medium flex items-center gap-2">
              <X className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleStartChat} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="chat-fullName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="chat-fullName"
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-background/50 focus:bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chat-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="chat-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/50 focus:bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chat-phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="chat-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="bg-background/50 focus:bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="chat-whatsapp" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                    WhatsApp Number
                  </Label>
                  <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    Optional
                  </span>
                </div>
                <Input
                  id="chat-whatsapp"
                  type="tel"
                  placeholder="+91 98765 43210 (Optional)"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="bg-background/50 focus:bg-background"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isStarting}
              className="w-full py-6 text-base font-semibold shadow-md bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white gap-2 mt-2 transition-all duration-200"
            >
              {isStarting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting to Support...
                </>
              ) : (
                <>
                  <MessageSquare className="h-5 w-5" />
                  Start Live Chat Now
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 flex items-center justify-center gap-6 text-xs text-muted-foreground border-t border-border/60">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Instant Response
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              No Wait Time
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Private & Secure
            </span>
          </div>
        </div>
      ) : (
        /* STEP 2: ACTIVE LIVE CHAT WINDOW */
        <div className="flex flex-col h-[520px]">
          {/* Visitor Info Strip */}
          <div className="bg-muted/40 border-b border-border px-6 py-2.5 text-xs text-muted-foreground flex items-center justify-between">
            <div className="flex items-center gap-3 truncate">
              <span className="font-semibold text-foreground truncate">{session?.full_name}</span>
              <span className="hidden sm:inline opacity-40">•</span>
              <span className="hidden sm:inline truncate">{session?.email}</span>
              <span className="hidden md:inline opacity-40">•</span>
              <span className="hidden md:inline">{session?.phone_number}</span>
            </div>
            <span className="shrink-0 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Session
            </span>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-background/30 to-muted/20">
            {isLoadingMessages && messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <span className="text-xs">Loading chat history...</span>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto p-4">
                <div className="p-3 bg-primary/10 rounded-full text-primary mb-3">
                  <Bot className="h-8 w-8" />
                </div>
                <h5 className="font-semibold text-foreground">Welcome, {session?.full_name}!</h5>
                <p className="text-xs text-muted-foreground mt-1">
                  You are connected with our support team. Send your message or question below to get started right away!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.sender_type === "user";
                const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
                  >
                    <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-muted-foreground">
                      <span>{isUser ? "You" : msg.sender_name || "Platform Support"}</span>
                      <span>•</span>
                      <span>{timeStr}</span>
                    </div>

                    <div
                      className={`max-w-[82%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-xs text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isUser
                          ? "bg-primary text-primary-foreground rounded-tr-xs"
                          : "bg-card border border-border/80 text-foreground rounded-tl-xs shadow-sm"
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

          {/* Message Input Form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-card flex items-center gap-2">
            <Input
              type="text"
              placeholder="Type your question or message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-background focus-visible:ring-primary py-5"
            />
            <Button
              type="submit"
              disabled={isSending || !inputMessage.trim()}
              className="h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs shrink-0 gap-1.5"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

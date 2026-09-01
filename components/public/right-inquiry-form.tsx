"use client";

import React, { useState } from "react";
import {
  Send,
  User,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuthStore } from "@/store";

type RightInquiryFormProps = {
  title?: string;
  subtitle?: string;
  categoryLabel?: string;
  categoryOptions?: string[];
  selectedItemName?: string | null;
  institutionId?: number | null;
  programId?: number | null;
  onClearSelectedItem?: () => void;
};

export function RightInquiryForm({
  title = "Quick Admission & Inquiry Form",
  subtitle = "Fill in your details to get instant assistance from our academic counselors.",
  categoryLabel = "Select Interest",
  categoryOptions = [
    "General Inquiry",
    "Institute Admission",
    "Course Enrollment",
    "Teacher Consultation",
    "Hostel & Accommodation",
    "Practice Exam & Test Series",
    "Notes & Study Material",
    "Library Access",
  ],
  selectedItemName,
  institutionId,
  programId,
  onClearSelectedItem,
}: RightInquiryFormProps) {
  const { user, accessToken } = useAuthStore();
  const [name, setName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [category, setCategory] = useState(categoryOptions[0] || "General Inquiry");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill in all required fields (Name, Email, Phone).");
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/public/enquiries", {
        method: "POST",
        headers,
        body: JSON.stringify({
          student_name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          preferred_program: selectedItemName || category,
          institution_id: institutionId || null,
          program_id: programId || null,
          user_id: user?.id || null,
          source: institutionId ? `Own Website Inquiry (${category})` : `Platform Inquiry (${category})`,
          source_type: institutionId ? "own_website" : "edubird",
          notes: message.trim() || `Inquiry for ${category} ${selectedItemName ? `- ${selectedItemName}` : ""}`,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit inquiry.");

      setSubmitted(true);
      toast.success("Inquiry submitted successfully! Our counseling team will reach out to you shortly.");
      setMessage("");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("student_enrollment_updated"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sticky top-24 space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-md space-y-5">
        <div className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {title}
            </h3>
            <Badge variant="outline" className="text-[10px]">Instant Assistance</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{subtitle}</p>
        </div>

        {selectedItemName && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] uppercase font-bold text-primary tracking-wider">Inquiring About:</p>
              <p className="font-bold text-foreground truncate">{selectedItemName}</p>
            </div>
            {onClearSelectedItem && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelectedItem}
                className="h-6 text-[10px] text-muted-foreground hover:text-foreground shrink-0"
              >
                Clear
              </Button>
            )}
          </div>
        )}

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-foreground text-base">Inquiry Submitted!</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Thank you {name}. Our counselor will reach out to you via call or email within 15 minutes.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSubmitted(false)}
              className="text-xs mt-2"
            >
              Submit Another Inquiry
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" />
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" />
                Phone / WhatsApp <span className="text-destructive">*</span>
              </Label>
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-background text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Headphones className="h-3.5 w-3.5 text-primary" />
                {categoryLabel}
              </Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-ring"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                Your Requirements / Query
              </Label>
              <Textarea
                placeholder="Tell us what you are looking for..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="bg-background text-xs resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full py-5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-2 mt-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Inquiry</span>
                </>
              )}
            </Button>
          </form>
        )}
      </div>

      {/* Trust banner */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-3 flex items-center gap-2.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
        <span>100% Privacy Protection & Instant Support</span>
      </div>
    </div>
  );
}

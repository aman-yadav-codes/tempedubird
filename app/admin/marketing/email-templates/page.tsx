"use client";

import { useState } from "react";
import { Mail, Plus, Send, Edit2, Sparkles, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function EmailTemplatesPage() {
  const [subject, setSubject] = useState("Welcome to EduBird - Explore Programs & Admission Deadlines");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Template & Campaign Builder
          </h1>
          <p className="text-sm text-muted-foreground">
            Design marketing email templates, automated welcome drips, and newsletter campaigns for students.
          </p>
        </div>

        <Button className="gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          <span>New Email Template</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { title: "Admission Open Drip", category: "Marketing", subject: "Admissions are now open for 2026 academic batch!", lastUsed: "2 days ago" },
          { title: "Course Info Drip", category: "Nurturing", subject: "Discover top-rated engineering & management courses", lastUsed: "Yesterday" },
          { title: "Festival Discount Offer", category: "Promotions", subject: "Exclusive 20% Off on Premium Course Listing Package", lastUsed: "3 hours ago" },
        ].map((tmpl, idx) => (
          <div key={idx} className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] uppercase font-semibold">{tmpl.category}</Badge>
                <span className="text-[11px] text-muted-foreground">{tmpl.lastUsed}</span>
              </div>
              <h3 className="font-bold text-base text-foreground">{tmpl.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.subject}</p>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <Button size="sm" variant="ghost" className="text-xs gap-1 text-primary">
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button size="sm" className="text-xs gap-1">
                <Send className="h-3.5 w-3.5" /> Send Campaign
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

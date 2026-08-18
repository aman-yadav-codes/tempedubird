"use client";

import { useState } from "react";
import { FileText, Plus, Code, CheckCircle, Copy, Eye, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type FormField = {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "select" | "textarea";
  required: boolean;
};

export default function FormBuilderPage() {
  const [formTitle, setFormTitle] = useState("Admission Inquiry Lead Form");
  const [fields, setFields] = useState<FormField[]>([
    { id: "1", label: "Full Name", type: "text", required: true },
    { id: "2", label: "Email Address", type: "email", required: true },
    { id: "3", label: "Phone Number", type: "phone", required: true },
    { id: "4", label: "Course Interested In", type: "select", required: true },
    { id: "5", label: "Message / Query", type: "textarea", required: false },
  ]);

  const copyEmbedCode = () => {
    const code = `<iframe src="http://localhost:3000/embed/form/inquiry-form" width="100%" height="500"></iframe>`;
    navigator.clipboard.writeText(code);
    toast.success("Embed code copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Lead Capture Form Builder
          </h1>
          <p className="text-sm text-muted-foreground">
            Create custom student inquiry & admission lead capture forms to embed on websites or landing pages.
          </p>
        </div>

        <Button onClick={copyEmbedCode} variant="outline" className="gap-2 shadow-xs">
          <Code className="h-4 w-4 text-primary" />
          <span>Copy Embed Code</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Form Controls */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-4">
          <h3 className="font-bold text-base text-foreground">Form Configuration</h3>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Form Name</label>
            <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="bg-background text-sm" />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">Form Fields ({fields.length})</span>
              <Button size="sm" variant="ghost" className="text-xs gap-1 text-primary">
                <Plus className="h-3.5 w-3.5" /> Add Field
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((f) => (
                <div key={f.id} className="p-3 rounded-lg border border-border bg-background flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-foreground">{f.label}</span>
                    <span className="text-muted-foreground ml-2">({f.type})</span>
                  </div>
                  <Badge variant={f.required ? "default" : "secondary"} className="text-[10px]">
                    {f.required ? "Required" : "Optional"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Form Preview */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-primary" /> Live Form Preview
            </span>
            <Badge variant="outline" className="text-[10px]">Preview Mode</Badge>
          </div>

          <div className="space-y-4 p-4 rounded-xl border border-border/60 bg-muted/20">
            <h4 className="font-bold text-base text-foreground">{formTitle}</h4>

            {fields.map((f) => (
              <div key={f.id} className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  {f.label} {f.required && <span className="text-destructive">*</span>}
                </label>
                <Input placeholder={`Enter ${f.label.toLowerCase()}`} disabled className="bg-background text-xs" />
              </div>
            ))}

            <Button disabled className="w-full text-xs font-semibold bg-primary text-primary-foreground">
              Submit Inquiry
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

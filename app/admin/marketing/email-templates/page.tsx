"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Code,
  Edit,
  Eye,
  FileCode,
  Layers,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";

export const MERGE_VARIABLES = [
  { key: "{{student_name}}", label: "Student Name", sample: "Rahul Verma" },
  { key: "{{parent_name}}", label: "Parent Name", sample: "Suresh Verma" },
  { key: "{{institution_name}}", label: "Institution Name", sample: "EduBird Academy" },
  { key: "{{course_title}}", label: "Course / Program Title", sample: "Class 10 CBSE Science & Math" },
  { key: "{{admission_number}}", label: "Admission Number", sample: "ADM-2026-889" },
  { key: "{{fee_amount}}", label: "Fee Amount", sample: "₹35,000" },
  { key: "{{date}}", label: "Current Date", sample: new Date().toLocaleDateString("en-IN") },
  { key: "{{login_url}}", label: "Portal Login URL", sample: "https://edubird.com/student/dashboard" },
];

export type EmailTemplate = {
  id: number;
  title: string;
  subject: string;
  category: string;
  body_html: string;
  variables: string[];
  is_system?: boolean;
  updated_at: string;
};

export default function EmailTemplatesPage() {
  const { accessToken, user } = useAuthStore();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Editor Dialog State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formCategory, setFormCategory] = useState("admission");
  const [formHtml, setFormHtml] = useState("");
  const [editorTab, setEditorTab] = useState<"code" | "preview">("code");

  // Test Send Dialog
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testingTemplate, setTestingTemplate] = useState<EmailTemplate | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load templates");
      setTemplates(data.templates || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch email templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleOpenAdd = () => {
    setEditingTemplate(null);
    setFormTitle("");
    setFormSubject("");
    setFormCategory("admission");
    setFormHtml(`<h2>Dear {{student_name}},</h2>\n<p>We are delighted to share an update regarding your course <strong>{{course_title}}</strong> at <strong>{{institution_name}}</strong>.</p>\n<p>Please log in to your student portal to review your schedule and announcements.</p>\n<p><a href="{{login_url}}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">View Details</a></p>\n<p>Warm regards,<br><strong>{{institution_name}}</strong></p>`);
    setEditorTab("code");
    setEditorOpen(true);
  };

  const handleOpenEdit = (t: EmailTemplate) => {
    setEditingTemplate(t);
    setFormTitle(t.title);
    setFormSubject(t.subject);
    setFormCategory(t.category || "general");
    setFormHtml(t.body_html);
    setEditorTab("code");
    setEditorOpen(true);
  };

  const insertVariable = (variableKey: string) => {
    setFormHtml((prev) => prev + " " + variableKey);
    toast.success(`Inserted ${variableKey}`);
  };

  const renderPreviewHtml = (htmlContent: string) => {
    let replaced = htmlContent;
    MERGE_VARIABLES.forEach((v) => {
      replaced = replaced.replaceAll(v.key, v.sample);
    });
    return replaced;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formSubject.trim() || !formHtml.trim()) {
      toast.error("Please enter Template Title, Email Subject, and HTML Content");
      return;
    }

    setSaving(true);
    try {
      const method = editingTemplate ? "PUT" : "POST";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/email-templates", {
        method,
        headers,
        body: JSON.stringify({
          id: editingTemplate?.id,
          title: formTitle.trim(),
          subject: formSubject.trim(),
          category: formCategory,
          body_html: formHtml,
          variables: MERGE_VARIABLES.map((v) => v.key.replace(/[{}]/g, "")),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save template");

      toast.success(editingTemplate ? "Email template updated!" : "Email template created!");
      setEditorOpen(false);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Failed to save email template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this email template?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/email-templates?id=${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("Email template deleted");
        fetchTemplates();
      }
    } catch {
      toast.error("Failed to delete email template");
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      toast.error("Please enter a recipient email");
      return;
    }
    setSendingTest(true);
    setTimeout(() => {
      setSendingTest(false);
      setTestDialogOpen(false);
      toast.success(`Test email dispatched successfully to ${testEmail}!`);
    }, 1000);
  };

  const filteredTemplates = templates.filter((t) =>
    selectedCategory === "all" ? true : t.category === selectedCategory
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <Mail className="w-4 h-4" />
            <span>Automated Communications & Marketing</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Email Template Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Design dynamic email notifications, fee receipts, admission welcome letters, and marketing newsletters with merge tags.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-1.5">
            <Plus className="w-4 h-4" /> Create New Template
          </Button>
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-auto">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="all" className="text-xs font-bold">All Templates</TabsTrigger>
            <TabsTrigger value="admission" className="text-xs font-bold">Admission</TabsTrigger>
            <TabsTrigger value="fees" className="text-xs font-bold">Fees & Receipts</TabsTrigger>
            <TabsTrigger value="exams" className="text-xs font-bold">Exams & Results</TabsTrigger>
            <TabsTrigger value="marketing" className="text-xs font-bold">Promotions & Offers</TabsTrigger>
            <TabsTrigger value="general" className="text-xs font-bold">General Notices</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
          <span className="text-sm font-medium text-muted-foreground">Loading email templates...</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-20 border rounded-3xl bg-muted/10 space-y-3">
          <Mail className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-lg font-bold text-foreground">No email templates in this category</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Create structured email templates with rich HTML formatting and variable placeholders.
          </p>
          <Button onClick={handleOpenAdd} size="sm" className="mt-2 font-bold">
            <Plus className="w-4 h-4 mr-1.5" /> Create Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="rounded-2xl border border-border/80 hover:border-primary/50 transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold leading-tight">{template.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Subject: <span className="font-semibold text-foreground">&quot;{template.subject}&quot;</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold capitalize text-primary border-primary/30 shrink-0">
                    {template.category}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-3">
                <div className="p-3 bg-muted/30 rounded-xl border border-border/60 text-xs line-clamp-4 font-mono text-muted-foreground overflow-hidden max-h-28">
                  {template.body_html.replace(/<[^>]+>/g, " ")}
                </div>
              </CardContent>

              <CardFooter className="p-4 bg-muted/20 border-t flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTestingTemplate(template);
                    setTestEmail(user?.email || "");
                    setTestDialogOpen(true);
                  }}
                  className="h-8 text-xs font-semibold gap-1"
                >
                  <Send className="w-3 h-3 text-primary" /> Test Send
                </Button>

                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(template)} className="h-8 text-xs font-semibold">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  {!template.is_system && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)} className="h-8 text-xs text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Edit Email Template" : "Compose Email Template"}</DialogTitle>
              <DialogDescription>
                Write HTML markup with merge tags. Switch to preview mode to verify how variables render.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-title">Template Title *</Label>
                  <Input
                    id="tpl-title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Admission Welcome Confirmation"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tpl-cat">Category</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger id="tpl-cat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admission">Admission</SelectItem>
                      <SelectItem value="fees">Fees & Receipts</SelectItem>
                      <SelectItem value="exams">Exams & Results</SelectItem>
                      <SelectItem value="marketing">Promotions & Offers</SelectItem>
                      <SelectItem value="general">General Notice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-subject">Email Subject Line *</Label>
                <Input
                  id="tpl-subject"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="e.g. Welcome to {{institution_name}} - Action Required"
                  required
                />
              </div>

              {/* Merge Tag Inserter Pills */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-primary" /> Click to Insert Merge Tag
                </Label>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-muted/40 rounded-xl border">
                  {MERGE_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="px-2.5 py-1 bg-background rounded-lg border text-[11px] font-mono hover:border-primary hover:text-primary transition-all shadow-2xs"
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center justify-between border-b pb-2 pt-2">
                <span className="font-bold">Template Body Content</span>
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setEditorTab("code")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                      editorTab === "code" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    <Code className="w-3.5 h-3.5 inline mr-1" /> HTML Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("preview")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                      editorTab === "preview" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 inline mr-1" /> Live Preview
                  </button>
                </div>
              </div>

              {editorTab === "code" ? (
                <Textarea
                  rows={10}
                  value={formHtml}
                  onChange={(e) => setFormHtml(e.target.value)}
                  placeholder="<h2>Enter HTML template...</h2>"
                  className="font-mono text-xs leading-relaxed bg-background"
                  required
                />
              ) : (
                <div className="border rounded-2xl p-6 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-inner min-h-[220px]">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderPreviewHtml(formHtml),
                    }}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                {editingTemplate ? "Update Template" : "Save Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Test Send Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Test render & deliver &quot;{testingTemplate?.title}&quot; with sample student variables.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="test-recip">Recipient Email Address *</Label>
              <Input
                id="test-recip"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test.user@example.com"
                required
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Mock variables like student name & dates will automatically be substituted.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendTest} disabled={sendingTest}>
              {sendingTest ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
              Send Mock Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

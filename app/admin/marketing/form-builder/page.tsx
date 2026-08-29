"use client";

import { useState } from "react";
import {
  FileText,
  Plus,
  Code,
  CheckCircle,
  Copy,
  Eye,
  Settings,
  Sparkles,
  Trash2,
  Edit2,
  Check,
  Send,
  Sliders,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";

export type FormField = {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "select" | "textarea" | "number" | "date";
  required: boolean;
  placeholder?: string;
  options?: string[];
};

export default function FormBuilderPage() {
  const [formTitle, setFormTitle] = useState("Admission Inquiry Lead Form");
  const [formDescription, setFormDescription] = useState(
    "Fill out this inquiry form and our admission counselor will contact you within 24 hours."
  );
  const [fields, setFields] = useState<FormField[]>([
    { id: "1", label: "Full Name", type: "text", required: true, placeholder: "Enter your full name" },
    { id: "2", label: "Email Address", type: "email", required: true, placeholder: "name@example.com" },
    { id: "3", label: "Phone Number", type: "phone", required: true, placeholder: "10-digit mobile number" },
    {
      id: "4",
      label: "Course Interested In",
      type: "select",
      required: true,
      placeholder: "Select your desired program",
      options: ["Class 10 CBSE Foundation", "Class 12 Board Exam Prep", "NEET / Medical Prep", "JEE Mains / Advanced", "Diploma & Certifications"],
    },
    { id: "5", label: "Message / Query", type: "textarea", required: false, placeholder: "Any specific queries, previous marks, or batch timings..." },
  ]);

  // Add / Edit Field Dialog State
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<FormField["type"]>("text");
  const [fieldRequired, setFieldRequired] = useState(true);
  const [fieldPlaceholder, setFieldPlaceholder] = useState("");
  const [fieldOptionsText, setFieldOptionsText] = useState("");

  // Live Test Form State (Interactive)
  const [testFormValues, setTestFormValues] = useState<Record<string, string>>({});
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);

  const handleOpenAddField = () => {
    setEditingField(null);
    setFieldLabel("");
    setFieldType("text");
    setFieldRequired(true);
    setFieldPlaceholder("");
    setFieldOptionsText("");
    setFieldDialogOpen(true);
  };

  const handleOpenEditField = (field: FormField) => {
    setEditingField(field);
    setFieldLabel(field.label);
    setFieldType(field.type);
    setFieldRequired(field.required);
    setFieldPlaceholder(field.placeholder || "");
    setFieldOptionsText((field.options || []).join("\n"));
    setFieldDialogOpen(true);
  };

  const handleSaveField = () => {
    if (!fieldLabel.trim()) {
      toast.error("Please enter a field label.");
      return;
    }

    const options =
      fieldType === "select"
        ? fieldOptionsText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    if (editingField) {
      setFields((prev) =>
        prev.map((f) =>
          f.id === editingField.id
            ? {
                ...f,
                label: fieldLabel.trim(),
                type: fieldType,
                required: fieldRequired,
                placeholder: fieldPlaceholder.trim(),
                options: options && options.length > 0 ? options : f.options,
              }
            : f
        )
      );
      toast.success(`Field "${fieldLabel}" updated!`);
    } else {
      const newField: FormField = {
        id: String(Date.now()),
        label: fieldLabel.trim(),
        type: fieldType,
        required: fieldRequired,
        placeholder: fieldPlaceholder.trim() || `Enter ${fieldLabel.toLowerCase()}`,
        options: options && options.length > 0 ? options : ["Option 1", "Option 2", "Option 3"],
      };
      setFields((prev) => [...prev, newField]);
      toast.success(`Added new field "${fieldLabel}"!`);
    }

    setFieldDialogOpen(false);
  };

  const handleDeleteField = (id: string) => {
    if (fields.length <= 1) {
      toast.error("Form must have at least one field.");
      return;
    }
    setFields((prev) => prev.filter((f) => f.id !== id));
    toast.success("Field removed.");
  };

  const handleTestFieldChange = (fieldId: string, value: string) => {
    setTestFormValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate required fields
    for (const f of fields) {
      if (f.required && !testFormValues[f.id]?.trim()) {
        toast.error(`Please fill in required field: ${f.label}`);
        return;
      }
    }

    setIsSubmittingTest(true);
    setTimeout(() => {
      setIsSubmittingTest(false);
      setTestFormValues({});
      toast.success("Inquiry submitted successfully! (Test Mode simulated capture)");
    }, 600);
  };

  const copyEmbedCode = () => {
    const slug = formTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const code = `<iframe src="https://maashardainstitute.com/embed/forms/${slug}" width="100%" height="600" frameborder="0" style="border:none;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);"></iframe>`;
    navigator.clipboard.writeText(code);
    toast.success("HTML embed code copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

        <Button onClick={copyEmbedCode} variant="outline" className="gap-2 shadow-xs cursor-pointer">
          <Code className="h-4 w-4 text-primary" />
          <span>Copy Embed Code</span>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Form Configuration */}
        <div className="lg:col-span-5 rounded-xl border border-border bg-card p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              Form Configuration
            </h3>
            <Badge variant="outline" className="text-xs">
              {fields.length} Fields
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Form Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="bg-background text-sm font-medium"
                placeholder="e.g. Admission Inquiry Form"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Subheading / Description</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="bg-background text-xs"
                placeholder="Short message displayed at top of form..."
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Form Fields ({fields.length})
              </span>
              <Button
                size="sm"
                onClick={handleOpenAddField}
                className="text-xs gap-1.5 font-bold cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Field
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((f, idx) => (
                <div
                  key={f.id}
                  className="p-3 rounded-lg border border-border bg-background/80 hover:bg-muted/30 transition-colors flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">{f.label}</span>
                      <Badge
                        variant={f.required ? "default" : "secondary"}
                        className="text-[9px] px-1.5 py-0"
                      >
                        {f.required ? "Required" : "Optional"}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground text-[11px]">Type: {f.type}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditField(f)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit field"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteField(f.id)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete field"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Interactive Form Preview */}
        <div className="lg:col-span-7 rounded-xl border border-border bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-primary" /> Live Form Preview & Test
            </span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-semibold">
              Interactive Test Mode
            </Badge>
          </div>

          <form onSubmit={handleTestSubmit} className="space-y-4 p-5 rounded-xl border border-border/80 bg-background shadow-xs">
            <div className="space-y-1">
              <h4 className="font-bold text-lg text-foreground">{formTitle}</h4>
              {formDescription && (
                <p className="text-xs text-muted-foreground">{formDescription}</p>
              )}
            </div>

            <div className="space-y-3 pt-2">
              {fields.map((f) => (
                <div key={f.id} className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    {f.label} {f.required && <span className="text-destructive">*</span>}
                  </Label>

                  {f.type === "textarea" ? (
                    <Textarea
                      placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
                      value={testFormValues[f.id] || ""}
                      onChange={(e) => handleTestFieldChange(f.id, e.target.value)}
                      rows={3}
                      className="text-xs bg-card"
                    />
                  ) : f.type === "select" ? (
                    <Select
                      value={testFormValues[f.id] || ""}
                      onValueChange={(val) => handleTestFieldChange(f.id, val)}
                    >
                      <SelectTrigger className="text-xs bg-card">
                        <SelectValue placeholder={f.placeholder || "Select option..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {(f.options || ["General Inquiry"]).map((opt) => (
                          <SelectItem key={opt} value={opt} className="text-xs">
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={f.type === "phone" ? "tel" : f.type === "email" ? "email" : f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`}
                      value={testFormValues[f.id] || ""}
                      onChange={(e) => handleTestFieldChange(f.id, e.target.value)}
                      className="text-xs bg-card"
                    />
                  )}
                </div>
              ))}
            </div>

            <Button
              type="submit"
              disabled={isSubmittingTest}
              className="w-full text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 mt-2 cursor-pointer h-10 shadow-sm"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {isSubmittingTest ? "Submitting Inquiry..." : "Submit Inquiry"}
            </Button>
          </form>
        </div>
      </div>

      {/* Add / Edit Field Modal Dialog */}
      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Edit Form Field" : "Add New Form Field"}
            </DialogTitle>
            <DialogDescription>
              Configure the input label, data format, and requirement settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="f-label">Field Label *</Label>
              <Input
                id="f-label"
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
                placeholder="e.g. Preferred Batch Timing, Guardian Phone..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Field Type</Label>
                <Select
                  value={fieldType}
                  onValueChange={(val) => setFieldType(val as FormField["type"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Single Line Text</SelectItem>
                    <SelectItem value="email">Email Address</SelectItem>
                    <SelectItem value="phone">Phone / Mobile</SelectItem>
                    <SelectItem value="select">Dropdown / Select</SelectItem>
                    <SelectItem value="textarea">Multi-line Textarea</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date Picker</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Required Field?</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    checked={fieldRequired}
                    onCheckedChange={setFieldRequired}
                  />
                  <span className="text-xs text-muted-foreground">
                    {fieldRequired ? "Mandatory" : "Optional"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-placeholder">Placeholder Hint</Label>
              <Input
                id="f-placeholder"
                value={fieldPlaceholder}
                onChange={(e) => setFieldPlaceholder(e.target.value)}
                placeholder="e.g. Enter your preference..."
              />
            </div>

            {fieldType === "select" && (
              <div className="space-y-1.5">
                <Label htmlFor="f-options">Dropdown Options (One per line)</Label>
                <Textarea
                  id="f-options"
                  value={fieldOptionsText}
                  onChange={(e) => setFieldOptionsText(e.target.value)}
                  rows={4}
                  placeholder="Morning (8:00 AM)&#10;Afternoon (2:00 PM)&#10;Weekend Batch"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setFieldDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveField} className="font-bold">
              {editingField ? "Save Changes" : "Add Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

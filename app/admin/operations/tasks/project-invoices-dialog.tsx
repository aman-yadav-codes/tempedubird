"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Building2,
  Trash2,
  Download,
  ExternalLink,
  Loader2,
  ChevronDown,
  DollarSign,
  Send,
  Eye,
  ArrowLeft,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { OperationTask, getCurrencySymbol } from "./page";

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  is_extra_task?: boolean;
};

export type ProjectInvoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  client_name: string;
  client_company?: string;
  client_email?: string;
  currency: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: "paid" | "unpaid" | "partially_paid" | "overdue";
  notes?: string;
  created_at: string;
  created_by_name?: string;
};

type Props = {
  task: OperationTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceUpdated?: () => void;
  onSaved?: () => void;
};

export function ProjectInvoicesDialog({
  task,
  open,
  onOpenChange,
  onInvoiceUpdated,
  onSaved,
}: Props) {
  const { accessToken } = useAuthStore();
  const [invoices, setInvoices] = useState<ProjectInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "create" | "preview">("list");
  const [previewInvoice, setPreviewInvoice] = useState<ProjectInvoice | null>(null);

  // Form State for creating new invoice
  const [invNumber, setInvNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [savingInvoice, setSavingInvoice] = useState(false);

  const sym = getCurrencySymbol(task?.currency || currency);

  // Fetch invoices for this task when modal opens
  const fetchInvoices = async () => {
    if (!task?.id) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/operations/tasks/invoices?task_id=${task.id}`, {
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load invoices");
      setInvoices(data.data?.invoices || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && task?.id) {
      setViewMode("list");
      setPreviewInvoice(null);
      fetchInvoices();
    }
  }, [open, task?.id]);

  // Initialize Create Invoice Form with project scope and extra tasks
  const handleOpenCreateInvoice = () => {
    if (!task) return;

    const count = invoices.length + 1;
    const today = new Date().toISOString().substring(0, 10);
    const due = new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10);

    setInvNumber(`INV-PRJ${task.id}-${String(count).padStart(3, "0")}`);
    setIssueDate(today);
    setDueDate(task.deadline ? task.deadline.substring(0, 10) : due);
    setClientName(task.client_name || "EduBird Platform");
    setClientCompany(task.project_for === "own_company" ? "EduBird Internal" : task.client_name || "");
    setCurrency(task.currency || "INR");
    setNotes("Thank you for your business! Payment is due within 15 days of invoice date.");
    setTaxRate(task.currency === "INR" ? 18 : 0);

    // Build line items from base project scope + any breakdown subtasks
    const initialItems: InvoiceItem[] = [];

    // Base Project item
    const baseCost = parseFloat(String(task.base_price || task.cost || task.price || 0));
    if (baseCost > 0) {
      initialItems.push({
        id: `item_base_${Date.now()}`,
        description: `Base Project Deliverable: ${task.title}`,
        quantity: 1,
        unit_price: baseCost,
        amount: baseCost,
        is_extra_task: false,
      });
    }

    // Sub-tasks or Extra tasks
    if (Array.isArray(task.sub_tasks) && task.sub_tasks.length > 0) {
      task.sub_tasks.forEach((st: any, idx: number) => {
        const itemPrice = parseFloat(String(st.price || 0));
        if (itemPrice > 0) {
          const isExtra = Boolean(st.is_extra_task || st.scope_type === "client_extra");
          initialItems.push({
            id: `item_sub_${st.id || idx}`,
            description: `${isExtra ? "[Extra Task Addition] " : ""}${st.title}`,
            quantity: 1,
            unit_price: itemPrice,
            amount: itemPrice,
            is_extra_task: isExtra,
          });
        }
      });
    }

    if (initialItems.length === 0) {
      initialItems.push({
        id: `item_${Date.now()}`,
        description: task.title,
        quantity: 1,
        unit_price: baseCost || 1000,
        amount: baseCost || 1000,
        is_extra_task: false,
      });
    }

    setItems(initialItems);
    setViewMode("create");
  };

  // Line Items Calculation
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);
  }, [items]);

  const taxAmount = useMemo(() => {
    return (subtotal * (parseFloat(String(taxRate)) || 0)) / 100;
  }, [subtotal, taxRate]);

  const grandTotal = useMemo(() => {
    return subtotal + taxAmount;
  }, [subtotal, taxAmount]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        description: "New Additional Task / Deliverable",
        quantity: 1,
        unit_price: 0,
        amount: 0,
        is_extra_task: true,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, val: any) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, [field]: val };
        if (field === "quantity" || field === "unit_price") {
          const q = field === "quantity" ? parseFloat(val) || 0 : i.quantity;
          const u = field === "unit_price" ? parseFloat(val) || 0 : i.unit_price;
          updated.amount = q * u;
        }
        return updated;
      })
    );
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task?.id) return;
    if (items.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    setSavingInvoice(true);
    try {
      const invoicePayload = {
        invoice_number: invNumber.trim(),
        issue_date: issueDate,
        due_date: dueDate,
        client_name: clientName.trim(),
        client_company: clientCompany.trim(),
        currency,
        items,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: grandTotal,
        status: "unpaid",
        notes: notes.trim(),
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/operations/tasks/invoices", {
        method: "POST",
        headers,
        body: JSON.stringify({
          task_id: task.id,
          invoice: invoicePayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create invoice");

      toast.success("Invoice generated successfully!");
      setInvoices(data.invoices || []);
      setViewMode("list");
      onInvoiceUpdated?.();
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to create invoice");
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    if (!task?.id) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/operations/tasks/invoices", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          task_id: task.id,
          invoice_id: invoiceId,
          updates: { status: newStatus },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update invoice");

      toast.success(`Invoice marked as ${newStatus}`);
      setInvoices(data.invoices || []);
      onInvoiceUpdated?.();
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to update invoice status");
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!task?.id || !confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(
        `/api/admin/operations/tasks/invoices?task_id=${task.id}&invoice_id=${invoiceId}`,
        { method: "DELETE", headers }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete invoice");

      toast.success("Invoice deleted");
      setInvoices(data.invoices || []);
      onInvoiceUpdated?.();
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete invoice");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0 bg-background/95 backdrop-blur-xs flex flex-row items-center justify-between">
          <div className="space-y-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <span>Project Invoices</span>
              <Badge variant="outline" className="text-xs font-mono ml-1 font-bold">
                {task?.title}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Generate client invoices, track billing milestones, and view printable invoices.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            {viewMode !== "list" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("list")}
                className="gap-1.5 text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
              </Button>
            )}
            {viewMode === "list" && (
              <Button
                size="sm"
                onClick={handleOpenCreateInvoice}
                className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> + Create Invoice
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* VIEW MODE 1: LIST INVOICES */}
          {viewMode === "list" && (
            <div className="space-y-4">
              {/* Financial Quick Header */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl border bg-muted/20">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Invoiced</span>
                  <div className="text-base font-bold font-mono text-foreground mt-0.5">
                    {sym}
                    {invoices
                      .reduce((sum, inv) => sum + (parseFloat(String(inv.total_amount)) || 0), 0)
                      .toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="border-l pl-4">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Paid Amount</span>
                  <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {sym}
                    {invoices
                      .filter((inv) => inv.status === "paid")
                      .reduce((sum, inv) => sum + (parseFloat(String(inv.total_amount)) || 0), 0)
                      .toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="border-l pl-4">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Outstanding / Pending</span>
                  <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                    {sym}
                    {invoices
                      .filter((inv) => inv.status !== "paid")
                      .reduce((sum, inv) => sum + (parseFloat(String(inv.total_amount)) || 0), 0)
                      .toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading project invoices...</span>
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-16 text-center space-y-3 rounded-2xl border border-dashed bg-muted/10 p-6">
                  <Receipt className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">No Invoices Created Yet</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      Generate an invoice for base project deliverables or extra client scope additions.
                    </p>
                  </div>
                  <Button onClick={handleOpenCreateInvoice} size="sm" className="font-bold gap-1.5">
                    <Plus className="w-4 h-4" /> Create First Invoice
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((inv) => {
                    const isPaid = inv.status === "paid";
                    return (
                      <div
                        key={inv.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card/60 hover:bg-card shadow-xs gap-3 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground font-mono">
                              {inv.invoice_number}
                            </span>
                            <Badge
                              variant={isPaid ? "default" : "outline"}
                              className={`text-[10px] font-bold uppercase tracking-wider capitalize ${
                                isPaid
                                  ? "bg-emerald-600 text-white"
                                  : inv.status === "overdue"
                                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400"
                                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400"
                              }`}
                            >
                              {inv.status}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>Client: <strong className="text-foreground">{inv.client_name}</strong></span>
                            <span>•</span>
                            <span>Issue: {inv.issue_date}</span>
                            <span>•</span>
                            <span>Due: {inv.due_date}</span>
                            <span>•</span>
                            <span>{inv.items?.length || 0} deliverable items</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-base font-bold font-mono text-foreground">
                              {getCurrencySymbol(inv.currency)}
                              {parseFloat(String(inv.total_amount)).toLocaleString("en-IN")}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              Tax: {inv.tax_rate}% ({getCurrencySymbol(inv.currency)}{inv.tax_amount})
                            </span>
                          </div>

                          <div className="flex items-center gap-1 border-l pl-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPreviewInvoice(inv);
                                setViewMode("preview");
                              }}
                              className="h-8 text-xs font-semibold gap-1"
                              title="View & Print Invoice"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </Button>

                            <Button
                              size="sm"
                              variant={isPaid ? "secondary" : "default"}
                              onClick={() => handleUpdateInvoiceStatus(inv.id, isPaid ? "unpaid" : "paid")}
                              className={`h-8 text-xs font-semibold ${
                                isPaid ? "text-muted-foreground" : "bg-emerald-600 text-white hover:bg-emerald-700"
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              {isPaid ? "Mark Unpaid" : "Mark Paid"}
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteInvoice(inv.id)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              title="Delete invoice"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: CREATE INVOICE FORM */}
          {viewMode === "create" && (
            <form onSubmit={handleSaveInvoice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Invoice Number *</Label>
                  <Input
                    required
                    value={invNumber}
                    onChange={(e) => setInvNumber(e.target.value)}
                    className="text-xs font-mono h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Issue Date *</Label>
                  <Input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Due Date *</Label>
                  <Input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bill To: Client Name *</Label>
                  <Input
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Client or Company Name"
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Client Company / Entity</Label>
                  <Input
                    value={clientCompany}
                    onChange={(e) => setClientCompany(e.target.value)}
                    placeholder="e.g. EduBird Technologies / Acme Corp"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Invoice Deliverables & Line Items ({items.length})
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddItem}
                    className="h-7 text-xs font-semibold gap-1 text-primary hover:bg-primary/10"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </Button>
                </div>

                <div className="space-y-2 border rounded-xl p-3 bg-muted/10">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-background border text-xs"
                    >
                      <div className="col-span-6 space-y-1">
                        <Input
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                          placeholder="Deliverable description..."
                          className="text-xs h-8"
                        />
                        {item.is_extra_task && (
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400 py-0">
                            + Client Scope Addition
                          </Badge>
                        )}
                      </div>

                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, "quantity", e.target.value)}
                          placeholder="Qty"
                          className="text-xs h-8 font-mono text-center"
                        />
                      </div>

                      <div className="col-span-3">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">
                            {sym}
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unit_price}
                            onChange={(e) => handleUpdateItem(item.id, "unit_price", e.target.value)}
                            placeholder="Rate"
                            className="text-xs h-8 font-mono pl-6"
                          />
                        </div>
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals & Tax Calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Payment Terms & Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter wire transfer details, UPI ID, terms..."
                    className="text-xs min-h-[75px]"
                  />
                </div>

                <div className="space-y-2 p-3.5 rounded-xl border bg-muted/20 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {sym}{subtotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Tax / GST (%):
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-14 h-6 text-xs text-center font-mono py-0 px-1 inline-block"
                      />
                    </span>
                    <span className="font-mono font-semibold text-foreground">
                      {sym}{taxAmount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm font-bold border-t pt-2 text-foreground">
                    <span>Grand Total:</span>
                    <span className="font-mono text-base text-primary">
                      {sym}{grandTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setViewMode("list")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingInvoice} className="bg-primary font-bold">
                  {savingInvoice && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Generate & Save Invoice
                </Button>
              </div>
            </form>
          )}

          {/* VIEW MODE 3: PRINTABLE INVOICE PREVIEW */}
          {viewMode === "preview" && previewInvoice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono font-bold">
                    {previewInvoice.invoice_number}
                  </Badge>
                  <Badge className="bg-emerald-600 text-white font-bold uppercase text-[10px]">
                    {previewInvoice.status}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5 font-bold"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Invoice
                </Button>
              </div>

              {/* Printable Invoice Container */}
              <div id="printable-invoice" className="p-6 rounded-2xl border bg-white dark:bg-card text-foreground space-y-6 shadow-sm">
                {/* Brand & Header */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <h2 className="text-xl font-black text-primary tracking-tight">EduBird Platform</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Software Engineering & Operations Division</p>
                    <p className="text-xs text-muted-foreground">Email: billing@edubird.com | Web: edubird.com</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-lg font-black tracking-widest uppercase text-foreground">INVOICE</h3>
                    <p className="text-xs font-mono font-bold text-primary mt-1">{previewInvoice.invoice_number}</p>
                    <p className="text-[11px] text-muted-foreground">Date: {previewInvoice.issue_date}</p>
                    <p className="text-[11px] text-muted-foreground">Due Date: {previewInvoice.due_date}</p>
                  </div>
                </div>

                {/* Billed To */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">BILLED TO:</span>
                    <p className="font-bold text-sm text-foreground mt-1">{previewInvoice.client_name}</p>
                    {previewInvoice.client_company && (
                      <p className="text-muted-foreground">{previewInvoice.client_company}</p>
                    )}
                    <p className="text-muted-foreground">Project: {task?.title}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">STATUS:</span>
                    <p className="font-bold text-sm uppercase text-primary mt-1">{previewInvoice.status}</p>
                    <p className="text-muted-foreground">Currency: {previewInvoice.currency}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 font-bold border-b text-foreground">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {previewInvoice.items?.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-foreground">{item.description}</span>
                            {item.is_extra_task && (
                              <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                Scope Addition
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {getCurrencySymbol(previewInvoice.currency)}{parseFloat(String(item.unit_price)).toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            {getCurrencySymbol(previewInvoice.currency)}{parseFloat(String(item.amount)).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal & Total */}
                <div className="flex justify-end text-xs">
                  <div className="w-64 space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold text-foreground">
                        {getCurrencySymbol(previewInvoice.currency)}{parseFloat(String(previewInvoice.subtotal)).toLocaleString("en-IN")}
                      </span>
                    </div>
                    {previewInvoice.tax_rate > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tax ({previewInvoice.tax_rate}%):</span>
                        <span className="font-mono font-bold text-foreground">
                          {getCurrencySymbol(previewInvoice.currency)}{parseFloat(String(previewInvoice.tax_amount)).toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold border-t pt-2 text-foreground">
                      <span>Total Due:</span>
                      <span className="font-mono text-base text-primary">
                        {getCurrencySymbol(previewInvoice.currency)}{parseFloat(String(previewInvoice.total_amount)).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                {previewInvoice.notes && (
                  <div className="p-3 rounded-lg border bg-muted/20 text-xs text-muted-foreground">
                    <strong className="text-foreground">Payment Instructions & Terms:</strong> {previewInvoice.notes}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


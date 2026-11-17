"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  Loader2,
  Check,
  CheckCircle2,
  Receipt,
  Scan,
  Store,
  DollarSign,
  Boxes,
  ArrowRight,
  ExternalLink,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { COMMON_UOM_OPTIONS } from "./product-form-dialog";

export interface BillExtractedItem {
  id: string;
  product_name: string;
  matched_product_id: number | null;
  matched_product_title: string | null;
  current_stock: number;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

interface UpdateStockBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  catalogProducts?: Array<{
    id: number;
    title: string;
    unit?: string | null;
    stock_quantity: number;
    price: number;
  }>;
}

export function UpdateStockBillDialog({
  open,
  onOpenChange,
  onSuccess,
  catalogProducts = [],
}: UpdateStockBillDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Extracted Bill Data State
  const [billImageUrl, setBillImageUrl] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<BillExtractedItem[]>([]);
  const [availableProducts, setAvailableProducts] = useState(catalogProducts);

  // Expense Recording State
  const [recordExpense, setRecordExpense] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [paymentStatus, setPaymentStatus] = useState("paid");

  // Reset when dialog opens/closes
  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setStep("upload");
      setBillImageUrl("");
      setItems([]);
      setScanning(false);
      setSubmitting(false);
    }
    onOpenChange(isOpen);
  };

  // Upload & Scan Bill
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Please upload an image (JPG, PNG, WEBP) or PDF receipt.");
      return;
    }

    setScanning(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/marketing/products/scan-bill", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to scan bill");
      }

      setBillImageUrl(data.bill_image_url || "");
      setVendorName(data.vendor_name || "Wholesale Mart");
      setBillNumber(data.bill_number || `BILL-${Date.now().toString().slice(-6)}`);
      setBillDate(data.bill_date || new Date().toISOString().split("T")[0]);
      setItems(data.items || []);
      if (data.catalog_products) {
        setAvailableProducts(data.catalog_products);
      }

      setStep("preview");
      toast.success("Bill scanned successfully! Review extracted items below.");
    } catch (err: any) {
      toast.error(err.message || "Failed to process bill image");
    } finally {
      setScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Item Updates
  const handleItemChange = (index: number, field: keyof BillExtractedItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === "quantity" || field === "unit_price") {
        const q = Number(item.quantity) || 0;
        const p = Number(item.unit_price) || 0;
        item.total_price = q * p;
      }

      // If user matched an existing product from dropdown
      if (field === "matched_product_id") {
        if (value === "new") {
          item.matched_product_id = null;
          item.matched_product_title = null;
          item.current_stock = 0;
        } else {
          const prod = availableProducts.find((p) => p.id === Number(value));
          if (prod) {
            item.matched_product_id = prod.id;
            item.matched_product_title = prod.title;
            item.current_stock = Number(prod.stock_quantity) || 0;
            if (prod.unit) item.unit = prod.unit;
          }
        }
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        product_name: "New Item",
        matched_product_id: null,
        matched_product_title: null,
        current_stock: 0,
        quantity: 10,
        unit: "kg",
        unit_price: 50,
        total_price: 500,
      },
    ]);
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) {
      toast.error("Bill must contain at least one product item.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalBillAmount = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);

  // Submit and Update Stock + Expense
  const handleConfirmAndSave = async () => {
    if (items.length === 0) {
      toast.error("No items found to update stock.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        bill_image_url: billImageUrl,
        vendor_name: vendorName.trim() || "Wholesale Mart",
        bill_number: billNumber.trim(),
        bill_date: billDate,
        total_amount: totalBillAmount,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        record_expense: recordExpense,
        items: items.map((it) => ({
          product_id: it.matched_product_id,
          product_name: it.product_name,
          quantity: Number(it.quantity) || 0,
          unit: it.unit || "Piece",
          unit_price: Number(it.unit_price) || 0,
          total_price: Number(it.total_price) || 0,
        })),
      };

      const res = await fetch("/api/admin/marketing/products/confirm-stock-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update stock");
      }

      toast.success(data.message || "Stock updated and recorded in expenses!");
      if (onSuccess) onSuccess();
      handleDialogChange(false);
    } catch (err: any) {
      toast.error(err.message || "Error saving stock and expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Scan className="size-4 text-primary" />
            Update Stock from Purchase Bill / Invoice
          </DialogTitle>
          <DialogDescription className="text-xs">
            Upload a vendor purchase invoice to automatically extract items, update stock quantities, and log expenses.
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: UPLOAD BILL */}
        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-2xl p-8 text-center hover:bg-muted/30 transition-colors cursor-pointer border-border hover:border-primary/50 group flex flex-col items-center justify-center gap-3"
            >
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                {scanning ? <Loader2 className="size-7 animate-spin" /> : <Upload className="size-7" />}
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  {scanning ? "Scanning and Extracting Bill Data..." : "Click or Drag Bill Picture Here"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Upload a photo of your wholesale receipt, purchase bill, or invoice (JPG, PNG, WEBP, PDF up to 10MB).
                </p>
              </div>

              {scanning && (
                <div className="w-full max-w-xs space-y-1.5 pt-2">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-pulse w-3/4 rounded-full" />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Detecting products, quantities, units, and prices...
                  </span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileSelect}
                disabled={scanning}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Supports vendor invoices, grocery bills, handwritten receipts, GST bills.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
                className="gap-1.5 text-xs font-semibold"
              >
                <Camera className="size-3.5" /> Select Photo
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & VERIFY EXTRACTED BILL DATA */}
        {step === "preview" && (
          <div className="space-y-5 pt-1">
            {/* Bill Header Info & Picture Preview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border">
              {/* Bill Picture Thumbnail */}
              <div className="md:col-span-1 flex flex-col items-center justify-center border rounded-lg bg-background p-1 overflow-hidden relative group">
                {billImageUrl ? (
                  <a href={billImageUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-24 relative overflow-hidden rounded">
                    <img
                      src={billImageUrl}
                      alt="Bill Picture"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity gap-1">
                      <ExternalLink className="size-3" /> View Bill
                    </div>
                  </a>
                ) : (
                  <div className="h-24 flex items-center justify-center text-muted-foreground text-xs">
                    <FileText className="size-8 opacity-40" />
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground mt-1 font-medium">Bill Attachment</span>
              </div>

              {/* Vendor & Invoice Metadata */}
              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Supplier / Vendor Name</Label>
                  <Input
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="e.g. Metro Cash & Carry"
                    className="h-8 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Invoice / Bill #</Label>
                  <Input
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    placeholder="e.g. INV-2026-904"
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Bill Date</Label>
                  <Input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="h-8 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Extracted Products & Stock Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Boxes className="size-3.5 text-primary" /> Extracted Items &amp; Inventory Stock
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Verify quantity, measurement units, and match with your store products.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-7 text-xs font-bold gap-1 px-2.5"
                >
                  <Plus className="size-3" /> Add Item
                </Button>
              </div>

              <div className="border rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b font-bold text-muted-foreground">
                        <th className="p-2.5 pl-3">Extracted Item Name</th>
                        <th className="p-2.5">Matched Store Product</th>
                        <th className="p-2.5 w-24">Quantity</th>
                        <th className="p-2.5 w-24">Unit</th>
                        <th className="p-2.5 w-24 text-right">Cost (₹)</th>
                        <th className="p-2.5 w-28 text-right">Total (₹)</th>
                        <th className="p-2.5 text-center">Stock Update</th>
                        <th className="p-2.5 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {items.map((item, idx) => {
                        const newStock = (item.current_stock || 0) + (Number(item.quantity) || 0);

                        return (
                          <tr key={item.id || idx} className="hover:bg-muted/20 transition-colors">
                            {/* Extracted Product Name */}
                            <td className="p-2.5 pl-3">
                              <Input
                                value={item.product_name}
                                onChange={(e) => handleItemChange(idx, "product_name", e.target.value)}
                                className="h-7 text-xs font-bold min-w-[130px]"
                                placeholder="Item name"
                              />
                            </td>

                            {/* Match with Store Product */}
                            <td className="p-2.5">
                              <Select
                                value={item.matched_product_id ? String(item.matched_product_id) : "new"}
                                onValueChange={(val) => handleItemChange(idx, "matched_product_id", val)}
                              >
                                <SelectTrigger className="h-7 text-xs min-w-[160px]">
                                  <SelectValue placeholder="Match Product" />
                                </SelectTrigger>
                                <SelectContent className="max-h-56 text-xs">
                                  <SelectItem value="new">
                                    <span className="text-emerald-600 font-bold">+ Create as New Product</span>
                                  </SelectItem>
                                  {availableProducts.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                      {p.title} (Current: {p.stock_quantity} {p.unit || "unit"})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>

                            {/* Quantity (Number) */}
                            <td className="p-2.5">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                                className="h-7 text-xs font-mono font-bold text-center"
                              />
                            </td>

                            {/* Unit (Units of measurement) */}
                            <td className="p-2.5">
                              <Select
                                value={item.unit}
                                onValueChange={(val) => handleItemChange(idx, "unit", val)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-48 text-xs">
                                  {COMMON_UOM_OPTIONS.map((u) => (
                                    <SelectItem key={u} value={u}>
                                      {u}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>

                            {/* Unit Cost */}
                            <td className="p-2.5 text-right">
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(idx, "unit_price", e.target.value)}
                                className="h-7 text-xs font-mono text-right"
                              />
                            </td>

                            {/* Line Total */}
                            <td className="p-2.5 text-right font-mono font-bold text-foreground">
                              ₹{(Number(item.total_price) || 0).toLocaleString("en-IN")}
                            </td>

                            {/* Stock Update Preview */}
                            <td className="p-2.5 text-center">
                              {item.matched_product_id ? (
                                <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30">
                                  {item.current_stock} ➔ <strong>{newStock}</strong> {item.unit}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] font-semibold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30">
                                  New (+{item.quantity} {item.unit})
                                </Badge>
                              )}
                            </td>

                            {/* Delete Item */}
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(idx)}
                                className="text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Expense Recording Section */}
            <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                  <input
                    type="checkbox"
                    checked={recordExpense}
                    onChange={(e) => setRecordExpense(e.target.checked)}
                    className="rounded border-border size-4 accent-primary"
                  />
                  <span>Record total purchase bill in Finance Expenses</span>
                </label>
                <span className="text-sm font-black text-primary font-mono">
                  Total Bill: ₹{totalBillAmount.toLocaleString("en-IN")}
                </span>
              </div>

              {recordExpense && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="upi">UPI / Online</SelectItem>
                        <SelectItem value="cash">Cash in Hand</SelectItem>
                        <SelectItem value="net_banking">Bank Transfer / Net Banking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Payment Status</Label>
                    <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="paid">Paid (Cleared)</SelectItem>
                        <SelectItem value="due">Due / Unpaid Bill</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep("upload")}
                disabled={submitting}
              >
                Scan Another Bill
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDialogChange(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmAndSave}
                  disabled={submitting || items.length === 0}
                  className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5" />
                  )}
                  Confirm &amp; Update Stock
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

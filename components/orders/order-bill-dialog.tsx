"use client";

import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Download,
  Receipt,
  Building2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Calendar,
  Clock,
  Package,
} from "lucide-react";

interface OrderItem {
  id?: number;
  product_name: string;
  product_code?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderBillProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any | null;
}

export function OrderBillDialog({ open, onOpenChange, order }: OrderBillProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const formatCurrency = (amt: number | string | undefined | null) => {
    const num = Number(amt) || 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handlePrint = () => {
    window.print();
  };

  const items: OrderItem[] = order.items && order.items.length > 0
    ? order.items
    : [
        {
          product_name: order.items_summary || "Order Product / Service",
          quantity: 1,
          unit_price: Number(order.total_amount) || 0,
          total_price: Number(order.total_amount) || 0,
        },
      ];

  const subtotal = Number(order.subtotal_amount) || Number(order.total_amount) || 0;
  const tax = Number(order.tax_amount) || 0;
  const discount = Number(order.discount_amount) || 0;
  const grandTotal = Number(order.total_amount) || subtotal;
  const isPaid = (order.payment_status || "").toLowerCase() === "paid";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border">
        {/* ACTION BAR AT TOP (Hidden when printing) */}
        <div className="print:hidden p-4 border-b bg-muted/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Receipt className="size-4 text-[#d9232e]" />
            <span>Official Invoice / Bill: {order.order_number}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs font-bold bg-[#d9232e] hover:bg-[#d9232e]/90 text-white gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="size-3.5" /> Print Bill / PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs font-medium"
            >
              Close
            </Button>
          </div>
        </div>

        {/* PRINTABLE BILL CANVAS */}
        <div
          ref={printRef}
          id="printable-order-bill"
          className="p-6 sm:p-8 bg-white text-slate-900 space-y-6 text-xs font-sans selection:bg-rose-100"
        >
          {/* INVOICE HEADER */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-sm">
                  143
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight leading-none">
                    143PANDA MARKETPLACE
                  </h2>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Verified Digital Commerce &amp; Services Platform
                  </span>
                </div>
              </div>
              <div className="pt-2 text-[11px] text-slate-600 leading-snug">
                <div>Tax Invoice &amp; Customer Bill of Supply</div>
                <div className="font-mono text-[10px] text-slate-500">GSTIN / Ref: PND-IND-2026-ONLINE</div>
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <Badge className="bg-red-600 hover:bg-red-700 text-white font-extrabold uppercase text-[10px] tracking-wider px-2 py-0.5 border-0">
                TAX INVOICE
              </Badge>
              <div className="pt-1 text-xs">
                <span className="text-slate-500">Invoice No: </span>
                <span className="font-mono font-bold text-slate-900">INV-{order.order_number}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-500">Order ID: </span>
                <span className="font-mono font-semibold text-slate-800">{order.order_number}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Date: <strong className="text-slate-700 font-semibold">{new Date(order.created_at).toLocaleString("en-IN")}</strong>
              </div>
            </div>
          </div>

          {/* BILLED BY & BILLED TO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
            {/* Seller */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Billed By (Seller / Provider)
              </span>
              <h4 className="text-xs font-bold text-slate-900">
                {order.institution_name || order.seller_info?.name || "143Panda Verified Merchant Storefront"}
              </h4>
              {order.seller_info?.address && (
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {order.seller_info.address}
                  {order.seller_info.city ? `, ${order.seller_info.city}` : ""}
                  {order.seller_info.state ? `, ${order.seller_info.state}` : ""}
                </p>
              )}
              {order.seller_info?.phone && (
                <p className="text-[11px] text-slate-600">Phone: {order.seller_info.phone}</p>
              )}
              {order.seller_info?.gstin && (
                <p className="text-[10px] font-mono text-slate-500">GSTIN: {order.seller_info.gstin}</p>
              )}
            </div>

            {/* Buyer */}
            <div className="space-y-1.5 sm:border-l sm:pl-6 border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Billed To (Customer / Buyer)
              </span>
              <h4 className="text-xs font-bold text-slate-900">
                {order.customer_name || "Valued Customer"}
              </h4>
              {order.customer_phone && (
                <p className="text-[11px] text-slate-600">Phone: {order.customer_phone}</p>
              )}
              {order.customer_email && (
                <p className="text-[11px] text-slate-600">Email: {order.customer_email}</p>
              )}
              {order.shipping_address && (
                <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">
                  <strong>Delivery/Pickup:</strong> {order.shipping_address}
                </p>
              )}
            </div>
          </div>

          {/* LINE ITEMS TABLE */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3 text-center w-20">Qty</th>
                  <th className="p-3 text-right w-24">Unit Price</th>
                  <th className="p-3 text-right w-28">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-900 block">{it.product_name}</span>
                      {it.product_code && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          Code: {it.product_code}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-medium">{it.quantity}</td>
                    <td className="p-3 text-right text-slate-600 font-mono">
                      {formatCurrency(it.unit_price)}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 font-mono">
                      {formatCurrency(it.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTALS & PAYMENT DETAILS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
            {/* Payment & Fulfillment Summary */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Payment &amp; Fulfillment
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Status:</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      isPaid
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-amber-50 text-amber-700 border-amber-300"
                    }`}
                  >
                    {isPaid ? "✓ PAID" : "PENDING"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-medium text-slate-800">{order.payment_method || "Online"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fulfillment Status:</span>
                  <span className="font-bold text-slate-900">{order.fulfillment_status}</span>
                </div>
              </div>
              {order.notes && (
                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                  <strong>Notes:</strong> {order.notes}
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>Discount Applied:</span>
                  <span className="font-mono font-medium">-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-600">
                <span>Fulfillment / Delivery Charge:</span>
                <span className="font-bold text-emerald-700">FREE</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Taxes (GST Inclusive):</span>
                  <span className="font-mono font-medium">{formatCurrency(tax)}</span>
                </div>
              )}
              <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-extrabold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-base text-red-600 font-mono font-black">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* FOOTER & TERMS */}
          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 gap-2">
            <div>
              <p>This is a computer-generated invoice and does not require a physical signature.</p>
              <p>For support or questions regarding this order, contact support@143panda.com.</p>
            </div>
            <div className="text-right font-medium text-slate-400">
              Generated via 143Panda Platform
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

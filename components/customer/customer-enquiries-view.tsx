"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail,
  Search,
  RefreshCw,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Phone,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CustomerSalesTabs } from "./customer-sales-tabs";
import { toast } from "sonner";

interface Enquiry {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  message: string;
  status: string;
  preferred_date?: string;
  preferred_time?: string;
  created_at: string;
  business_name?: string;
  business_phone?: string;
  business_city?: string;
  professional_name?: string;
  professional_phone?: string;
  professional_city?: string;
  reply?: string;
}

export function CustomerEnquiriesView() {
  const [loading, setLoading] = useState(true);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [search, setSearch] = useState("");
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  const loadEnquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/enquiries");
      const json = await res.json();
      if (res.ok && json.data) {
        setEnquiries(json.data);
      } else {
        setEnquiries([]);
      }
    } catch {
      toast.error("Failed to load enquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnquiries();
  }, []);

  const filtered = enquiries.filter((item) => {
    const q = search.toLowerCase();
    const biz = (item.business_name || item.professional_name || "").toLowerCase();
    const msg = (item.message || "").toLowerCase();
    return biz.includes(q) || msg.includes(q);
  });

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "new" || s === "pending") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
          Pending Reply
        </Badge>
      );
    }
    if (s === "contacted" || s === "replied" || s === "resolved") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1">
          <CheckCircle2 className="size-3" /> Replied
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Mail className="size-5 text-primary" /> My Inquiries &amp; Questions
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Track inquiries, quotes, and questions sent to verified businesses and professionals in Varanasi.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search inquiries by business or message..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs h-9"
        />
      </div>

      {/* Content */}
      <Card className="rounded-xl border shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
            Loading your inquiries...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Mail className="size-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-foreground">No inquiries found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              When you send an inquiry from a store, service, or professional profile, it will appear here for easy tracking.
            </p>
            <Button asChild size="sm" className="mt-4 text-xs bg-primary text-white">
              <Link href="/explore">Browse Directory</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Business / Professional</TableHead>
                  <TableHead className="text-xs font-semibold">Message &amp; Question</TableHead>
                  <TableHead className="text-xs font-semibold">Preferred Timing</TableHead>
                  <TableHead className="text-xs font-semibold">Date Sent</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-xs">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-primary shrink-0" />
                        <div>
                          <span>{item.business_name || item.professional_name || "Business"}</span>
                          {(item.business_city || item.professional_city) && (
                            <span className="block text-[11px] text-muted-foreground font-normal">
                              {item.business_city || item.professional_city}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs max-w-xs truncate text-muted-foreground">
                      {item.message}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.preferred_date || item.preferred_time ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3 text-muted-foreground" />
                          <span>
                            {item.preferred_date ? String(item.preferred_date).slice(0, 10) : ""}
                            {item.preferred_time ? ` (${item.preferred_time})` : ""}
                          </span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-primary hover:text-primary"
                        onClick={() => setSelectedEnquiry(item)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Inquiry Detail Dialog */}
      <Dialog open={Boolean(selectedEnquiry)} onOpenChange={(open) => !open && setSelectedEnquiry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Mail className="size-4 text-primary" /> Inquiry Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sent to {selectedEnquiry?.business_name || selectedEnquiry?.professional_name || "Business"}
            </DialogDescription>
          </DialogHeader>

          {selectedEnquiry && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-muted/50 border space-y-1">
                <p className="font-semibold text-foreground">Message Sent:</p>
                <p className="text-muted-foreground leading-relaxed">{selectedEnquiry.message}</p>
              </div>

              {(selectedEnquiry.preferred_date || selectedEnquiry.preferred_time) && (
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border bg-card">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Preferred Date:</span>
                    <span className="font-medium">{selectedEnquiry.preferred_date || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Preferred Time:</span>
                    <span className="font-medium">{selectedEnquiry.preferred_time || "—"}</span>
                  </div>
                </div>
              )}

              {selectedEnquiry.reply ? (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  <p className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" /> Provider Reply:
                  </p>
                  <p className="mt-1 leading-relaxed">{selectedEnquiry.reply}</p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <Clock className="size-4 shrink-0" />
                  <span>Awaiting response from the business provider. They will contact you shortly.</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Phone,
  MessageCircle,
  Ticket,
  Users,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuthStore } from "@/store";

interface Props {
  event: any;
  owner?: any;
}

export function PublicEventDetailView({ event, owner }: Props) {
  const { user } = useAuthStore();

  const [registerOpen, setRegisterOpen] = useState(false);
  const [form, setForm] = useState({
    name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    attendees: "1",
    notes: `Hi, I am interested in attending "${event.title || event.name}". Please confirm my registration and pass details.`,
  });
  const [submitting, setSubmitting] = useState(false);

  const ownerName =
    owner?.name ||
    event.organizer_name ||
    event.business_name ||
    "Event Organizer";
  const eventLocation =
    [event.venue_name, event.city, event.state].filter(Boolean).join(", ") ||
    event.address ||
    "Varanasi, India";
  const ownerPhone = owner?.phone || event.phone || "+91 94152 20304";
  const ownerWhatsapp =
    owner?.whatsapp ||
    event.whatsapp ||
    ownerPhone.replace(/[^0-9]/g, "");
  const businessSlug = owner?.slug || event.business_slug || event.business_id;

  const price = Number(event.price || 0);
  const isFree = Boolean(event.is_free || price === 0);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error("Please provide your name and phone number.");
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success(
        "Registration request submitted! The event organizer will contact you with pass confirmation."
      );
      setRegisterOpen(false);
    } catch {
      toast.error("Failed to register. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.share) {
      navigator
        .share({
          title: event.title || event.name,
          text: `Check out ${event.title || event.name} in ${eventLocation}`,
          url: window.location.href,
        })
        .catch(() => {});
    } else if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Event link copied to clipboard!");
    }
  };

  const formattedDate = event.start_date
    ? new Date(event.start_date).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      {/* Breadcrumb Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <ChevronRight className="size-3" />
            <Link
              href="/events"
              className="hover:text-primary transition-colors"
            >
              Events
            </Link>
            {event.category_name && (
              <>
                <ChevronRight className="size-3" />
                <span className="text-foreground font-medium">
                  {event.category_name}
                </span>
              </>
            )}
            <ChevronRight className="size-3" />
            <span className="text-purple-600 font-semibold truncate max-w-[240px]">
              {event.title || event.name}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Event Content (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border shadow-xs overflow-hidden bg-card">
              <div className="relative aspect-video sm:aspect-21/9 bg-muted overflow-hidden">
                <Image
                  src={
                    event.image_url ||
                    event.default_image_url ||
                    "/placeholder-event.jpg"
                  }
                  alt={event.title || event.name}
                  fill
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge
                    className={
                      isFree
                        ? "bg-emerald-600 text-white font-bold text-xs shadow-sm"
                        : "bg-purple-600 text-white font-bold text-xs shadow-sm"
                    }
                  >
                    {isFree ? "Free Entry" : `₹${price.toLocaleString("en-IN")}`}
                  </Badge>
                  {event.category_name && (
                    <Badge
                      variant="secondary"
                      className="bg-black/60 text-white backdrop-blur-xs text-xs"
                    >
                      {event.category_name}
                    </Badge>
                  )}
                </div>
                <div className="absolute top-4 right-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="size-8 p-0 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs border-0"
                    onClick={handleShare}
                  >
                    <Share2 className="size-3.5" />
                  </Button>
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {event.title || event.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-white/85 mt-1 flex items-center gap-2">
                    <MapPin className="size-3.5 text-purple-400 shrink-0" />
                    <span>{eventLocation}</span>
                  </p>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Date & Time Highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-purple-50/50 border border-purple-100">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">
                      Date
                    </span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="size-3.5 text-purple-600" />
                      {formattedDate || "Announced Soon"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">
                      Timings
                    </span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="size-3.5 text-purple-600" />
                      {event.start_time
                        ? `${event.start_time}${event.end_time ? ` - ${event.end_time}` : ""}`
                        : "Full Day"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">
                      Entry Access
                    </span>
                    <span className="text-xs font-bold text-foreground truncate mt-0.5 block">
                      {isFree ? "Free Registration" : "Entry Pass Required"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">
                      Status
                    </span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="size-3.5" />
                      Verified Event
                    </span>
                  </div>
                </div>

                {/* Event Overview */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="size-4 text-purple-600" />
                    About This Event
                  </h3>
                  <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                    {event.description ||
                      `${event.title || event.name} brings together top participants, industry leaders, and guests at ${eventLocation}. Join us for an engaging program, networking opportunities, and memorable experiences.`}
                  </div>
                </div>

                {/* Key Highlights */}
                <div className="space-y-3 pt-2 border-t">
                  <h3 className="text-base font-bold text-foreground">
                    Event Highlights & Inclusions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {[
                      "Official attendee badge & welcome kit",
                      "Full access to keynote sessions and exhibition pavilions",
                      "Exclusive networking lounge with industry experts",
                      "Complimentary refreshment and tea breaks",
                      "Digital event guide & schedule walkthrough",
                      "Participation certificate (where applicable)",
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-foreground/80"
                      >
                        <CheckCircle2 className="size-4 text-purple-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Venue Details */}
                {event.venue_name && (
                  <div className="p-4 rounded-xl bg-muted/40 border space-y-1">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-purple-600" /> Venue &
                      Directions
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {event.venue_name}
                      {event.address && ` — ${event.address}`}
                      {event.city && `, ${event.city}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (Registration & Organizer) */}
          <div className="space-y-6">
            <Card className="rounded-2xl border shadow-md bg-card sticky top-20 overflow-hidden">
              <div className="p-6 space-y-6">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold">
                    Pass Price
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-foreground">
                      {isFree
                        ? "Free"
                        : `₹${price.toLocaleString("en-IN")}`}
                    </span>
                    {!isFree && (
                      <span className="text-xs text-muted-foreground">
                        / attendee
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isFree
                      ? "Complimentary entry with prior online registration"
                      : "Includes all access pass and event materials"}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <Button
                    onClick={() => setRegisterOpen(true)}
                    className="w-full text-xs font-bold py-5 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                  >
                    <Ticket className="size-4 mr-2" />
                    {isFree ? "Register for Free Pass" : "Book Event Pass"}
                  </Button>
                </div>

                {/* Direct Contact Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs font-medium text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                  >
                    <a
                      href={`https://wa.me/${ownerWhatsapp}?text=${encodeURIComponent(
                        `Hi, I have a query regarding "${event.title || event.name}" at ${eventLocation}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="size-3.5 mr-1 text-emerald-600" />
                      WhatsApp
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <a href={`tel:${ownerPhone}`}>
                      <Phone className="size-3.5 mr-1 text-slate-600" />
                      Call Organizer
                    </a>
                  </Button>
                </div>

                {/* Organizer Info Box */}
                <div className="p-4 rounded-xl bg-muted/40 border space-y-3">
                  <div className="flex items-center gap-2">
                    {businessSlug ? (
                      <Link href={`/business/${businessSlug}`} className="block cursor-pointer">
                        <div className="size-9 rounded-lg bg-purple-100 hover:bg-purple-200 transition-colors flex items-center justify-center text-purple-700">
                          <Building2 className="size-5" />
                        </div>
                      </Link>
                    ) : (
                      <div className="size-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                        <Building2 className="size-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-muted-foreground block uppercase tracking-wider font-semibold">
                        Organized By
                      </span>
                      {businessSlug ? (
                        <Link
                          href={`/business/${businessSlug}`}
                          className="text-xs font-bold text-foreground hover:text-purple-600 hover:underline truncate block"
                        >
                          {ownerName}
                        </Link>
                      ) : (
                        <span className="text-xs font-bold text-foreground truncate block">
                          {ownerName}
                        </span>
                      )}
                    </div>
                  </div>
                  {businessSlug && (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-purple-700 hover:text-purple-800 hover:bg-purple-50 font-semibold"
                    >
                      <Link href={`/business/${businessSlug}`}>
                        View Business Profile & Other Events →
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Registration Dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register for Event</DialogTitle>
            <DialogDescription>
              Submit your details to receive entry confirmation for{" "}
              <span className="font-semibold text-foreground">
                {event.title || event.name}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegisterSubmit} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Your Full Name *
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Phone Number *
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91..."
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Attendees
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={form.attendees}
                  onChange={(e) =>
                    setForm({ ...form, attendees: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your.email@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Special Requests / Notes
              </label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRegisterOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                {submitting ? "Submitting..." : "Confirm Registration"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

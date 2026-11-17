"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Package,
  Wrench,
  UserCheck,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function PlatformAdminFooter() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSubscribed(true);
    toast.success("Thank you for subscribing to EduBird platform updates!");
    setEmail("");
  };

  return (
    <footer className="w-full border-t border-border/60 bg-gradient-to-b from-card via-muted/20 to-card text-foreground">
      {/* Top Newsletter & Highlights Strip */}
      <div className="border-b border-border/40 bg-primary/5 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
              <Sparkles className="size-3.5" />
              <span>Stay Ahead with EduBird</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Get notified about trending products, fresh jobs &amp; verified courses
            </h3>
            <p className="text-xs text-muted-foreground">
              Direct updates from verified local stores and accredited institutions in your city.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="flex w-full md:w-auto items-center gap-2 max-w-md">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..."
              className="h-10 text-xs bg-background/90 rounded-xl border-border/80 min-w-[220px]"
            />
            <Button
              type="submit"
              size="sm"
              className="h-10 px-4 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shrink-0"
            >
              <span>{subscribed ? "Subscribed" : "Subscribe"}</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </form>
        </div>
      </div>

      {/* Main 5-Column Mega Footer */}
      <div className="max-w-7xl mx-auto py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 sm:gap-10">
          {/* Brand Info (Spans 2 columns on large screens) */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-primary/20">
                EB
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-foreground">
                  Edu<span className="text-primary">Bird</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground -mt-1">
                  Hyperlocal Marketplace
                </span>
              </div>
            </Link>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Discover and compare prices across 18+ verified local stores in Varanasi. Shop retail essentials, book skilled services, consult top professionals, and enroll in certified programs.
            </p>

            <div className="space-y-2 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 text-primary shrink-0" />
                <span>Pandeypur, Varanasi, Uttar Pradesh 221002</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 text-primary shrink-0" />
                <span>+91 94152 10103 / Support Desk</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 text-primary shrink-0" />
                <span>support@edubird.com</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                <span className="inline-block size-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                Live in Varanasi
              </Badge>
              <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border/60">
                100% Verified Stores
              </Badge>
            </div>
          </div>

          {/* 1. Products Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Package className="size-3.5 text-primary" />
              <span>Products</span>
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/products" className="hover:text-primary transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/explore?type=product&categoryId=1" className="hover:text-primary transition-colors">
                  Groceries &amp; Staples
                </Link>
              </li>
              <li>
                <Link href="/explore?type=product" className="hover:text-primary transition-colors">
                  Electronics &amp; Gadgets
                </Link>
              </li>
              <li>
                <Link href="/explore?type=product" className="hover:text-primary transition-colors">
                  Villas &amp; Real Estate
                </Link>
              </li>
              <li>
                <Link href="/explore?type=product" className="hover:text-primary transition-colors">
                  Cleaners &amp; Repellents
                </Link>
              </li>
              <li>
                <Link href="/explore?type=product" className="hover:text-primary transition-colors">
                  Compare Store Prices
                </Link>
              </li>
            </ul>
          </div>

          {/* 2. Services Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Wrench className="size-3.5 text-primary" />
              <span>Services</span>
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/explore?type=service" className="hover:text-primary transition-colors">
                  All Local Services
                </Link>
              </li>
              <li>
                <Link href="/explore?type=service" className="hover:text-primary transition-colors">
                  Career Mentorship
                </Link>
              </li>
              <li>
                <Link href="/explore?type=service" className="hover:text-primary transition-colors">
                  Home Maintenance
                </Link>
              </li>
              <li>
                <Link href="/explore?type=service" className="hover:text-primary transition-colors">
                  Legal &amp; Business Audit
                </Link>
              </li>
              <li>
                <Link href="/explore?type=service" className="hover:text-primary transition-colors">
                  Health &amp; Wellness
                </Link>
              </li>
              <li>
                <Link href="/explore?type=service" className="hover:text-primary transition-colors">
                  Book a Provider
                </Link>
              </li>
            </ul>
          </div>

          {/* 3. Professionals Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <UserCheck className="size-3.5 text-primary" />
              <span>Professionals</span>
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/explore?type=professional" className="hover:text-primary transition-colors">
                  Verified Directory
                </Link>
              </li>
              <li>
                <Link href="/explore?type=professional" className="hover:text-primary transition-colors">
                  Doctors &amp; Physicians
                </Link>
              </li>
              <li>
                <Link href="/explore?type=professional" className="hover:text-primary transition-colors">
                  Legal Advocates
                </Link>
              </li>
              <li>
                <Link href="/explore?type=professional" className="hover:text-primary transition-colors">
                  Academic Tutors
                </Link>
              </li>
              <li>
                <Link href="/explore?type=professional" className="hover:text-primary transition-colors">
                  Supply Chain Experts
                </Link>
              </li>
              <li>
                <Link href="/admin/profiles" className="hover:text-primary transition-colors">
                  Register as Expert
                </Link>
              </li>
            </ul>
          </div>

          {/* 4. Courses & Jobs Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <GraduationCap className="size-3.5 text-primary" />
              <span>Education &amp; Jobs</span>
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/courses" className="hover:text-primary transition-colors">
                  Degree &amp; Diploma Courses
                </Link>
              </li>
              <li>
                <Link href="/courses" className="hover:text-primary transition-colors">
                  Skill Certifications
                </Link>
              </li>
              <li>
                <Link href="/institutes" className="hover:text-primary transition-colors">
                  Partner Institutes
                </Link>
              </li>
              <li>
                <Link href="/jobs" className="hover:text-primary transition-colors">
                  Active Job Openings
                </Link>
              </li>
              <li>
                <Link href="/jobs" className="hover:text-primary transition-colors">
                  Full-time &amp; On-Site Jobs
                </Link>
              </li>
              <li>
                <Link href="/admin/catalog/jobs" className="hover:text-primary transition-colors">
                  Post a Vacancy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/40 py-5 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
            <span>&copy; {year} EduBird Platform. All rights reserved.</span>
            <span className="hidden sm:inline-block size-1 rounded-full bg-border" />
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="hover:text-primary transition-colors">
              Support
            </Link>
            <Link href="/platformadmin" className="font-semibold text-primary hover:underline transition-colors">
              Platform Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}


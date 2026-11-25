"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  Wrench,
  UserCheck,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Users,
  Store,
  Handshake,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

function AppleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.64 1.35-.58.67-.99 1.74-.86 2.78.99.08 2.02-.53 2.58-1.28z" />
    </svg>
  );
}

function PlayStoreIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.609 1.814L13.793 12 3.61 22.186c-.33-.31-.53-.765-.53-1.286V3.1c0-.52.2-.975.53-1.286zm11.234 11.236l2.15-2.15-11.83-6.83 9.68 8.98zm0 1.898L5.163 23.93l11.83-6.83-2.15-2.15zM18.37 11.45l2.67 1.54c.73.42.73 1.1 0 1.52l-2.67 1.54-1.73-1.73 1.73-1.37z" />
    </svg>
  );
}

export function PlatformAdminFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/60 bg-gradient-to-b from-card via-muted/20 to-card text-foreground">
      {/* Top Pre-Footer Bar: App Download & Community Stats */}
      <div className="py-6 px-4 sm:px-6 lg:px-8 border-b border-border/40">
        <div className="max-w-7xl mx-auto rounded-2xl bg-[#f0f6ff] border border-blue-100/90 p-4 sm:p-5 shadow-xs overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6">
            {/* 1. Left: Get the 143Panda App */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 shrink-0 w-full md:w-auto justify-center sm:justify-start text-center sm:text-left">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative size-12 sm:size-14 shrink-0 flex items-center justify-center">
                  <Image
                    src="/images/hero-panda-3d-clean.webp"
                    alt="143Panda Mascot"
                    width={56}
                    height={56}
                    className="size-12 sm:size-14 object-contain drop-shadow-sm"
                  />
                </div>
                <div className="min-w-0 text-left">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
                    Get the 143Panda App
                  </h4>
                  <p className="text-xs text-slate-500 leading-tight mt-0.5 whitespace-nowrap">
                    Discover, connect and grow on the go!
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:pl-2 w-full sm:w-auto">
                <a
                  href="#"
                  className="flex items-center gap-2 bg-black hover:bg-neutral-800 text-white px-3 py-1.5 rounded-lg transition-colors shadow-2xs group"
                  title="Download on the App Store"
                >
                  <AppleIcon className="size-4.5 fill-current" />
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] text-neutral-300 uppercase leading-none tracking-tight">Download on the</span>
                    <span className="text-[12px] font-bold leading-tight font-sans tracking-tight">App Store</span>
                  </div>
                </a>

                <a
                  href="#"
                  className="flex items-center gap-2 bg-black hover:bg-neutral-800 text-white px-3 py-1.5 rounded-lg transition-colors shadow-2xs group"
                  title="GET IT ON Google Play"
                >
                  <PlayStoreIcon className="size-4.5 fill-current" />
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] text-neutral-300 uppercase leading-none tracking-tight">GET IT ON</span>
                    <span className="text-[12px] font-bold leading-tight font-sans tracking-tight">Google Play</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Vertical Divider for desktop */}
            <div className="hidden md:block w-px h-10 bg-blue-200/70 shrink-0" />

            {/* 2. Right: Stats Counter */}
            <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:justify-center sm:gap-8 shrink-0 w-full md:w-auto py-3 md:py-0 border-t md:border-t-0 border-blue-100/80">
              {/* 10K+ Happy Users */}
              <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1.5 sm:gap-2.5">
                <div className="size-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="size-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">10K+</span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 leading-tight truncate">Happy Users</span>
                </div>
              </div>

              {/* 5K+ Businesses */}
              <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1.5 sm:gap-2.5">
                <div className="size-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Store className="size-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">5K+</span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 leading-tight truncate">Businesses</span>
                </div>
              </div>

              {/* 1M+ Connections */}
              <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1.5 sm:gap-2.5">
                <div className="size-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Handshake className="size-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">1M+</span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 leading-tight truncate">Connections</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 5-Column Mega Footer */}
      <div className="max-w-7xl mx-auto py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 sm:gap-10">
          {/* Brand Info (Spans 2 columns on large screens) */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="relative h-11 w-auto flex items-center">
                <Image
                  src="/images/143panda-logo.png"
                  alt="143Panda"
                  width={140}
                  height={50}
                  className="h-10 w-auto object-contain"
                />
              </div>
            </Link>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Discover and compare prices across verified local stores, book skilled services, consult top professionals, and enroll in certified programs on 143Panda.
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
                <span>support@143panda.com</span>
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
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground text-center md:text-left">
          <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
            <span>&copy; {year} 143Panda Platform. All rights reserved.</span>
            <span className="hidden sm:inline-block size-1 rounded-full bg-border" />
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-2 text-xs">
            <Link href="/blogs" className="hover:text-primary transition-colors">
              Blog &amp; News
            </Link>
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


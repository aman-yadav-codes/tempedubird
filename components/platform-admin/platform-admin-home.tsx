"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Users,
  ShieldCheck,
  Briefcase,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const QUICK_MODULES = [
  {
    title: "Institutions Directory",
    description: "Manage registered institutions and tenant profiles",
    href: "/platformadmin/institutions",
    icon: Building2,
  },
  {
    title: "User Management",
    description: "System administrators, staff, and account directory",
    href: "/platformadmin/users",
    icon: Users,
  },
  {
    title: "Access Control & Roles",
    description: "Unified role permissions and security policies",
    href: "/platformadmin/access-control",
    icon: ShieldCheck,
  },
  {
    title: "Operations & Tasks",
    description: "Track cross-organization deliverables and workflows",
    href: "/platformadmin/operations/tasks",
    icon: Briefcase,
  },
];

export function PlatformAdminHome() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      router.push("/platformadmin");
      return;
    }
    // Direct quick match routing
    if (trimmed.includes("inst")) {
      router.push("/platformadmin/institutions");
    } else if (trimmed.includes("user") || trimmed.includes("staff")) {
      router.push("/platformadmin/users");
    } else if (trimmed.includes("role") || trimmed.includes("perm") || trimmed.includes("access")) {
      router.push("/platformadmin/access-control");
    } else if (trimmed.includes("task") || trimmed.includes("work") || trimmed.includes("operat")) {
      router.push("/platformadmin/operations/tasks");
    } else {
      router.push(`/platformadmin?search=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-20 max-w-4xl mx-auto w-full">
      {/* Central Google-style minimal branding */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
          <Sparkles className="size-3" />
          <span>Platform Administrator Workspace</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground">
          Edu<span className="text-primary">Bird</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
          Centralized administration and platform governance for multi-institution infrastructure.
        </p>
      </div>

      {/* Google-style minimal search bar */}
      <form onSubmit={handleSearch} className="w-full max-w-2xl mb-8">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            <Search className="size-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search institutions, users, operations, or access control..."
            className="w-full h-13 pl-12 pr-4 rounded-full border border-border/80 bg-background/90 text-foreground text-sm shadow-sm hover:shadow-md focus:shadow-md focus:outline-none focus:border-primary/80 focus:ring-4 focus:ring-primary/10 transition-all"
          />
        </div>

        {/* Buttons below search bar */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="text-xs px-4 h-9 rounded-md border border-border/60 hover:border-border"
          >
            Search Platform
          </Button>
          <Link href="/platformadmin">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="text-xs px-4 h-9 rounded-md gap-1.5 shadow-sm"
            >
              <span>Open Console</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </form>

      {/* Quick shortcut cards */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-border/40">
        {QUICK_MODULES.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group p-3.5 rounded-xl border border-border/60 bg-card/50 hover:bg-card hover:border-primary/30 transition-all flex items-start gap-3 shadow-2xs hover:shadow-sm"
            >
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Icon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {item.title}
                  </h3>
                  <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

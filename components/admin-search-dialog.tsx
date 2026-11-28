"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search,
  LayoutDashboard,
  Briefcase,
  Activity,
  TrendingUp,
  Mail,
  CalendarCheck2,
  GraduationCap,
  Layers,
  Package,
  CreditCard,
  Receipt,
  Users,
  Store,
  Compass,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface AdminSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NavShortcut {
  title: string;
  category: "Navigation" | "Sales & Leads" | "Catalog & Marketing" | "Finance & Users";
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
}

const SHORTCUTS: NavShortcut[] = [
  { title: "Workspace Dashboard", category: "Navigation", url: "/admin", icon: LayoutDashboard, keywords: ["home", "workspace", "overview"] },
  { title: "Task Management", category: "Navigation", url: "/admin/operations/tasks", icon: Briefcase, keywords: ["tasks", "work", "todo", "operations"] },
  { title: "Daily Work Logs", category: "Navigation", url: "/admin/operations/work-logs", icon: Activity, keywords: ["logs", "timesheet", "daily"] },
  { title: "Public Store Front", category: "Navigation", url: "/storefront", icon: Store, keywords: ["store", "public", "website", "shop"] },
  
  { title: "Sales Pipeline & Leads", category: "Sales & Leads", url: "/admin/sales/pipeline", icon: TrendingUp, keywords: ["deals", "crm", "leads", "sales"] },
  { title: "Customer Enquiries", category: "Sales & Leads", url: "/admin/sales/enquiries", icon: Mail, keywords: ["inquiries", "messages", "enquiry"] },
  { title: "Customer Bookings", category: "Sales & Leads", url: "/admin/sales/bookings", icon: CalendarCheck2, keywords: ["appointments", "bookings", "schedule"] },
  { title: "Student Admissions", category: "Sales & Leads", url: "/admin/sales/students", icon: GraduationCap, keywords: ["admissions", "students", "enrollment", "class"] },
  
  { title: "All Listings & Profiles", category: "Catalog & Marketing", url: "/admin/profiles", icon: Layers, keywords: ["catalog", "profiles", "business", "professional"] },
  { title: "Products Catalog", category: "Catalog & Marketing", url: "/admin/profiles?tab=products", icon: Package, keywords: ["products", "items", "goods", "inventory"] },
  { title: "Services Catalog", category: "Catalog & Marketing", url: "/admin/profiles?tab=services", icon: Sparkles, keywords: ["services", "skills", "offerings"] },
  
  { title: "Invoices & Billing", category: "Finance & Users", url: "/admin/finance/invoice", icon: CreditCard, keywords: ["invoice", "bills", "billing", "payments"] },
  { title: "Transactions History", category: "Finance & Users", url: "/admin/finance/transactions", icon: Receipt, keywords: ["transactions", "finance", "ledger", "money"] },
  { title: "Users & Accounts", category: "Finance & Users", url: "/admin/users", icon: Users, keywords: ["users", "clients", "customers", "team", "staff"] },
];

export function AdminSearchDialog({ open, onOpenChange }: AdminSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const filteredShortcuts = useMemo(() => {
    if (!query.trim()) return SHORTCUTS;
    const q = query.toLowerCase().trim();
    return SHORTCUTS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.includes(q))
    );
  }, [query]);

  const handleSelect = (url: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(url);
  };

  const handleExploreSearch = () => {
    if (!query.trim()) return;
    onOpenChange(false);
    router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border">
        <DialogHeader className="sr-only">
          <DialogTitle>Quick Search</DialogTitle>
          <DialogDescription>Search workspace modules, pages, tasks, and directory listings</DialogDescription>
        </DialogHeader>

        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-border/80 bg-muted/20">
          <Search className="size-4 text-muted-foreground shrink-0 mr-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (filteredShortcuts.length > 0) {
                  handleSelect(filteredShortcuts[0].url);
                } else if (query.trim()) {
                  handleExploreSearch();
                }
              }
            }}
            placeholder="Search pages, modules, tasks, or explore directory..."
            className="h-14 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm bg-transparent px-0 shadow-none placeholder:text-muted-foreground/70"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-muted/60"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-3 space-y-4">
          {query.trim() && (
            <div
              onClick={handleExploreSearch}
              className="flex items-center justify-between p-3 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Compass className="size-4 shrink-0" />
                <span className="text-xs font-semibold">
                  Search &ldquo;{query.trim()}&rdquo; in Public Marketplace Directory
                </span>
              </div>
              <ArrowRight className="size-3.5 opacity-70" />
            </div>
          )}

          {filteredShortcuts.length > 0 ? (
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 pb-1">
                Workspace Shortcuts
              </div>
              {filteredShortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.url}
                    type="button"
                    onClick={() => handleSelect(item.url)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/80 text-foreground text-left text-xs transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                        <Icon className="size-3.5" />
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-md">
                      {item.category}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching workspace pages found. Press Enter to search public directory.
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-muted/40 border-t border-border/80 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded border bg-background font-mono text-[10px]">Enter</kbd> to select</span>
            <span><kbd className="px-1.5 py-0.5 rounded border bg-background font-mono text-[10px]">Esc</kbd> to close</span>
          </div>
          <span>143Panda Workspace</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

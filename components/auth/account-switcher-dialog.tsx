"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Bus,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Loader2,
  LogIn,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store";

type AccountItem = {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  role_code: string;
  role_label: string;
  admission_number?: string | null;
  institution_name?: string | null;
  institution_id?: number | null;
};

type AccountsData = {
  students: AccountItem[];
  parents: AccountItem[];
  teachers: AccountItem[];
  drivers: AccountItem[];
  institution_admins: AccountItem[];
  platform_admins: AccountItem[];
};

const CATEGORIES = [
  { id: "all", label: "All Accounts", icon: Sparkles },
  { id: "students", label: "Students", icon: GraduationCap, badgeColor: "bg-rose-500/10 text-rose-700 border-rose-500/20" },
  { id: "parents", label: "Parents", icon: Users, badgeColor: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  { id: "teachers", label: "Teachers", icon: Briefcase, badgeColor: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  { id: "drivers", label: "Drivers", icon: Bus, badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  { id: "institution_admins", label: "Institute Admin", icon: Briefcase, badgeColor: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
  { id: "platform_admins", label: "Platform Admin", icon: ShieldCheck, badgeColor: "bg-destructive/10 text-destructive border-destructive/20" },
];

export function AccountSwitcherDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [accounts, setAccounts] = useState<AccountsData>({
    students: [],
    parents: [],
    teachers: [],
    drivers: [],
    institution_admins: [],
    platform_admins: [],
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/switchable-accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAccounts();
    }
  }, [open]);

  const allAccountsList = useMemo(() => {
    let list: AccountItem[] = [];
    if (activeTab === "all") {
      list = [
        ...accounts.students,
        ...accounts.parents,
        ...accounts.teachers,
        ...accounts.drivers,
        ...accounts.institution_admins,
        ...accounts.platform_admins,
      ];
    } else {
      list = accounts[activeTab as keyof AccountsData] || [];
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.full_name?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q) ||
          a.phone?.toLowerCase().includes(q) ||
          a.admission_number?.toLowerCase().includes(q) ||
          a.institution_name?.toLowerCase().includes(q) ||
          a.role_label?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [accounts, activeTab, search]);

  const handleSwitchAccount = async (account: AccountItem) => {
    if (account.id === user?.id) {
      toast.info(`Already logged into ${account.full_name}'s account.`);
      onOpenChange(false);
      return;
    }

    setSwitchingId(account.id);
    try {
      const res = await fetch("/api/auth/switch-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: account.id }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to switch account");
      }

      setAuth(json.user, json.accessToken);
      toast.success(`Switched to ${account.full_name} (${account.role_label})`);
      onOpenChange(false);

      if (json.redirectTo) {
        window.location.href = json.redirectTo;
      } else {
        window.location.reload();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Switch failed");
    } finally {
      setSwitchingId(null);
    }
  };

  const getRoleBadge = (roleCode: string, label: string) => {
    switch (roleCode) {
      case "student":
        return <Badge className="bg-rose-500/15 text-rose-800 border-rose-500/30 text-[10px] gap-1"><GraduationCap className="h-3 w-3" /> Student</Badge>;
      case "parent":
        return <Badge className="bg-amber-500/15 text-amber-800 border-amber-500/30 text-[10px] gap-1"><Users className="h-3 w-3" /> Parent</Badge>;
      case "teacher":
        return <Badge className="bg-blue-500/15 text-blue-800 border-blue-500/30 text-[10px] gap-1"><Briefcase className="h-3 w-3" /> Teacher</Badge>;
      case "driver":
        return <Badge className="bg-emerald-500/15 text-emerald-800 border-emerald-500/30 text-[10px] gap-1"><Bus className="h-3 w-3" /> Driver</Badge>;
      case "institution_admin":
        return <Badge className="bg-purple-500/15 text-purple-800 border-purple-500/30 text-[10px] gap-1"><Briefcase className="h-3 w-3" /> Institute Admin</Badge>;
      case "platform_admin":
        return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] gap-1"><ShieldCheck className="h-3 w-3" /> Platform Admin</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{label}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Switch Account / Quick Login
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Instantly switch between Students, Parents, Teachers, Drivers, Institute Admins, and Platform Admins.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchAccounts}
              disabled={loading}
              className="h-8 gap-1 text-xs"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search accounts by name, admission no, email, phone, or institute..."
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === cat.id
                      ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Accounts List Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[55vh]">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-xs">Loading available accounts...</p>
            </div>
          ) : allAccountsList.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-1">
              <p className="text-sm font-semibold">No accounts found matching search.</p>
              <p className="text-xs">Try searching for a different name or category.</p>
            </div>
          ) : (
            allAccountsList.map((acc) => {
              const isCurrent = acc.id === user?.id;
              const initials = (acc.full_name || "User")
                .split(" ")
                .map((n) => n[0])
                .filter(Boolean)
                .join("")
                .substring(0, 2)
                .toUpperCase();

              return (
                <div
                  key={acc.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
                      : "bg-card hover:bg-accent/40 border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 border border-border shrink-0">
                      <AvatarImage src={acc.avatar_url || ""} />
                      <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-xs">{acc.full_name}</span>
                        {getRoleBadge(acc.role_code, acc.role_label)}
                        {isCurrent && (
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30 gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Current Session
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                        {acc.admission_number && (
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] font-semibold text-foreground">
                            {acc.admission_number}
                          </span>
                        )}
                        <span>{acc.email || acc.phone}</span>
                        {acc.institution_name && (
                          <>
                            <span>•</span>
                            <span className="text-primary font-medium">{acc.institution_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={Boolean(switchingId) || isCurrent}
                    onClick={() => handleSwitchAccount(acc)}
                    className={`h-8 px-3 text-xs font-semibold gap-1.5 shrink-0 ${
                      isCurrent ? "opacity-60 cursor-default" : ""
                    }`}
                  >
                    {switchingId === acc.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Switching...
                      </>
                    ) : isCurrent ? (
                      "Active"
                    ) : (
                      <>
                        <LogIn className="h-3.5 w-3.5" /> Log In / Switch
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

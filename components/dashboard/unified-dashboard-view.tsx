"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  CheckSquare,
  BookMarked,
  Building2,
  Library,
  Award,
  Clock,
  UserCheck,
  ArrowRight,
  TrendingUp,
  Download,
  Plus,
  ShieldCheck,
  Sparkles,
  FileText,
  Layers,
  CheckCircle2,
  Users,
  Bell,
  Building,
  School,
  FileSpreadsheet,
  AlertCircle,
  CreditCard,
  Settings,
  HelpCircle,
  LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ContextOption = {
  id: number | string;
  category: string;
  title: string;
  subtitle: string;
  code: string;
  metric: string;
  details?: {
    attendance?: number;
    completedCredits?: number;
    totalCredits?: number;
    studentsCount?: number;
    facultyCount?: number;
    grade?: string;
  };
};

export type DashboardMetricCard = {
  label: string;
  value: string;
  hint: string;
  color: "emerald" | "primary" | "blue" | "amber";
  icon: LucideIcon;
};

export type ActiveModuleItem = {
  id: number | string;
  code: string;
  title: string;
  subtitle: string;
  statusBadge: string;
  statusColor?: "emerald" | "blue" | "amber" | "rose";
  progress: number;
  dueDate: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel: string;
  secondaryActionHref: string;
};

export type QuickShortcut = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  colorBg: string;
  colorText: string;
};

export type UnifiedDashboardProps = {
  role: "platform_admin" | "institution_admin" | "teacher" | "student" | "parent" | "admin";
  statusBadgeText: string;
  idBadgeText: string;
  greetingSubtitle: string;
  primaryButtonText: string;
  primaryButtonHref: string;
  primaryButtonIcon?: LucideIcon;
  secondaryButtonText: string;
  secondaryButtonHref: string;
  secondaryButtonIcon?: LucideIcon;

  contextLabel: string;
  contexts: ContextOption[];
  
  metricsTitle: string;
  metricsSubtitle?: string;
  metrics: DashboardMetricCard[];

  activeSectionTitle: string;
  activeSectionSubtitle?: string;
  activeModules: ActiveModuleItem[];

  quickShortcuts: QuickShortcut[];
  notifications?: { notification_id: string; title: string; message: string; created_at: string }[];
};

export function UnifiedDashboardView({
  role,
  statusBadgeText,
  idBadgeText,
  greetingSubtitle,
  primaryButtonText,
  primaryButtonHref,
  primaryButtonIcon: PrimaryIcon = Plus,
  secondaryButtonText,
  secondaryButtonHref,
  secondaryButtonIcon: SecondaryIcon = GraduationCap,

  contextLabel,
  contexts,

  metricsTitle,
  metricsSubtitle,
  metrics,

  activeSectionTitle,
  activeSectionSubtitle,
  activeModules,

  quickShortcuts,
  notifications = [],
}: UnifiedDashboardProps) {
  const { user } = useAuthStore();
  const [greeting, setGreeting] = useState("Good Day");
  const [selectedContextId, setSelectedContextId] = useState<number | string>(
    contexts[0]?.id ?? 1
  );

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    if (contexts.length > 0 && !contexts.some(c => c.id === selectedContextId)) {
      setSelectedContextId(contexts[0].id);
    }
  }, [contexts, selectedContextId]);

  const activeContext = contexts.find((c) => c.id === selectedContextId) || contexts[0];

  const getMetricColorClasses = (color: DashboardMetricCard["color"]) => {
    switch (color) {
      case "emerald":
        return {
          card: "border-emerald-500/20 bg-emerald-500/5",
          text: "text-emerald-700 dark:text-emerald-400",
          iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        };
      case "primary":
        return {
          card: "border-primary/20 bg-primary/5",
          text: "text-primary",
          iconBg: "bg-primary/10 text-primary",
        };
      case "blue":
        return {
          card: "border-blue-500/20 bg-blue-500/5",
          text: "text-blue-700 dark:text-blue-400",
          iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        };
      case "amber":
        return {
          card: "border-amber-500/20 bg-amber-500/5",
          text: "text-amber-700 dark:text-amber-400",
          iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        };
      default:
        return {
          card: "border-primary/20 bg-primary/5",
          text: "text-primary",
          iconBg: "bg-primary/10 text-primary",
        };
    }
  };

  return (
    <div className="space-y-8">
      {/* WELCOME & MULTI-CONTEXT HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-rose-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-rose-900/30">
        <div className="relative z-10 space-y-6">
          {/* TOP ROW: BADGES & GREETING */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-500 text-white font-extrabold text-xs gap-1 shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5" /> {statusBadgeText}
                </Badge>
                <span className="text-xs font-semibold text-white/80">{idBadgeText}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {greeting}, {user?.full_name || "User"}! 👋
              </h1>

              <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
                {greetingSubtitle}
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {primaryButtonText && (
                <Link href={primaryButtonHref}>
                  <Button
                    size="lg"
                    className="font-bold text-xs gap-2 bg-primary text-white hover:bg-primary/90 shadow-md cursor-pointer border border-white/20"
                  >
                    <PrimaryIcon className="h-4 w-4" />
                    {primaryButtonText}
                  </Button>
                </Link>
              )}
              {secondaryButtonText && (
                <Link href={secondaryButtonHref}>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="font-bold text-xs gap-2 bg-white text-slate-900 hover:bg-slate-100 shadow-md cursor-pointer"
                  >
                    <SecondaryIcon className="h-4 w-4 text-primary" />
                    {secondaryButtonText}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* CONTEXT SELECTOR CAROUSEL (IMAGE 1 STYLE) */}
          {contexts && contexts.length > 0 && (
            <div className="pt-4 border-t border-white/15 space-y-2">
              <p className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                {contextLabel}:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {contexts.map((ctx) => {
                  const isSelected = ctx.id === selectedContextId;
                  return (
                    <button
                      key={ctx.id}
                      type="button"
                      onClick={() => setSelectedContextId(ctx.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-white text-slate-900 border-white shadow-lg ring-2 ring-primary"
                          : "bg-white/10 text-white border-white/15 hover:bg-white/20"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <Badge
                            variant="secondary"
                            className={`text-[9px] font-extrabold ${
                              isSelected ? "bg-primary/10 text-primary" : "bg-white/20 text-white"
                            }`}
                          >
                            {ctx.category}
                          </Badge>
                          {isSelected && (
                            <Badge className="bg-emerald-600 text-white text-[9px] font-extrabold flex items-center gap-0.5">
                              <CheckCircle2 className="h-3 w-3" /> Selected View
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-extrabold text-xs leading-snug line-clamp-2 mt-1">{ctx.title}</h3>
                        <p className={`text-[10px] font-medium line-clamp-1 ${isSelected ? "text-slate-600" : "text-white/70"}`}>
                          {ctx.subtitle}
                        </p>
                      </div>

                      <div className="pt-2 mt-2 border-t border-current/10 flex items-center justify-between text-[10px] font-semibold">
                        <span>{ctx.code}</span>
                        <span>{ctx.metric}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Decorative Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      </div>

      {/* METRICS FOR ACTIVE CONTEXT */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            {metricsTitle}: <span className="text-primary">{activeContext?.title || "Overview"}</span>
          </h2>
          {activeContext?.subtitle && (
            <Badge variant="outline" className="text-xs font-bold text-muted-foreground">
              {activeContext.subtitle}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, idx) => {
            const styles = getMetricColorClasses(m.color);
            const IconComponent = m.icon;
            return (
              <Card key={idx} className={`p-4 shadow-2xs ${styles.card}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${styles.text}`}>{m.label}</span>
                  <div className={`p-2 rounded-lg ${styles.iconBg}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-foreground mt-2">{m.value}</p>
                <span className="text-[10px] text-muted-foreground font-medium">{m.hint}</span>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ACTIVE MODULES / ITEMS GRID */}
      {activeModules && activeModules.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{activeSectionTitle}</h2>
              {activeSectionSubtitle && (
                <p className="text-xs text-muted-foreground">{activeSectionSubtitle}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {activeModules.map((item) => (
              <Card key={item.id} className="p-5 shadow-2xs space-y-4 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="secondary" className="text-[10px] font-bold mb-1">
                      {item.code}
                    </Badge>
                    <h3 className="font-bold text-base text-foreground leading-tight">{item.title}</h3>
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1">
                      <UserCheck className="h-3.5 w-3.5 text-primary" /> {item.subtitle}
                    </p>
                  </div>

                  <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold shrink-0">
                    <Clock className="h-3 w-3 mr-1" /> {item.statusBadge}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Progress / Metric</span>
                    <span className="text-foreground">{item.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                  <Link href={item.primaryActionHref}>
                    <Button size="sm" variant="ghost" className="text-xs font-bold gap-1 text-primary p-0 h-auto hover:bg-transparent cursor-pointer">
                      <FileText className="h-3.5 w-3.5" /> {item.primaryActionLabel}
                    </Button>
                  </Link>

                  <Link href={item.secondaryActionHref}>
                    <Button size="sm" variant="outline" className="text-xs font-bold gap-1 cursor-pointer">
                      <CheckSquare className="h-3.5 w-3.5" /> {item.secondaryActionLabel}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* QUICK SERVICES & SHORTCUTS */}
      {quickShortcuts && quickShortcuts.length > 0 && (
        <div className="space-y-4 pt-2">
          <h2 className="text-xl font-bold text-foreground">Platform Quick Services & Actions</h2>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {quickShortcuts.map((sc, idx) => {
              const IconComp = sc.icon;
              return (
                <Link key={idx} href={sc.href}>
                  <Card className="p-5 hover:border-primary/60 transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs space-y-2 group h-full flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className={`p-3 rounded-2xl ${sc.colorBg} ${sc.colorText} w-fit group-hover:scale-110 transition-transform`}>
                        <IconComp className="h-6 w-6" />
                      </div>
                      <h3 className="font-bold text-sm text-foreground">{sc.title}</h3>
                      <p className="text-xs text-muted-foreground">{sc.description}</p>
                    </div>
                    <div className="flex items-center text-xs font-bold text-primary gap-1 pt-2">
                      <span>Access</span> <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* RECENT NOTIFICATIONS / TIMELINE */}
      {notifications && notifications.length > 0 && (
        <Card className="p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Recent Activity & Notifications</h2>
          </div>

          <div className="space-y-3">
            {notifications.map((item) => (
              <div key={item.notification_id} className="flex items-start gap-3 text-sm p-3 rounded-xl bg-muted/30 border border-border/40">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground">{item.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground mt-0.5">{item.message}</p>
                  <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
                    {new Date(item.created_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

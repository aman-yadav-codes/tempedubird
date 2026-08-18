"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  CheckSquare,
  BookMarked,
  Building2,
  Library,
  LogOut,
  UserCheck,
  Bell,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  School,
  Building,
  RefreshCw,
  Sun,
  Moon,
} from "lucide-react";
import { useAuthStore } from "@/store";
import { clearBrowserSessionData } from "@/lib/auth/clear-browser-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminAcademicSessionSelector } from "@/components/admin-academic-session-selector";
import { AdminNotificationCenter } from "@/components/admin-notification-center";
import { AdminThemeToggle } from "@/components/admin-theme-toggle";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: { label: string; href: string }[];
};

type NavSection = {
  title: string;
  items: NavItem[];
};

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    "My Classroom": true,
    "My Institution": false,
    Notifications: false,
  });

  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setMounted(true);
    const storedTheme = window.localStorage.getItem("app-theme") || window.localStorage.getItem("public-theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
      document.documentElement.classList.toggle("dark", storedTheme === "dark");
    }
  }, []);

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    window.localStorage.setItem("app-theme", newTheme);
    window.localStorage.setItem("public-theme", newTheme);
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    clearAuth();
    clearBrowserSessionData();
    router.push("/");
  };

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const navSections: NavSection[] = [
    {
      title: "Platform",
      items: [
        { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
        {
          label: "My Classroom",
          href: "/admin/classroom/attendance",
          icon: School,
          children: [
            { label: "Attendance", href: "/admin/classroom/attendance" },
            { label: "Assignments", href: "/admin/classroom/assignments" },
            { label: "Practice Exams", href: "/admin/classroom/practice-exams" },
            { label: "Exams & Results", href: "/admin/classroom/exams" },
            { label: "My Timetable", href: "/admin/classroom/my-timetable" },
            { label: "ID Card", href: "/admin/classroom/id-card" },
            { label: "My Fee", href: "/admin/classroom/fees" },
          ],
        },
        { label: "My Program", href: "/student/my-program", icon: GraduationCap, badge: "Enrolled" },
        {
          label: "My Institution",
          href: "/admin/institution/calendar",
          icon: Building,
          children: [
            { label: "Calendar", href: "/admin/institution/calendar" },
            { label: "Noticeboard", href: "/admin/institutions/news" },
            { label: "Complaints", href: "/admin/institution/complaints" },
          ],
        },
        {
          label: "Notifications",
          href: "/admin/notifications",
          icon: Bell,
          children: [
            { label: "All Alerts", href: "/admin/notifications" },
            { label: "Controls", href: "/admin/notifications/settings" },
          ],
        },
      ],
    },
    {
      title: "Academic & Learning",
      items: [
        { label: "Practice Tests", href: "/practice", icon: CheckSquare, badge: "Quizzes" },
        { label: "Lecture Notes", href: "/notes", icon: BookMarked },
        { label: "Explore Courses", href: "/courses", icon: BookOpen },
      ],
    },
    {
      title: "Campus & Services",
      items: [
        { label: "Hostels & Residence", href: "/hostels", icon: Building2 },
        { label: "Digital Libraries", href: "/libraries", icon: Library },
        { label: "Top Institutes", href: "/institutes", icon: Building2 },
        { label: "Expert Faculty", href: "/teachers", icon: UserCheck },
      ],
    },
  ];

  const getInitials = (name?: string | null) => {
    if (!name || !name.trim()) return "ST";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const initials = getInitials(user?.full_name);

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-zinc-950 flex font-sans text-foreground">
      {/* DESKTOP LEFT SIDEBAR */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border/80 bg-background/95 backdrop-blur-md sticky top-0 h-screen transition-all duration-300 z-40 shrink-0 shadow-xs",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* SIDEBAR HEADER / BRAND LOGO */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-border/60">
          <Link
            href="/student/dashboard"
            className={cn("flex items-center gap-2.5 overflow-hidden transition-all", sidebarCollapsed && "justify-center")}
          >
            <Image
              src="/icons/edubird.webp"
              alt="EduBird"
              width={34}
              height={34}
              className="h-8.5 w-8.5 object-contain shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="flex flex-col leading-none">
                <span className="font-black text-lg tracking-tight">
                  Edu<span className="text-primary">Bird</span>
                </span>
                <span className="text-[10px] font-bold text-primary tracking-wider uppercase mt-0.5">
                  Student Portal
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer outline-none"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* SIDEBAR NAVIGATION LINKS */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 no-scrollbar">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!sidebarCollapsed && (
                <p className="px-3 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">
                  {section.title}
                </p>
              )}
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const hasChildren = Boolean(item.children && item.children.length > 0);
                  const isExpanded = Boolean(expandedItems[item.label]);
                  const isParentActive =
                    pathname === item.href ||
                    (item.href !== "/student/dashboard" && item.href !== "/courses" && pathname.startsWith(item.href)) ||
                    (item.children && item.children.some((c) => pathname.startsWith(c.href)));

                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center">
                        <Link
                          href={item.href}
                          title={sidebarCollapsed ? item.label : undefined}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all group relative flex-1 min-w-0",
                            isParentActive
                              ? "bg-primary/10 text-primary font-extrabold"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
                            sidebarCollapsed && "justify-center px-0"
                          )}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", isParentActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                          {!sidebarCollapsed && <span className="truncate flex-1">{item.label}</span>}
                          {!sidebarCollapsed && item.badge && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[9px] px-1.5 py-0 font-bold shrink-0",
                                isParentActive ? "bg-primary text-white" : "bg-primary/10 text-primary"
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>

                        {hasChildren && !sidebarCollapsed && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.label)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            aria-label={`Toggle ${item.label}`}
                          >
                            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} />
                          </button>
                        )}
                      </div>

                      {/* CHILD SUB-ITEMS DROPDOWN */}
                      {hasChildren && isExpanded && !sidebarCollapsed && (
                        <div className="ml-6 pl-2 border-l border-border/60 space-y-1 pt-0.5 pb-1">
                          {item.children?.map((child) => {
                            const isChildActive = pathname === child.href || pathname.startsWith(child.href);
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  "block px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all truncate",
                                  isChildActive
                                    ? "bg-primary/10 text-primary font-bold"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                )}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* SIDEBAR FOOTER - USER PROFILE & LOGOUT */}
        <div className="p-3 border-t border-border/60 bg-muted/30">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-background border border-border/60 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground font-extrabold text-xs flex items-center justify-center shrink-0 ring-2 ring-primary/20">
                  {initials}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-extrabold text-foreground truncate">
                    {user?.full_name || "Demo Student"}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 truncate">
                    <ShieldCheck className="h-3 w-3 shrink-0" /> Enrolled Student
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full h-10 rounded-xl flex items-center justify-center text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* MOBILE DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative flex-1 max-w-xs w-full bg-background border-r border-border flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="h-16 px-4 flex items-center justify-between border-b border-border">
              <Link href="/student/dashboard" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Image src="/icons/edubird.webp" alt="EduBird" width={32} height={32} className="h-8 w-8 object-contain" />
                <span className="font-extrabold text-lg">Edu<span className="text-primary">Bird</span></span>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] font-bold">Student</Badge>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
              {navSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <p className="px-3 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </p>
                  <nav className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || (item.href !== "/student/dashboard" && pathname.startsWith(item.href));
                      return (
                        <div key={item.label} className="space-y-1">
                          <Link
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1">{item.label}</span>
                            {item.badge && (
                              <Badge variant="secondary" className="text-[9px] font-bold">
                                {item.badge}
                              </Badge>
                            )}
                          </Link>
                          {item.children && (
                            <div className="ml-6 space-y-1">
                              {item.children.map((child) => (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="block px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
                                >
                                  {child.label}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border">
              <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold truncate">{user?.full_name || "Demo Student"}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{user?.email || "student@edubird.com"}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-600" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP HEADER BAR COMBINING IMAGE 2 TOOLS & IMAGE 1 BRAND */}
        <header className="h-16 border-b border-border/80 bg-background/95 backdrop-blur-md sticky top-0 z-30 px-4 flex items-center justify-between gap-3 shadow-2xs">
          {/* LEFT: MOBILE TOGGLE & ACADEMIC SESSION SELECTOR */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* ACADEMIC SESSION SELECTOR DROPDOWN (IMAGE 2) */}
            <div className="shrink-0">
              <AdminAcademicSessionSelector />
            </div>

            <div className="hidden xl:flex items-center gap-2 text-xs font-bold text-muted-foreground border-l border-border/60 pl-3">
              <Link href="/student/dashboard" className="hover:text-primary transition-colors">Student Portal</Link>
              <span>/</span>
              <span className="text-foreground capitalize truncate max-w-[140px]">
                {pathname === "/student/dashboard"
                  ? "Dashboard"
                  : pathname.replace("/student/", "").replace("/admin/", "").replace("/", " - ").replace("-", " ")}
              </span>
            </div>
          </div>

          {/* RIGHT: NOTIFICATIONS, THEME TOGGLE & USER PROFILE MENU */}
          <div className="flex items-center gap-2 shrink-0">
            {/* REFRESH BUTTON */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => window.location.reload()}
              title="Reload Session Data"
              className="hidden sm:inline-flex cursor-pointer"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>

            {/* NOTIFICATION BELL CENTER (IMAGE 2) */}
            <AdminNotificationCenter />

            {/* THEME / DARK MODE TOGGLE (IMAGE 2) */}
            <AdminThemeToggle theme={theme} onThemeChange={handleThemeChange} />

            {/* USER PROFILE DROPDOWN */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-full hover:bg-muted transition-colors outline-none cursor-pointer">
                  <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground font-extrabold text-xs flex items-center justify-center ring-2 ring-primary/20 shrink-0">
                    {initials}
                  </div>
                  <span className="hidden lg:inline-block text-xs font-bold text-foreground max-w-[120px] truncate">
                    {user?.full_name || "Demo Student"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden lg:block" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56 p-1">
                <DropdownMenuLabel className="p-2">
                  <p className="text-xs font-bold text-foreground">{user?.full_name || "Demo Student"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email || "student@edubird.com"}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild className="cursor-pointer text-xs font-medium">
                  <Link href="/student/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                    Student Dashboard
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="cursor-pointer text-xs font-medium">
                  <Link href="/student/my-program" className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    My Enrolled Program
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="cursor-pointer text-xs font-medium">
                  <Link href="/admin/classroom/attendance" className="flex items-center gap-2">
                    <School className="h-4 w-4 text-primary" />
                    My Classroom
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-xs font-bold text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* MAIN BODY CONTENT */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* FOOTER */}
        <footer className="border-t border-border/80 bg-card py-4 text-center text-xs text-muted-foreground mt-auto">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>EduBird Student Portal &copy; 2026. All rights reserved.</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified Academic Student Account
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}



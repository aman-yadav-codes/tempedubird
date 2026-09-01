"use client";

import { useEffect, useState, useCallback } from "react";
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
  ChevronsUpDown,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  HelpCircle,
  School,
  Building,
  RefreshCw,
  Sun,
  Users,
  User,
  Settings,
  CalendarDays,
  Sparkles,
  Briefcase,
  ShoppingBag,
  MessageSquareHeart,
} from "lucide-react";
import { useAuthStore } from "@/store";
import { clearBrowserSessionData } from "@/lib/auth/clear-browser-session";
import {
  getStoredActiveStudentEnrollmentId,
  setStoredActiveStudentEnrollmentId,
  getStoredActiveStudentProfileId,
  setStoredActiveStudentProfileId,
  setStoredActiveStudentUserId,
} from "@/lib/auth/active-student-enrollment";
import {
  getStoredActiveInstitutionId,
  setStoredActiveInstitutionId,
} from "@/lib/auth/active-institution";
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
import { AccountSwitcherDialog } from "@/components/auth/account-switcher-dialog";
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

type ChildProfile = {
  student_profile_id: number;
  student_user_id: number;
  student_name: string;
  student_email: string;
  relationship: string;
  enrollment_id: number | null;
  program_title: string;
  institution_id: number | null;
  institution_name: string;
};

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, clearAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switchAccountOpen, setSwitchAccountOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    "Classroom & Academics": true,
    "Institution Portal": false,
    Notifications: false,
  });

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [childrenList, setChildrenList] = useState<ChildProfile[]>([]);
  const [activeChildId, setActiveChildId] = useState<number | null>(null);

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    window.localStorage.setItem("app-theme", newTheme);
    window.localStorage.setItem("public-theme", newTheme);
  };

  const fetchChildren = useCallback(async () => {
    if (!user) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/parent/children", { headers });
      if (res.ok) {
        const json = await res.json();
        const list = json.children || [];
        if (Array.isArray(list) && list.length > 0) {
          setChildrenList(list);
          const storedProfileId = getStoredActiveStudentProfileId();
          const selectedChild = list.find((c) => c.student_profile_id === storedProfileId) || list[0];
          setActiveChildId(selectedChild.student_profile_id);
          setStoredActiveStudentProfileId(selectedChild.student_profile_id);
          setStoredActiveStudentUserId(selectedChild.student_user_id);
          if (selectedChild.enrollment_id) {
            setStoredActiveStudentEnrollmentId(selectedChild.enrollment_id);
          }
          if (selectedChild.institution_id) {
            setStoredActiveInstitutionId(selectedChild.institution_id);
          }
        }
      }
    } catch {
      // ignore error
    }
  }, [user, accessToken]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

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

  const hasLinkedChildren = childrenList.length > 0;
  const activeChild =
    childrenList.find((c) => c.student_profile_id === activeChildId) ||
    childrenList[0];

  const navSections: NavSection[] = [
    {
      title: "Platform",
      items: [
        { label: "My Children", href: "/parent/children", icon: Users, badge: hasLinkedChildren ? `${childrenList.length}` : undefined },
        ...(hasLinkedChildren
          ? [
              {
                label: "Classroom & Academics",
                href: "/student/classroom/attendance",
                icon: School,
                children: [
                  { label: "Attendance", href: "/student/classroom/attendance" },
                  { label: "Assignments", href: "/student/classroom/assignments" },
                  { label: "Exams & Results", href: "/student/classroom/exams" },
                  { label: "Timetable", href: "/student/classroom/my-timetable" },
                  { label: "ID Card", href: "/student/classroom/id-card" },
                  { label: "Fee Management", href: "/student/classroom/fees" },
                ],
              },
            ]
          : []),
        { label: "My Enquiries", href: "/parent/enquiries", icon: HelpCircle },
        { label: "Reviews & Feedback", href: "/parent/reviews", icon: MessageSquareHeart },
        ...(hasLinkedChildren
          ? [
              {
                label: "Institution Portal",
                href: "/student/institution/calendar",
                icon: Building,
                children: [
                  { label: "Academic Calendar", href: "/student/institution/calendar" },
                  { label: "Noticeboard", href: "/student/institutions/news" },
                  { label: "Reviews & Feedback", href: "/parent/reviews" },
                  { label: "Complaints & Help", href: "/student/institution/complaints" },
                ],
              },
            ]
          : []),
        {
          label: "Notifications",
          href: "/student/notifications",
          icon: Bell,
          children: [
            { label: "All Alerts", href: "/student/notifications" },
            { label: "Settings", href: "/student/notifications/settings" },
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
        { label: "Academic Store", href: "/products", icon: ShoppingBag },
        { label: "Vendor Services", href: "/admin/vendors", icon: Briefcase },
      ],
    },
  ];

  const getInitials = (name?: string | null) => {
    if (!name || !name.trim()) return "GD";
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
            href="/parent/children"
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
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 tracking-wider uppercase mt-0.5">
                  Guardian Portal
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
                    (item.href !== "/parent/children" && item.href !== "/courses" && pathname.startsWith(item.href)) ||
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

        {/* SIDEBAR FOOTER: GUARDIAN PROFILE CARD */}
        <div className="p-3 border-t border-border/60 bg-muted/20">
          <div className={cn("flex items-center gap-2 p-2 rounded-xl border border-border/60 bg-card", sidebarCollapsed ? "justify-center" : "justify-between")}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                {initials}
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-xs font-bold truncate text-foreground">
                    {user?.full_name || "Guardian Account"}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground truncate">{user?.email || "guardian@edubird.com"}</span>
                    <Badge variant="secondary" className="text-[8px] py-0 px-1 font-bold bg-rose-500/10 text-rose-600">
                      Parent
                    </Badge>
                  </div>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                onClick={handleSignOut}
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
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
              <Link href="/parent/children" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Image src="/icons/edubird.webp" alt="EduBird" width={32} height={32} className="h-8 w-8 object-contain" />
                <span className="font-extrabold text-lg">Edu<span className="text-primary">Bird</span></span>
                <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 text-[10px] font-bold">Guardian</Badge>
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
                      const isActive = pathname === item.href || (item.href !== "/parent/children" && pathname.startsWith(item.href));
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
                  <div className="h-8 w-8 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold truncate">{user?.full_name || "Guardian Account"}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{user?.email || "guardian@edubird.com"}</span>
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
        {/* TOP HEADER BAR */}
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

            {/* ACADEMIC SESSION SELECTOR */}
            <div className="shrink-0">
              <AdminAcademicSessionSelector />
            </div>

            {/* ACTIVE CHILD SWITCHER (FOR GUARDIANS WITH MULTIPLE CHILDREN) */}
            {childrenList.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors cursor-pointer outline-none max-w-[220px]"
                    title="Switch Child Profile"
                  >
                    <Users className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                    <div className="flex flex-col text-left leading-none min-w-0">
                      <span className="truncate text-xs font-bold text-foreground">
                        {activeChild?.student_name || "Active Child"}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate font-normal">
                        {activeChild?.institution_name || "Enrolled Institution"}
                      </span>
                    </div>
                    <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-0.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-1.5 space-y-1 bg-card border-border shadow-xl rounded-xl">
                  <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    Switch Linked Child
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {childrenList.map((ch) => {
                    const isSel = ch.student_profile_id === activeChildId;
                    return (
                      <DropdownMenuItem
                        key={ch.student_profile_id}
                        onClick={() => {
                          setActiveChildId(ch.student_profile_id);
                          setStoredActiveStudentProfileId(ch.student_profile_id);
                          setStoredActiveStudentUserId(ch.student_user_id);
                          if (ch.enrollment_id) {
                            setStoredActiveStudentEnrollmentId(ch.enrollment_id);
                          }
                          if (ch.institution_id) {
                            setStoredActiveInstitutionId(ch.institution_id);
                          }
                          window.location.reload();
                        }}
                        className={cn(
                          "flex flex-col items-start gap-0.5 p-2 rounded-lg cursor-pointer",
                          isSel && "bg-rose-500/10 text-rose-600 font-bold"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-xs">{ch.student_name}</span>
                          {isSel && <Badge className="text-[9px] bg-rose-600 text-white">Active</Badge>}
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate max-w-full">
                          {ch.program_title} • {ch.institution_name}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* RIGHT: BROWSE COURSES, NOTIFICATIONS, THEME TOGGLE, & USER PROFILE */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Browse Courses link */}
            <Link href="/courses">
              <Button
                variant="outline"
                size="sm"
                className="hidden lg:flex items-center gap-1.5 text-xs font-bold h-9 px-3 rounded-xl border-border bg-card hover:bg-muted"
              >
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span>Browse Courses</span>
              </Button>
            </Link>

            {/* Notification Center */}
            <AdminNotificationCenter />

            {/* Theme Toggle */}
            <AdminThemeToggle theme={theme} onThemeChange={handleThemeChange} />

            {/* Guardian Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-muted border border-border/80 transition-colors cursor-pointer outline-none"
                  aria-label="User Profile Menu"
                >
                  <div className="h-7 w-7 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center">
                    {initials}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block mr-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 space-y-1 bg-card border-border shadow-xl rounded-xl">
                <DropdownMenuLabel className="p-2 font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-bold leading-none text-foreground">{user?.full_name || "Guardian Account"}</p>
                    <p className="text-[11px] leading-none text-muted-foreground truncate">{user?.email || "guardian@edubird.com"}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-lg text-xs font-medium cursor-pointer">
                  <Link href="/parent/children" className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-rose-600" />
                    My Children
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg text-xs font-medium cursor-pointer">
                  <Link href="/courses" className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    Browse Courses
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSwitchAccountOpen(true)}
                  className="rounded-lg text-xs font-bold text-primary hover:bg-primary/10 cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-rose-600" />
                    <span>Switch Account</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-normal">All Roles</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="rounded-lg text-xs font-bold text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer flex items-center gap-2"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* MAIN BODY VIEW */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/50 dark:bg-zinc-950">
          {children}
        </main>

        {/* Multi-Role Account Switcher Dialog */}
        <AccountSwitcherDialog
          open={switchAccountOpen}
          onOpenChange={setSwitchAccountOpen}
        />
      </div>
    </div>
  );
}

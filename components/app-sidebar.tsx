"use client";

import NextImage from "next/image";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    LayoutDashboard,
    LayoutGrid,
    Users,
    UsersRound,
    BarChart3,
    FileText,
    Bell,
    Settings,
    ChevronsUpDown,
    LogOut,
    BadgeCheck,
    CreditCard,
    Sparkles,
    ChevronRight,
    UserCog,
    UserCheck,
    BadgeDollarSign,
    IndianRupee,
    TrendingUp,
    PieChart,
    Image,
    BellRing,
    BellOff,
    Lock,
    Palette,
    Loader2,
    FolderTree,
    BookOpen,
    BookCheck,
    GraduationCap,
    Briefcase,
    Edit2,
    Globe,
    MapPin,
    Building,
    ChartNoAxesColumnIncreasing,
    Radar,
    ShieldCheck,
    ClipboardCheck,
    ClipboardList,
    Trophy,
    FileCheck2,
    IdCard,
    LibraryBig,
    CalendarDays,
    StickyNote,
    LifeBuoy,
    MessageSquareWarning,
    School,
    HelpCircle,
    Megaphone,
    Trash2,
    Building2,
    Info,
    Mail,
    Copyright,
    RefreshCw,
    Share2,
    Percent,
    FileSignature,
    ShoppingBag,
    Search,
} from "lucide-react";
import { toast } from "sonner";
import { readJsonResponse } from "@/lib/api/read-json-response";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    getStoredActiveInstitutionId,
    getUserInstitutionOptions,
    setStoredActiveInstitutionId,
} from "@/lib/auth/active-institution";
import {
    getStoredActiveChildStudentId,
    getStoredParentChildren,
    setStoredActiveChildStudentId,
    setStoredParentChildren,
    type ActiveChildSummary,
} from "@/lib/auth/active-child";
import {
    getStoredActiveStudentEnrollmentId,
    getStoredStudentDefaultAcademicYearId,
    setStoredActiveStudentEnrollmentId,
    setStoredStudentDefaultAcademicYearId,
    type ActiveStudentEnrollment,
} from "@/lib/auth/active-student-enrollment";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/store";
import { clearBrowserSessionData } from "@/lib/auth/clear-browser-session";
import {
    adminPathMatchesRoute,
    hasAdminPagePermission,
    isAdminPathVisibleForRole,
    normalizeAdminPath,
} from "@/lib/auth/permissions";
import { toCanonicalAdminPath, toRoleRoutePath } from "@/lib/auth/role-routes";

const navItems: SidebarItem[] = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    {
        title: "Users",
        url: "/admin/users",
        icon: Users,
        children: [
            { title: "All Users", url: "/admin/users", icon: UsersRound },
        ],
    },
    {
        title: "Roles & Permissions",
        url: "/admin/access-control",
        icon: ShieldCheck,
        children: [
            { title: "Scope Types", url: "/admin/access-control?section=scope-types", permissionPath: "/admin/access-control/scope-types", icon: ShieldCheck },
            { title: "Permissions", url: "/admin/access-control?section=permissions", permissionPath: "/admin/access-control/permissions", icon: ShieldCheck },
            { title: "Roles", url: "/admin/access-control?section=roles", permissionPath: "/admin/access-control/roles", icon: UserCog },
            { title: "Role Permissions", url: "/admin/access-control?section=role-permissions", permissionPath: "/admin/access-control/role-permissions", icon: ShieldCheck },
            { title: "Institution Memberships", url: "/admin/access-control?section=institution-memberships", permissionPath: "/admin/access-control/institution-memberships", icon: Building },
            { title: "Institution Role Permissions", url: "/admin/access-control?section=institution-role-permissions", permissionPath: "/admin/access-control/institution-role-permissions", icon: ShieldCheck },
        ],
    },
    {
        title: "Manage Students",
        url: "/admin/students",
        icon: GraduationCap,
        children: [
            { title: "All Students", url: "/admin/students", icon: GraduationCap },
            { title: "Fee Management", url: "/admin/students/fee-management", icon: CreditCard },
            { title: "Attendance", url: "/admin/students/attendance", icon: ClipboardCheck },
            { title: "Achievements", url: "/admin/students/achievements", icon: Trophy },
            { title: "Assignments", url: "/admin/students/assignments", icon: ClipboardList },
            { title: "Exams", url: "/admin/students/exams", icon: FileText },
            { title: "Practice", url: "/admin/students/practice", icon: ClipboardCheck },
            { title: "Result", url: "/admin/students/result", icon: FileCheck2 },
            { title: "TC", url: "/admin/students/tc", icon: FileCheck2 },
            { title: "Cards", url: "/admin/students/cards", icon: IdCard },
            { title: "Notes", url: "/admin/students/notes", icon: StickyNote },
        ],
    },
    {
        title: "Manage Staff",
        url: "/admin/staff",
        icon: Users,
        children: [
            { title: "All Staff", url: "/admin/staff", icon: UsersRound },
            { title: "Task Management", url: "/admin/operations/tasks", icon: ClipboardList },
            { title: "Attendance", url: "/admin/staff/attendance", icon: ClipboardCheck },
            { title: "Salary", url: "/admin/staff/salary", icon: IndianRupee },
            { title: "Queries", url: "/admin/staff/queries", icon: HelpCircle },
            { title: "Salary Slip", url: "/admin/staff/salary-slips", icon: CreditCard },
            { title: "Holiday", url: "/admin/staff/holidays", icon: CalendarDays },
            { title: "Offer Letter", url: "/admin/staff/offer-letters", icon: Mail },
            { title: "Certificate", url: "/admin/staff/certificates", icon: BadgeCheck },
            { title: "Experience Letter", url: "/admin/staff/experience-letters", icon: FileCheck2 },
            { title: "Our Jobs", url: "/admin/staff/jobs", icon: Briefcase },
            { title: "Applicant", url: "/admin/staff/applicants", icon: UserCheck },
            { title: "Appreciation Certificate", url: "/admin/staff/appreciation-certificates", icon: Trophy },
        ],
    },
    {
        title: "My Classroom",
        url: "/admin/classroom/attendance",
        icon: School,
          children: [
            { title: "Attendance", url: "/admin/classroom/attendance", icon: ClipboardCheck },
            { title: "Achievements", url: "/admin/classroom/achievements", icon: Trophy },
            { title: "Assignments", url: "/admin/classroom/assignments", icon: ClipboardList },
            { title: "Practice Exams", url: "/admin/classroom/practice-exams", icon: ClipboardCheck },
            { title: "Exams", url: "/admin/classroom/exams", icon: FileText },
            { title: "Results", url: "/admin/classroom/results", icon: FileCheck2 },
            { title: "My Timetable", url: "/admin/classroom/my-timetable", icon: CalendarDays },
            { title: "ID Card", url: "/admin/classroom/id-card", icon: IdCard },
            { title: "My Fee", url: "/admin/classroom/fees", icon: CreditCard },
            { title: "Notes", url: "/admin/students/notes", icon: StickyNote },
          ],
      },
    {
        title: "My Program",
        url: "/admin/my-program",
        icon: LibraryBig,
    },
    {
        title: "My Institution",
        url: "/admin/institution/calendar",
        icon: Building,
        children: [
            { title: "Institution Calendar", url: "/admin/institution/calendar", icon: CalendarDays },
            { title: "My Attendance", url: "/admin/institution/my-attendance", icon: ClipboardCheck },
            { title: "My Salary", url: "/admin/institution/my-salary", icon: IndianRupee },
            { title: "My Letters", url: "/admin/institution/my-letters", icon: FileText },
            { title: "Noticeboard", url: "/admin/institutions/news", icon: Bell },
            { title: "Complaints", url: "/admin/institution/complaints", icon: MessageSquareWarning },
        ],
    },
    {
        title: "Finance",
        url: "/admin/finance/income",
        icon: IndianRupee,
        children: [
            { title: "Income", url: "/admin/finance/income", icon: TrendingUp },
            { title: "Expense", url: "/admin/finance/expense", icon: CreditCard },
            { title: "Invoice", url: "/admin/finance/invoice", icon: FileText },
            { title: "Allowance", url: "/admin/finance/allowance", icon: BadgeDollarSign },
            { title: "Recurring Expenses", url: "/admin/finance/recurring-expenses", icon: CalendarDays },
            { title: "Financial Performance", url: "/admin/finance/performance", icon: BarChart3 },
        ],
    },
    {
        title: "Sales & Marketing",
        url: "/admin/marketing/packages",
        icon: Megaphone,
        children: [
            { title: "Products", url: "/admin/marketing/products", icon: ShoppingBag },
            { title: "Pricing Packages", url: "/admin/marketing/packages", icon: CreditCard },
            { title: "Social Media", url: "/admin/marketing/social-media", icon: Share2 },
            { title: "Form Builder", url: "/admin/marketing/form-builder", icon: FileText },
            { title: "Email Template Builder", url: "/admin/marketing/email-templates", icon: Mail },
            { title: "Ads Builder", url: "/admin/marketing/ads-builder", icon: Megaphone },
            { title: "New Offers", url: "/admin/marketing/offers", icon: Sparkles },
            { title: "Business Analytics", url: "/admin/marketing/business-analytics", icon: BarChart3 },
            { title: "Search History", url: "/admin/marketing/search-history", icon: Search },
            { title: "SEO & Meta Tags", url: "/admin/marketing/seo", icon: Globe },
        ],
    },
    {
        title: "Sales",
        url: "/admin/sales/pipeline",
        icon: BadgeDollarSign,
        children: [
            { title: "Clients", url: "/admin/sales/clients", icon: UsersRound },
            { title: "Enrollments", url: "/admin/sales/enrollments", icon: GraduationCap },
            { title: "Pipeline", url: "/admin/sales/pipeline", icon: TrendingUp },
            { title: "Proposals", url: "/admin/sales/proposals", icon: FileSignature },
            { title: "Enquiry", url: "/admin/sales/enquiries", icon: Mail },
            { title: "Commissions", url: "/admin/sales/commissions", icon: Percent },
        ],
    },
    {
        title: "Content",
        url: "/admin/content",
        icon: FileText,
        children: [
            { title: "Category Tree", url: "/admin/content/tree", icon: FolderTree },
            { title: "Manage Categories", url: "/admin/content/categories", icon: Edit2 },
            { title: "Boards", url: "/admin/content/boards", icon: BookOpen },
            { title: "Universities", url: "/admin/content/universities", icon: Building2 },
            { title: "Affiliated By / Certifications", url: "/admin/content/certifications", icon: BadgeCheck },
            { title: "Subjects", url: "/admin/content/subjects", icon: GraduationCap },
            { title: "Courses & Programs", url: "/admin/content/courses", icon: BookCheck },
            { title: "Syllabus", url: "/admin/content/syllabus", icon: BookOpen },
            { title: "Assignments", url: "/admin/content/assignments", icon: ClipboardList },
            { title: "Practice Exams", url: "/admin/content/practice-exams", icon: ClipboardCheck },
            { title: "Exams", url: "/admin/content/exams", icon: FileText },
            { title: "Notes", url: "/admin/content/notes", icon: StickyNote },
            { title: "Blog", url: "/admin/content/blog", icon: FileText },
            { title: "Media", url: "/admin/content/media", icon: Image },
        ],
    },
    {
        title: "Master Data",
        url: "/admin/master-data",
        icon: Briefcase,
        children: [
            { title: "Overview Hub", url: "/admin/master-data", icon: LayoutGrid },
            { title: "Skills", url: "/admin/master-data/skills", icon: BookOpen },
            { title: "Designations", url: "/admin/master-data/designations", icon: UserCog },
            { title: "Locations", url: "/admin/master-data/locations", icon: MapPin },
            { title: "Card Categories", url: "/admin/master-data/card-categories", icon: LibraryBig },
            { title: "Card Templates", url: "/admin/master-data/card-templates", icon: IdCard },
            { title: "Default Calendar", url: "/admin/master-data/default-calendar", icon: CalendarDays },
            { title: "Institute Calendar", url: "/admin/master-data/institute-calendar", icon: CalendarDays },
            { title: "Timetable Setup", url: "/admin/master-data/timetable-setup", icon: CalendarDays },
            { title: "Attendance Setup", url: "/admin/master-data/attendance-setup", icon: ClipboardCheck },
        ],
    },

    {
        title: "Institutions",
        url: "/admin/institutions",
        icon: Building,
        children: [
            {
                title: "All Institutions",
                url: "/admin/institutions/list",
                icon: Building,
            },
            {
                title: "Institution Types",
                url: "/admin/institutions/types",
                icon: Building,
            },
            {
                title: "Institution Subtypes",
                url: "/admin/institutions/subtypes",
                icon: Building,
            },
            {
                title: "Program Types",
                url: "/admin/institutions/program-types",
                icon: BookOpen,
            },
            {
                title: "Programs",
                url: "/admin/institutions/programs",
                icon: GraduationCap,
            },
            {
                title: "Placements",
                url: "/admin/institutions/placements",
                icon: TrendingUp,
            },
            {
                title: "Facilities",
                url: "/admin/institutions/facilities",
                icon: Building,
            },
            {
                title: "Facility Types",
                url: "/admin/institutions/facility-types",
                icon: Building,
            },
            {
                title: "Languages",
                url: "/admin/institutions/languages",
                icon: BookOpen,
            },
            {
                title: "Academic Sessions",
                url: "/admin/institutions/academic-years",
                icon: CalendarDays,
            },
            {
                title: "Institution Cutoffs",
                url: "/admin/institutions/cutoffs",
                icon: ChartNoAxesColumnIncreasing,
            },
            {
                title: "Scholarships",
                url: "/admin/institutions/scholarships",
                icon: Trophy,
            },
            {
                title: "Institute Calendar",
                url: "/admin/master-data/institute-calendar",
                icon: CalendarDays,
            },
            {
                title: "Timetable Setup",
                url: "/admin/master-data/timetable-setup",
                icon: CalendarDays,
            },
            {
                title: "Noticeboard",
                url: "/admin/institutions/news",
                icon: Bell,
            },
            {
                title: "Complaints",
                url: "/admin/institution/complaints",
                icon: MessageSquareWarning,
            },
        ],
    },
    {
        title: "Notifications",
        url: "/admin/notifications",
        permissionPath: "/admin/notifications",
        icon: Bell,
        children: [
            { title: "All", url: "/admin/notifications", permissionPath: "/admin/notifications", icon: BellRing },
            { title: "Muted", url: "/admin/notifications/muted", permissionPath: "/admin/notifications/muted", icon: BellOff },
            { title: "Controls", url: "/admin/notifications/settings", permissionPath: "/admin/notifications/settings", icon: Settings },
        ],
    },
    {
        title: "Support",
        url: "/admin/support",
        icon: LifeBuoy,
    },
    {
        title: "Tracker",
        url: "/admin/tracker",
        icon: Radar,
        children: [
            { title: "History", url: "/admin/tracker", icon: Radar },
        ],
    },
    {
        title: "Settings",
        url: "/admin/settings",
        icon: Settings,
        children: [
            { title: "General", url: "/admin/settings", icon: Palette },
            { title: "Tracker", url: "/admin/settings/tracker", icon: Radar },
            { title: "Notifications", url: "/admin/settings/notifications", icon: Bell },
            { title: "Payments", url: "/admin/settings/payments", icon: CreditCard },
            { title: "Subscription", url: "/admin/settings/subscription", icon: BadgeDollarSign },
            { title: "AI Settings", url: "/admin/ai-settings", icon: Sparkles },
            { title: "Security", url: "/admin/settings/security", icon: Lock },
            { title: "Recycle Bin", url: "/admin/settings/recycle-bin", icon: Trash2 },
            {
                title: "Help Center",
                url: "/admin/settings/help-center",
                icon: HelpCircle,
                children: [
                    { title: "Categories", url: "/admin/settings/help-center/categories", icon: FolderTree },
                    { title: "Articles", url: "/admin/settings/help-center/articles", icon: BookOpen },
                    { title: "Recent Updates", url: "/admin/settings/help-center/updates", icon: Megaphone },
                    { title: "Analytics", url: "/admin/settings/help-center/analytics", icon: BarChart3 },
                ],
            },
        ],
    },
    {
        title: "Vendors",
        url: "/admin/vendors",
        icon: Briefcase,
    },
    {
        title: "Company & Legal",
        url: "/admin/company?tab=contact-branches",
        permissionPath: "/admin/company",
        icon: Building2,
        children: [
            { title: "Contact & Branches", url: "/admin/company?tab=contact-branches", icon: MapPin },
            { title: "Payment Methods", url: "/admin/company?tab=payment-methods", icon: CreditCard },
            { title: "FAQs", url: "/admin/company?tab=faqs", icon: HelpCircle },
            { title: "Privacy Policy", url: "/admin/company?tab=privacy-policy", icon: ShieldCheck },
            { title: "Terms & Conditions", url: "/admin/company?tab=terms-and-conditions", icon: FileText },
            { title: "Copyright Policy", url: "/admin/company?tab=copyright-policy", icon: Copyright },
            { title: "Refund Policy", url: "/admin/company?tab=refund-policy", icon: RefreshCw },
            { title: "Social Media Links", url: "/admin/company?tab=social-links", icon: Share2 },
        ],
    },
];

interface SidebarItem {
    title: string;
    url: string;
    permissionPath?: string;
    icon?: ComponentType<{ className?: string }>;
    children?: SidebarItem[];
    badge?: string;
}

function getActiveSidebarLeaf(
    items: SidebarItem[],
    pathname: string,
    searchSection?: string | null
): string | null {
    const matches: Array<{ key: string; pathLength: number }> = [];

    const visit = (item: SidebarItem) => {
        if (item.children?.length) {
            item.children.forEach(visit);
            return;
        }

        const key = item.permissionPath ?? item.url;
        if (item.permissionPath?.startsWith("/admin/access-control/")) {
            if (
                normalizeAdminPath(pathname) === "/admin/access-control" &&
                item.url.includes(`section=${searchSection ?? ""}`)
            ) {
                matches.push({ key, pathLength: item.permissionPath.length });
            }
            return;
        }

        const itemPath = item.url.split("?")[0];
        if (adminPathMatchesRoute(pathname, itemPath)) {
            matches.push({ key, pathLength: normalizeAdminPath(itemPath).length });
        }
    };

    items.forEach(visit);
    matches.sort((a, b) => b.pathLength - a.pathLength);
    return matches[0]?.key ?? null;
}

function isPathActive(item: SidebarItem, activeLeaf: string | null): boolean {
    if (item.children?.length) {
        return item.children.some((child) => isPathActive(child, activeLeaf));
    }

    return (item.permissionPath ?? item.url) === activeLeaf;
}

function filterNavItems(
    items: SidebarItem[],
    canPage: (pathname: string) => boolean
): SidebarItem[] {
    return items
        .map((item) => {
            const children = item.children
                ? filterNavItems(
                    item.children,
                    canPage
                )
                : undefined;
            const itemAllowed = canPage(item.permissionPath ?? item.url);

            if (!itemAllowed && (!children || children.length === 0)) {
                return null;
            }

            return children ? { ...item, children } : item;
        })
        .filter((item): item is SidebarItem => item !== null);
}

export function AppSidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, accessToken, clearAuth } = useAuthStore();
    const canonicalPathname = toCanonicalAdminPath(pathname);
    const roleHref = (url: string) => toRoleRoutePath(url, user);
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const isPlatformAdmin = Boolean(user?.role_codes?.includes("platform_admin") || user?.is_super_admin);
    const isInstitutionAdmin = Boolean(user?.role_codes?.includes("institution_admin") && !isPlatformAdmin);
    const isParent = Boolean(user?.role_codes?.includes("parent") && !isPlatformAdmin && !isInstitutionAdmin);
    const isStudent = Boolean((user?.role_codes?.includes("student") || (user as any)?.roles?.includes("student") || user?.primary_role === "student") && !isPlatformAdmin && !isInstitutionAdmin && !isParent);
    const isRoleInstitutionUser = Boolean(!isPlatformAdmin && !isInstitutionAdmin && user?.role_codes?.some((role) => ["student", "teacher", "parent", "driver"].includes(role)));
    const [activeInstitutionId, setActiveInstitutionId] = useState<number | null>(() => {
        return getStoredActiveInstitutionId();
    });
    const [parentChildren, setParentChildren] = useState<ActiveChildSummary[]>(() => {
        return getStoredParentChildren();
    });
    const [activeChildStudentId, setActiveChildStudentId] = useState<number | null>(() => {
        return getStoredActiveChildStudentId();
    });
    const [studentEnrollments, setStudentEnrollments] = useState<ActiveStudentEnrollment[]>([]);
    const [activeStudentEnrollmentId, setActiveStudentEnrollmentId] = useState<number | null>(() =>
        getStoredActiveStudentEnrollmentId()
    );
    const userInstitutionOptions = useMemo(() => getUserInstitutionOptions(user), [user]);
    const institutionTeams = useMemo(() => {
        if (!isInstitutionAdmin) return [];
        return userInstitutionOptions;
    }, [isInstitutionAdmin, userInstitutionOptions]);
    const staffInstitution = useMemo(() => {
        if (isPlatformAdmin || isInstitutionAdmin || isParent || isStudent) return null;
        return (
            userInstitutionOptions.find((institution) =>
                institution.roleName?.toLowerCase() === "teacher"
            ) ??
            userInstitutionOptions[0] ??
            null
        );
    }, [isInstitutionAdmin, isParent, isPlatformAdmin, isStudent, userInstitutionOptions]);
    const activeInstitution =
        institutionTeams.find((membership) => membership.id === activeInstitutionId) ??
        institutionTeams[0] ??
        null;
    const activeInstitutionStorageId = activeInstitution?.id ?? null;
    const activeChild =
        parentChildren.find((child) => child.studentId === activeChildStudentId) ??
        parentChildren[0] ??
        null;
    const activeChildStorageId = activeChild?.studentId ?? null;
    const studentInstitution = user?.memberships?.find((membership) =>
        membership.role_code === "student" &&
        membership.institution_id &&
        membership.institution_name
    ) ?? null;
    const activeStudentEnrollment =
        studentEnrollments.find((enrollment) => enrollment.id === activeStudentEnrollmentId) ??
        studentEnrollments[0] ??
        null;
    const canPage = useCallback((pathname: string) => (
        isAdminPathVisibleForRole(user, pathname) &&
        hasAdminPagePermission(user, pathname)
    ), [user]);
    const roleAwareNavItems = useMemo(
        () => navItems.flatMap((item) => {
            if (!isStudent && item.url === "/admin/my-program") {
                return [];
            }
            if (isInstitutionAdmin && item.url === "/admin/master-data") {
                return [];
            }
            if (item.url === "/admin/marketing/packages") {
                return isPlatformAdmin || isInstitutionAdmin ? [item] : [];
            }
            if (item.url === "/admin/content" && item.children) {
                if (isInstitutionAdmin) {
                    const institutionExcludedUrls = new Set([
                        "/admin/content/tree",
                        "/admin/content/categories",
                        "/admin/content/boards",
                        "/admin/content/universities",
                        "/admin/content/certifications",
                        "/admin/content/subjects",
                        "/admin/content/courses",
                        "/admin/content/syllabus",
                    ]);
                    return [{
                        ...item,
                        children: item.children.filter((child) => !institutionExcludedUrls.has(child.url)),
                    }];
                }
                return isPlatformAdmin ? [item] : [];
            }
            if (item.url === "/admin/sales/leads") {
                return isPlatformAdmin || isInstitutionAdmin ? [item] : [];
            }
            if (isRoleInstitutionUser && item.url === "/admin/institutions") {
                return [];
            }
            if (isInstitutionAdmin && item.url === "/admin/institution/calendar") {
                return [{ ...item, children: [] }];
            }
            if (isInstitutionAdmin && item.url === "/admin/classroom/attendance") {
                return [];
            }
            if (item.url === "/admin/classroom/attendance") {
                return [{
                    ...item,
                    title: isParent ? "Child Classroom" : "My Classroom",
                    children: isParent && item.children
                        ? item.children.map((child) => ({
                            ...child,
                            title: child.title === "My Timetable"
                                ? "Timetable"
                                : child.title === "My Fee"
                                  ? "Child Fee"
                                : child.title,
                        }))
                        : item.children,
                }];
            }
            if (isStudent && item.url === "/admin/students" && item.children) {
                return [{
                    ...item,
                    children: item.children.filter((child) => child.url !== "/admin/students/notes"),
                }];
            }
            if (item.url === "/admin/institution/calendar" && isParent) {
                return [{ ...item, title: "Institution" }];
            }
            if (item.url === "/admin/notifications") {
                const children = (item.children ?? []).filter((child) => canPage(child.permissionPath ?? child.url));
                return children.length > 0 ? [{ ...item, children }] : [];
            }
            if (item.url === "/admin/institutions" && item.children) {
                return [{
                    ...item,
                    children: item.children.filter((child) => {
                        if (!isInstitutionAdmin && child.url === "/admin/institution/complaints") return false;
                        if ((isStudent || isParent) && child.url === "/admin/institutions/news") return false;
                        return true;
                    }),
                }];
            }
            if (item.url === "/admin/settings" && item.children) {
                return [{
                    ...item,
                    children: item.children.filter((child) => {
                        if (child.url === "/admin/settings/subscription") return isPlatformAdmin || isInstitutionAdmin;
                        return true;
                    }),
                }];
            }
            return [item];
        }),
        [canPage, isInstitutionAdmin, isParent, isPlatformAdmin, isRoleInstitutionUser, isStudent]
    );
    const visibleNavItems = filterNavItems(
        roleAwareNavItems,
        canPage
    );
    const activeSidebarLeaf = getActiveSidebarLeaf(
        visibleNavItems,
        canonicalPathname,
        searchParams.get("section")
    );

    const displayName = user?.full_name ?? "Admin";
    const displayEmail = user?.primary_role ?? "";
    const initials = displayName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    const activeWorkspaceName = isParent
        ? activeChild?.name ?? "EduBird"
        : isStudent
            ? activeStudentEnrollment?.institutionName ?? studentInstitution?.institution_name ?? "EduBird"
        : staffInstitution
            ? staffInstitution.name
        : activeInstitution?.name ?? "EduBird";
    const activeWorkspaceRole = isParent
        ? activeChild?.institutionName ?? "Parent"
        : isStudent
            ? activeStudentEnrollment
                ? `${activeStudentEnrollment.programName}${activeStudentEnrollment.sectionName ? ` · ${activeStudentEnrollment.sectionName}` : ""}`
                : "Student"
        : staffInstitution
            ? staffInstitution.roleName ?? displayEmail ?? "Staff"
        : activeInstitution?.roleName ?? "Platform";
    const activeWorkspaceInitial = (activeWorkspaceName[0] ?? "E").toUpperCase();
    const canSwitchInstitution = isInstitutionAdmin && institutionTeams.length > 1;
    const canSwitchChild = isParent && parentChildren.length > 1;
    const canSwitchStudentEnrollment = isStudent && studentEnrollments.length > 1;

    useEffect(() => {
        if (!activeInstitutionStorageId) return;
        setStoredActiveInstitutionId(activeInstitutionStorageId);
    }, [activeInstitutionStorageId]);

    useEffect(() => {
        if (!isParent || !accessToken) return;

        let cancelled = false;
        type ChildLoadError = Error & { status?: number };
        async function loadChildren() {
            try {
                const res = await fetch("/api/admin/parent/children", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    cache: "no-store",
                });
                const json = await readJsonResponse<{ data?: any[]; error?: string }>(res);
                if (!res.ok) {
                    const error = new Error(json.error ?? "Failed to load children") as ChildLoadError;
                    error.status = res.status;
                    throw error;
                }
                if (!cancelled) {
                    const children = json.data ?? [];
                    setParentChildren(children);
                    setStoredParentChildren(children);
                }
            } catch (err) {
                if (!cancelled) {
                    const cachedChildren = getStoredParentChildren();
                    if (cachedChildren.length > 0) {
                        setParentChildren(cachedChildren);
                        return;
                    }
                    setParentChildren([]);
                    const status = err instanceof Error ? (err as ChildLoadError).status : undefined;
                    if (status !== 404) {
                        toast.error(err instanceof Error ? err.message : "Failed to load children");
                    }
                }
            }
        }

        void loadChildren();
        return () => {
            cancelled = true;
        };
    }, [accessToken, isParent]);

    useEffect(() => {
        if (!activeChildStorageId) return;
        setStoredActiveChildStudentId(activeChildStorageId);
    }, [activeChildStorageId]);

    useEffect(() => {
        if (!isStudent || !accessToken) return;
        let cancelled = false;
        void fetch("/api/admin/student/enrollments", {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
        })
            .then(async (response) => {
                const json = await readJsonResponse<{ data?: ActiveStudentEnrollment[]; error?: string }>(response);
                if (!response.ok) throw new Error(json.error ?? "Failed to load enrollments");
                if (cancelled) return;
                const enrollments = (json.data ?? []) as ActiveStudentEnrollment[];
                setStudentEnrollments(enrollments);
                const storedId = getStoredActiveStudentEnrollmentId();
                const defaultSource = enrollments.find((item) => item.institutionDefaultAcademicYearId) ?? null;
                const institutionDefaultAcademicYearId = defaultSource?.institutionDefaultAcademicYearId ?? null;
                const institutionDefault = institutionDefaultAcademicYearId
                    ? enrollments.find((item) => item.academicYearId === institutionDefaultAcademicYearId) ?? null
                    : null;
                const storedDefaultAcademicYearId = defaultSource
                    ? getStoredStudentDefaultAcademicYearId(defaultSource.institutionId)
                    : null;
                const stored = enrollments.find((item) => item.id === storedId) ?? null;
                const shouldUseInstitutionDefault =
                    !stored && Boolean(institutionDefault) && storedDefaultAcademicYearId !== institutionDefaultAcademicYearId;
                const selected = shouldUseInstitutionDefault
                    ? institutionDefault
                    : stored ?? institutionDefault ?? enrollments[0];
                if (selected) {
                    setActiveStudentEnrollmentId(selected.id);
                    if (selected.id !== storedId) {
                        setStoredActiveStudentEnrollmentId(selected.id);
                    }
                }
                if (defaultSource && institutionDefaultAcademicYearId) {
                    setStoredStudentDefaultAcademicYearId(defaultSource.institutionId, institutionDefaultAcademicYearId);
                }
            })
            .catch((error) => {
                if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load enrollments");
            });
        return () => { cancelled = true; };
    }, [accessToken, isStudent]);

    function selectActiveInstitution(institutionId: number) {
        if (institutionId === activeInstitutionStorageId) return;
        setActiveInstitutionId(institutionId);
        setStoredActiveInstitutionId(institutionId);
        window.setTimeout(() => {
            window.location.reload();
        }, 50);
    }

    function selectActiveChild(studentId: number) {
        if (studentId === activeChildStorageId) return;
        setActiveChildStudentId(studentId);
        setStoredActiveChildStudentId(studentId);
        window.setTimeout(() => {
            window.location.reload();
        }, 50);
    }

    function selectStudentEnrollment(enrollmentId: number) {
        if (enrollmentId === activeStudentEnrollment?.id) return;
        const target = studentEnrollments.find((item) => item.id === enrollmentId);
        setActiveStudentEnrollmentId(enrollmentId);
        setStoredActiveStudentEnrollmentId(enrollmentId);
        if (target?.institutionId) {
            setActiveInstitutionId(target.institutionId);
            setStoredActiveInstitutionId(target.institutionId);
        }
        window.setTimeout(() => {
            window.location.reload();
        }, 50);
    }

    async function confirmLogout() {
        setIsLoggingOut(true);
        setLogoutOpen(false);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } finally {
            clearAuth();
            clearBrowserSessionData();
            toast.success("You have been signed out.");
            window.location.href = "/";
        }
    }

    return (
        <>
            <Sidebar collapsible="icon">
                <SidebarHeader className="border-b border-sidebar-border/60 pb-2">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            {canSwitchInstitution || canSwitchChild || canSwitchStudentEnrollment ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton
                                            size="lg"
                                            className="data-[state=open]:bg-destructive/15 data-[state=open]:text-destructive"
                                        >
                                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-destructive text-xs font-bold text-destructive-foreground">
                                                {activeWorkspaceInitial}
                                            </div>
                                            <div className="grid flex-1 text-left text-sm leading-tight">
                                                <span className="truncate font-semibold">{activeWorkspaceName}</span>
                                                <span className="truncate text-xs text-muted-foreground">{activeWorkspaceRole}</span>
                                            </div>
                                            <ChevronsUpDown className="ml-auto size-4" />
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(var(--sidebar-width)-1rem)] rounded-lg"
                                        align="start"
                                        side="bottom"
                                        sideOffset={4}
                                    >
                                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                                            {canSwitchChild ? "Children" : canSwitchStudentEnrollment ? "Enrolled Institutions & Programs" : "Institutions"}
                                        </DropdownMenuLabel>
                                        {canSwitchChild
                                            ? parentChildren.map((child) => (
                                                <DropdownMenuCheckboxItem
                                                    key={child.studentId}
                                                    checked={child.studentId === activeChildStorageId}
                                                    onCheckedChange={() => selectActiveChild(child.studentId)}
                                                    onSelect={(event) => event.preventDefault()}
                                                    className="min-w-0 gap-2 p-2"
                                                >
                                                    <div className="flex w-full min-w-0 flex-col pl-1">
                                                        <span className="truncate text-sm font-medium">
                                                            {child.name}
                                                        </span>
                                                        <span className="truncate text-xs text-muted-foreground">
                                                            {child.institutionName ?? child.relationship ?? "Student"}
                                                        </span>
                                                    </div>
                                                </DropdownMenuCheckboxItem>
                                            ))
                                            : canSwitchStudentEnrollment
                                              ? studentEnrollments.map((enrollment) => (
                                                <DropdownMenuCheckboxItem
                                                    key={enrollment.id}
                                                    checked={enrollment.id === activeStudentEnrollment?.id}
                                                    onCheckedChange={() => selectStudentEnrollment(enrollment.id)}
                                                    onSelect={(event) => event.preventDefault()}
                                                    className="min-w-0 gap-2 p-2 cursor-pointer"
                                                >
                                                    <div className="flex w-full min-w-0 flex-col pl-1">
                                                        <span className="truncate text-sm font-semibold">
                                                            {enrollment.institutionName}
                                                        </span>
                                                        <span className="truncate text-xs text-muted-foreground">
                                                            {enrollment.programName}{enrollment.sectionName ? ` · ${enrollment.sectionName}` : ""} ({enrollment.academicYearName})
                                                        </span>
                                                    </div>
                                                </DropdownMenuCheckboxItem>
                                              ))
                                            : institutionTeams.map((institution) => (
                                                <DropdownMenuCheckboxItem
                                                    key={institution.id}
                                                    checked={institution.id === activeInstitutionStorageId}
                                                    onCheckedChange={() => selectActiveInstitution(institution.id)}
                                                    onSelect={(event) => event.preventDefault()}
                                                    className="min-w-0 gap-2 p-2"
                                                >
                                                    <div className="flex w-full min-w-0 flex-col pl-1">
                                                        <span className="truncate text-sm font-medium">
                                                            {institution.name}
                                                        </span>
                                                        <span className="truncate text-xs text-muted-foreground">
                                                            {institution.roleName ?? "Institution"}
                                                        </span>
                                                    </div>
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <SidebarMenuButton
                                    size="lg"
                                    className="cursor-default hover:bg-transparent hover:text-foreground active:bg-transparent"
                                >
                                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-destructive text-xs font-bold text-destructive-foreground">
                                        {activeWorkspaceInitial}
                                    </div>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">{activeWorkspaceName}</span>
                                        <span className="truncate text-xs text-muted-foreground">{activeWorkspaceRole}</span>
                                    </div>
                                </SidebarMenuButton>
                            )}
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent>
                    {(isStudent ? [
                        {
                            label: "Platform",
                            items: [
                                { title: "Dashboard", url: "/student/dashboard", icon: LayoutDashboard },
                                ...(studentEnrollments.length > 0 ? [
                                    {
                                        title: "My Classroom",
                                        url: "/admin/classroom/attendance",
                                        icon: School,
                                        children: [
                                            { title: "Attendance", url: "/admin/classroom/attendance", icon: ClipboardCheck },
                                            { title: "Assignments", url: "/admin/classroom/assignments", icon: ClipboardList },
                                            { title: "Practice Exams", url: "/admin/classroom/practice-exams", icon: ClipboardCheck },
                                            { title: "Exams & Results", url: "/admin/classroom/exams", icon: FileText },
                                            { title: "My Timetable", url: "/admin/classroom/my-timetable", icon: CalendarDays },
                                            { title: "ID Card", url: "/admin/classroom/id-card", icon: IdCard },
                                            { title: "My Fee", url: "/admin/classroom/fees", icon: CreditCard },
                                        ],
                                    },
                                ] : []),
                                { title: "My Enrollments", url: "/student/enrollments", icon: GraduationCap, badge: studentEnrollments.length > 0 ? "Enrolled" : undefined },
                                { title: "My Enquiries", url: "/student/enquiries", icon: HelpCircle },
                                { title: "My Guardians", url: "/student/guardians", icon: Users },
                                ...(studentEnrollments.length > 0 ? [
                                    {
                                        title: "My Institution",
                                        url: "/admin/institution/calendar",
                                        icon: Building,
                                        children: [
                                            { title: "Calendar", url: "/admin/institution/calendar", icon: CalendarDays },
                                            { title: "Noticeboard", url: "/admin/institutions/news", icon: Megaphone },
                                            { title: "Complaints", url: "/admin/institution/complaints", icon: MessageSquareWarning },
                                        ],
                                    },
                                ] : []),
                                {
                                    title: "Notifications",
                                    url: "/admin/notifications",
                                    icon: Bell,
                                    children: [
                                        { title: "All Alerts", url: "/admin/notifications", icon: BellRing },
                                        { title: "Controls", url: "/admin/notifications/settings", icon: Settings },
                                    ],
                                },
                            ],
                        },
                        {
                            label: "Academic & Learning",
                            items: [
                                { title: "Practice Tests", url: "/practice", icon: ClipboardCheck, badge: "Quizzes" },
                                { title: "Lecture Notes", url: "/notes", icon: StickyNote },
                                { title: "Explore Courses", url: "/courses", icon: BookOpen },
                            ],
                        },
                        {
                            label: "Campus & Services",
                            items: [
                                { title: "Hostels & Residence", url: "/hostels", icon: Building2 },
                                { title: "Digital Libraries", url: "/libraries", icon: LibraryBig },
                                { title: "Top Institutes", url: "/institutes", icon: Building2 },
                                { title: "Expert Faculty", url: "/teachers", icon: UserCheck },
                            ],
                        },
                    ] : [{ label: "Platform", items: visibleNavItems }]).map((group) => (
                        <SidebarGroup key={group.label}>
                            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                            <SidebarMenu>
                                {group.items.map((item) =>
                                    item.children ? (
                                        <Collapsible
                                            key={item.title}
                                            asChild
                                            defaultOpen={isPathActive(item, activeSidebarLeaf)}
                                            className="group/collapsible"
                                        >
                                            <SidebarMenuItem>
                                                <CollapsibleTrigger asChild>
                                                    <SidebarMenuButton
                                                        tooltip={item.title}
                                                        isActive={isPathActive(item, activeSidebarLeaf)}
                                                        className="data-[active=true]:bg-destructive/15 data-[active=true]:text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    >
                                                        {item.icon && <item.icon className="size-4 text-current" />}
                                                        <span className="flex-1">{item.title}</span>
                                                        {item.badge && (
                                                            <span className="mr-1 rounded bg-rose-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 border border-rose-800/40">
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                        <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                    </SidebarMenuButton>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                    <SidebarMenuSub>
                                                        {item.children.map((child) => (
                                                            <SidebarMenuSubItem key={child.title}>
                                                                <SidebarMenuSubButton
                                                                    asChild
                                                                    isActive={isPathActive(child, activeSidebarLeaf)}
                                                                    className="data-[active=true]:bg-destructive/15 data-[active=true]:text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                >
                                                                    <Link href={roleHref(child.url)}>
                                                                        {child.icon && <child.icon className="size-3.5 text-current" />}
                                                                        <span>{child.title}</span>
                                                                    </Link>
                                                                </SidebarMenuSubButton>
                                                            </SidebarMenuSubItem>
                                                        ))}
                                                    </SidebarMenuSub>
                                                </CollapsibleContent>
                                            </SidebarMenuItem>
                                        </Collapsible>
                                    ) : (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isPathActive(item, activeSidebarLeaf)}
                                                tooltip={item.title}
                                                className="data-[active=true]:bg-destructive/15 data-[active=true]:text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Link href={roleHref(item.url)} className="flex items-center w-full">
                                                    {item.icon && <item.icon className="size-4 text-current" />}
                                                    <span className="flex-1 ml-2">{item.title}</span>
                                                    {item.badge && (
                                                        <span className="ml-auto rounded bg-rose-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 border border-rose-800/40">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                )}
                            </SidebarMenu>
                        </SidebarGroup>
                    ))}
                </SidebarContent>

                <SidebarFooter className="border-t border-sidebar-border/60 p-2">
                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/60">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shrink-0">
                                {initials}
                            </div>
                            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                                <span className="text-xs font-bold text-sidebar-foreground truncate">
                                    {displayName}
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 truncate">
                                    <ShieldCheck className="h-3 w-3 shrink-0" /> {activeWorkspaceRole}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setLogoutOpen(true)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0 group-data-[collapsible=icon]:hidden"
                            title="Sign Out"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </SidebarFooter>
            </Sidebar>

            <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sign out of Admin Panel?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You will be redirected to the login page. Any unsaved changes will be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmLogout}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Sign Out
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {isLoggingOut && (
                <div className="fixed inset-0 z-100 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-lg font-medium text-foreground">Signing out...</p>
                    </div>
                </div>
            )}
        </>
    );
}

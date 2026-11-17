"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  Loader2,
  Building2,
  Users,
  User,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  CheckSquare,
  BookMarked,
  Library,
  Award,
  Clock,
  UserCheck,
  TrendingUp,
  Plus,
  FileSpreadsheet,
  AlertCircle,
  CreditCard,
  Settings,
  HelpCircle,
  School,
  Phone,
  ClipboardList,
  Briefcase,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import { useAdminGuard } from "@/hooks/use-admin-guard";
import { ACTIVE_CHILD_CHANGE_EVENT, getStoredActiveChildStudentId } from "@/lib/auth/active-child";
import { toRoleRoutePath } from "@/lib/auth/role-routes";
import { useAuthStore } from "@/store";
import { isStaffUser, isInstitutionAdminUser, isCustomerUser, hasAdminPagePermission } from "@/lib/auth/permissions";
import { UnifiedDashboardView, ContextOption, DashboardMetricCard, ActiveModuleItem, QuickShortcut } from "@/components/dashboard/unified-dashboard-view";
import { PlatformAnalyticsDashboard } from "@/components/admin/dashboard/platform-analytics-dashboard";
import { CustomerDashboard } from "@/components/customer/customer-dashboard";

type DashboardCard = {
  label: string;
  value: string;
  hint: string;
};

type DashboardNotification = {
  notification_id: string;
  title: string;
  message: string;
  created_at: string;
};

type DashboardInstitution = {
  id: number;
  name: string;
  slug: string;
  location_name?: string | null;
  student_count: number;
  program_count: number;
  staff_count?: number;
};

type DashboardBranch = {
  id: number;
  institution_id: number;
  branch_name: string;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  is_primary: boolean;
};

type DashboardProgram = {
  id: number;
  title: string;
  code: string;
  student_count: number;
};

type DashboardPayload = {
  role: "platform_admin" | "institution_admin" | "teacher" | "student" | "parent" | "admin";
  cards: DashboardCard[];
  notifications: DashboardNotification[];
  institutions?: DashboardInstitution[];
  branches?: DashboardBranch[];
  programs?: DashboardProgram[];
  actionRequired?: {
    pendingEnquiries?: Array<{
      id: number;
      student_name: string;
      phone: string;
      email: string;
      status: string;
      program_title?: string | null;
      created_at: string;
    }>;
    unverifiedDocuments?: Array<{
      id: number;
      student_name: string;
      admission_number?: string | null;
      document_type: string;
      document_number?: string | null;
      created_at: string;
    }>;
    openTickets?: Array<{
      id: number;
      ticket_number: string;
      subject: string;
      status: string;
      priority: string;
      creator_name?: string | null;
      created_at: string;
    }>;
  };
  latestRecords?: {
    recentAdmissions?: Array<{
      id: number;
      student_name: string;
      admission_number?: string | null;
      roll_number?: string | null;
      program_name?: string | null;
      status?: string | null;
      admission_date?: string | null;
      created_at: string;
    }>;
  };
};

let dashboardRequest:
  | {
      token: string;
      childStudentId: number | null;
      loadedAt: number;
      promise: Promise<DashboardPayload>;
    }
  | null = null;

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid response" };
  }
}

async function fetchDashboard(accessToken: string) {
  const now = Date.now();
  const childStudentId = getStoredActiveChildStudentId();
  if (
    dashboardRequest?.token === accessToken &&
    dashboardRequest.childStudentId === childStudentId &&
    now - dashboardRequest.loadedAt < 5000
  ) {
    return dashboardRequest.promise;
  }

  const url = new URL("/api/admin/dashboard", window.location.origin);
  if (childStudentId) url.searchParams.set("childStudentId", String(childStudentId));

  const promise = fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  }).then(async (res) => {
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to load dashboard");
    return json as DashboardPayload;
  });

  dashboardRequest = {
    token: accessToken,
    childStudentId,
    loadedAt: now,
    promise,
  };

  return promise;
}

export default function AdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [activeChildVersion, setActiveChildVersion] = useState(0);

  const isStudent = user?.role_codes?.includes("student") || user?.roles?.includes("student") || user?.primary_role === "student";

  useEffect(() => {
    if (isReady && isStudent) {
      const timer = setTimeout(() => {
        router.replace(toRoleRoutePath("/admin/my-program", user));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isReady, isStudent, router, user]);

  useEffect(() => {
    function refreshForChildChange() {
      dashboardRequest = null;
      setActiveChildVersion((version) => version + 1);
    }

    window.addEventListener(ACTIVE_CHILD_CHANGE_EVENT, refreshForChildChange);
    return () => {
      window.removeEventListener(ACTIVE_CHILD_CHANGE_EVENT, refreshForChildChange);
    };
  }, []);

  const isPlatformAdmin = Boolean(user?.is_super_admin || user?.role_codes?.includes("platform_admin") || pathname?.startsWith("/platformadmin"));
  const isStaff = Boolean(isStaffUser(user) || pathname?.startsWith("/staff"));
  const isInstitutionAdmin = Boolean(
    isInstitutionAdminUser(user) ||
    user?.role_codes?.includes("institution_admin") ||
    user?.has_business_profile ||
    user?.has_professional_profile ||
    pathname?.startsWith("/workspace") ||
    pathname?.startsWith("/instituteadmin")
  );
  const isCustomer = Boolean(
    !isPlatformAdmin &&
    !isStaff &&
    !isInstitutionAdmin &&
    !pathname?.startsWith("/workspace") &&
    !pathname?.startsWith("/staff") &&
    !pathname?.startsWith("/instituteadmin") &&
    (pathname?.startsWith("/customer") || isCustomerUser(user))
  );

  useEffect(() => {
    if (!isReady || !accessToken || isCustomer) return;

    let cancelled = false;
    async function loadDashboard() {
      try {
        const json = await fetchDashboard(accessToken);
        if (!cancelled) setDashboard(json);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard";
        if (!cancelled) {
          toast.error(message);
        }
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [accessToken, activeChildVersion, isReady, isCustomer]);

  if (!isReady) {
    return <div className="p-8 text-center text-muted-foreground">Loading EduBird Dashboard...</div>;
  }

  if (isCustomer) {
    return <CustomerDashboard />;
  }

  const isTeacherRole = Boolean(
    user?.role_codes?.includes("teacher") ||
    user?.role_codes?.includes("faculty") ||
    user?.primary_role === "teacher"
  );
  const role = (pathname?.startsWith("/workspace") || pathname?.startsWith("/instituteadmin") || isInstitutionAdmin || (!isTeacherRole && isStaff))
    ? "institution_admin"
    : (dashboard?.role || (isStaff || pathname?.startsWith("/staff") ? "teacher" : "institution_admin"));
  const apiCards = dashboard?.cards || [];
  const notifications = dashboard?.notifications || [];

  // Helper to extract API card value or fallback
  const getCardValue = (index: number, fallback: string) => {
    return apiCards[index]?.value || fallback;
  };
  const getCardLabel = (index: number, fallback: string) => {
    return apiCards[index]?.label || fallback;
  };
  const getCardHint = (index: number, fallback: string) => {
    return apiCards[index]?.hint || fallback;
  };

  // Build role-specific configurations
  if (role === "platform_admin") {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
        <PlatformAnalyticsDashboard />
      </div>
    );
  }

  if (role === "parent") {
    const contexts: ContextOption[] = [
      {
        id: 1,
        category: "Full-Time Student",
        title: "Rohan Sharma (B.Tech Computer Science & Eng)",
        subtitle: "Apex Institute of Engineering & Technology (Varanasi)",
        code: "STU-2026-CSE-0155",
        metric: "94.5% Att.",
      },
      {
        id: 2,
        category: "Diploma Student",
        title: "Priya Sharma (Digital Marketing & Growth)",
        subtitle: "Tech Academy Pro (Mumbai Campus)",
        code: "STU-2026-DM-0419",
        metric: "91.2% Att.",
      },
    ];

    const metrics: DashboardMetricCard[] = [
      {
        label: "Attendance Rate",
        value: "94.5%",
        hint: "Eligible for End-Sem Exams",
        color: "emerald",
        icon: TrendingUp,
      },
      {
        label: "Academic Grade",
        value: "8.8 CGPA",
        hint: "Distinction Performance",
        color: "primary",
        icon: Award,
      },
      {
        label: "Tuition Fee Status",
        value: "Paid (Clear)",
        hint: "No Pending Outstanding Dues",
        color: "blue",
        icon: CreditCard,
      },
      {
        label: "Upcoming Exams",
        value: "3 Scheduled",
        hint: "Starts 24 Aug 2026",
        color: "amber",
        icon: Clock,
      },
    ];

    const activeModules: ActiveModuleItem[] = [
      {
        id: 1,
        code: "CS-601",
        title: "Data Structures & Advanced Algorithms",
        subtitle: "Faculty: Dr. Ananya Sharma • Sem 6 Core",
        statusBadge: "Exam: 24 Aug",
        progress: 85,
        dueDate: "Active Semester",
        primaryActionLabel: "View Attendance",
        primaryActionHref: "/admin/classroom/attendance",
        secondaryActionLabel: "Assignments",
        secondaryActionHref: "/admin/classroom/assignments",
      },
      {
        id: 2,
        code: "CS-602",
        title: "Database Management Systems & SQL",
        subtitle: "Faculty: Prof. Rajesh Kumar • Sem 6 Core",
        statusBadge: "Exam: 28 Aug",
        progress: 72,
        dueDate: "Active Semester",
        primaryActionLabel: "View Attendance",
        primaryActionHref: "/admin/classroom/attendance",
        secondaryActionLabel: "Assignments",
        secondaryActionHref: "/admin/classroom/assignments",
      },
    ];

    const quickShortcuts: QuickShortcut[] = [
      {
        title: "Classroom Attendance",
        description: "Check daily subject-wise attendance logs and biometric records.",
        href: "/admin/classroom/attendance",
        icon: UserCheck,
        colorBg: "bg-emerald-500/10",
        colorText: "text-emerald-600 dark:text-emerald-400",
      },
      {
        title: "Exams & Report Cards",
        description: "View semester marksheets, grade point averages, and tryouts.",
        href: "/admin/classroom/exams",
        icon: Award,
        colorBg: "bg-blue-500/10",
        colorText: "text-blue-600 dark:text-blue-400",
      },
      {
        title: "Tuition Fee Statements",
        description: "Pay online tuition fee installments and download official receipts.",
        href: "/admin/classroom/fees",
        icon: CreditCard,
        colorBg: "bg-rose-500/10",
        colorText: "text-rose-600 dark:text-rose-400",
      },
      {
        title: "Campus Noticeboard",
        description: "Stay updated with official institution circulars and announcements.",
        href: "/admin/institutions/news",
        icon: Bell,
        colorBg: "bg-amber-500/10",
        colorText: "text-amber-600 dark:text-amber-400",
      },
    ];

    return (
      <UnifiedDashboardView
        role="parent"
        statusBadgeText="2 Children Enrolled • Verified Guardian Account"
        idBadgeText="PAR-2026-GUARDIAN"
        greetingSubtitle="Monitoring your children's academic progress, attendance records, exam results, and fee statements."
        primaryButtonText="Pay Fee Online"
        primaryButtonHref="/admin/classroom/fees"
        primaryButtonIcon={CreditCard}
        secondaryButtonText="Report Cards"
        secondaryButtonHref="/admin/classroom/exams"
        secondaryButtonIcon={Award}
        contextLabel="SWITCH ACTIVE CHILD VIEW"
        contexts={contexts}
        metricsTitle="Academic Performance & Record"
        metrics={metrics}
        activeSectionTitle="Active Subjects & Exam Schedule"
        activeSectionSubtitle="Syllabus progress and upcoming exam dates for your selected child."
        activeModules={activeModules}
        quickShortcuts={quickShortcuts}
        notifications={notifications}
      />
    );
  }

  if (role === "teacher") {
    const contexts: ContextOption[] = [
      {
        id: 1,
        category: "B.Tech Core",
        title: "CS-601: Data Structures & Advanced Algorithms",
        subtitle: "Apex Institute of Engineering • Section A",
        code: "BATCH-CS-601",
        metric: "60 Students",
      },
      {
        id: 2,
        category: "B.Tech Core",
        title: "CS-603: Computer Networks & Cyber Security",
        subtitle: "Apex Institute of Engineering • Section B",
        code: "BATCH-CS-603",
        metric: "55 Students",
      },
      {
        id: 3,
        category: "Executive Diploma",
        title: "DS-301: Python for Data Science & Pandas",
        subtitle: "Technorigator School of Technology",
        code: "BATCH-DS-301",
        metric: "45 Students",
      },
    ];

    const metrics: DashboardMetricCard[] = [
      {
        label: "Batch Attendance",
        value: "93.8%",
        hint: "Section A Average",
        color: "emerald",
        icon: TrendingUp,
      },
      {
        label: "Syllabus Completed",
        value: "85%",
        hint: "On Schedule for Mid-Sems",
        color: "primary",
        icon: BookOpen,
      },
      {
        label: "Assignments Evaluated",
        value: "58 / 60",
        hint: "2 Submissions Pending Review",
        color: "blue",
        icon: CheckSquare,
      },
      {
        label: "Next Lecture",
        value: "Today, 2:00 PM",
        hint: "Computer Lab 3",
        color: "amber",
        icon: Clock,
      },
    ];

    const activeModules: ActiveModuleItem[] = [
      {
        id: 1,
        code: "CS-601-M4",
        title: "Advanced Tree & Graph Algorithms",
        subtitle: "B.Tech CSE Section A • 60 Enrolled",
        statusBadge: "Next Lecture: Today",
        progress: 85,
        dueDate: "Mid-Term Exam",
        primaryActionLabel: "Mark Attendance",
        primaryActionHref: "/admin/classroom/attendance",
        secondaryActionLabel: "Grade Submissions",
        secondaryActionHref: "/admin/classroom/assignments",
      },
      {
        id: 2,
        code: "CS-603-M3",
        title: "Cryptographic Protocols & Cyber Defense",
        subtitle: "B.Tech CSE Section B • 55 Enrolled",
        statusBadge: "Next Lecture: Tomorrow",
        progress: 70,
        dueDate: "Lab Quiz 2",
        primaryActionLabel: "Mark Attendance",
        primaryActionHref: "/admin/classroom/attendance",
        secondaryActionLabel: "Grade Submissions",
        secondaryActionHref: "/admin/classroom/assignments",
      },
    ];

    const quickShortcuts: QuickShortcut[] = [
      {
        title: "Classroom Attendance",
        description: "Mark daily student attendance logs and verify leave applications.",
        href: "/admin/classroom/attendance",
        icon: UserCheck,
        colorBg: "bg-emerald-500/10",
        colorText: "text-emerald-600 dark:text-emerald-400",
      },
      {
        title: "Assignments & Grading",
        description: "Create course assignments, collect student work, and award marks.",
        href: "/admin/classroom/assignments",
        icon: CheckSquare,
        colorBg: "bg-blue-500/10",
        colorText: "text-blue-600 dark:text-blue-400",
      },
      {
        title: "Practice & Speed Quizzes",
        description: "Set up topic-wise practice tests and automatic evaluation rules.",
        href: "/admin/classroom/practice-exams",
        icon: Award,
        colorBg: "bg-rose-500/10",
        colorText: "text-rose-600 dark:text-rose-400",
      },
      {
        title: "Upload Lecture Handouts",
        description: "Share PDF lecture notes, slides, and reference materials with students.",
        href: "/notes",
        icon: BookMarked,
        colorBg: "bg-amber-500/10",
        colorText: "text-amber-600 dark:text-amber-400",
      },
      {
        title: "My Data Workspace",
        description: "Access all your personal records: notices, complaints, tasks, performance, attendance, queries, and documents.",
        href: "/admin/staff/my-data",
        icon: User,
        colorBg: "bg-primary/10",
        colorText: "text-primary",
      },
      {
        title: "My Assigned Tasks",
        description: "View and track project deliverables, operations tasks, and deadlines assigned to you.",
        href: "/admin/operations/tasks?scope=me",
        icon: ClipboardList,
        colorBg: "bg-purple-500/10",
        colorText: "text-purple-600 dark:text-purple-400",
      },
    ];

    return (
      <UnifiedDashboardView
        role="teacher"
        statusBadgeText="4 Active Batches • Senior Faculty Account"
        idBadgeText="FAC-2026-TEACHER"
        greetingSubtitle="Conducting lectures, marking attendance, uploading lecture notes, and grading practice assessments."
        primaryButtonText="Mark Attendance"
        primaryButtonHref="/admin/classroom/attendance"
        primaryButtonIcon={UserCheck}
        secondaryButtonText="Upload Handouts"
        secondaryButtonHref="/notes"
        secondaryButtonIcon={BookMarked}
        contextLabel="SWITCH ACTIVE BATCH VIEW"
        contexts={contexts}
        metricsTitle="Teaching Performance & Batch Metrics"
        metrics={metrics}
        activeSectionTitle="Active Teaching Modules & Syllabus"
        activeSectionSubtitle="Manage course syllabus progress and student submissions."
        activeModules={activeModules}
        quickShortcuts={quickShortcuts}
        notifications={notifications}
      />
    );
  }

  // DYNAMIC INSTITUTION ADMIN ROLE
  let instContexts: ContextOption[] = [];
  if (dashboard?.institutions && dashboard.institutions.length > 0) {
    instContexts = dashboard.institutions.map((inst, idx) => ({
      id: inst.id,
      category: "Organization Workspace",
      title: inst.name,
      subtitle: inst.location_name || "Main Workspace",
      code: `BIZ-${String(idx + 1).padStart(2, "0")}`,
      metric: `${inst.staff_count || 0} Staff Members`,
    }));
  } else {
    instContexts = [
      {
        id: 1,
        category: "Organization Workspace",
        title: dashboard?.institutions?.[0]?.name || "My Organization",
        subtitle: "Main Workspace",
        code: "BIZ-01",
        metric: `${getCardValue(1, "0")} Staff Members`,
      },
    ];
  }

  const instMetrics: DashboardMetricCard[] = [
    {
      label: getCardLabel(1, "Team & Staff"),
      value: getCardValue(1, "0"),
      hint: getCardHint(1, "Active staff members"),
      color: "primary",
      icon: UserCheck,
    },
    {
      label: getCardLabel(0, "Active Tasks / Work"),
      value: getCardValue(0, "0"),
      hint: getCardHint(0, "Current operations and work items"),
      color: "emerald",
      icon: Briefcase,
    },
    {
      label: getCardLabel(2, "Invoices & Finance"),
      value: getCardValue(2, "0"),
      hint: getCardHint(2, "Billed accounts & invoices"),
      color: "blue",
      icon: CreditCard,
    },
    {
      label: getCardLabel(3, "Open Enquiries"),
      value: getCardValue(3, "0"),
      hint: getCardHint(3, "Website leads & client pipeline"),
      color: "amber",
      icon: AlertCircle,
    },
  ];

  let instActiveModules: ActiveModuleItem[] = [];
  if (dashboard?.programs && dashboard.programs.length > 0) {
    instActiveModules = dashboard.programs.map((prog) => ({
      id: prog.id,
      code: prog.code || `WORK-${prog.id}`,
      title: prog.title,
      subtitle: "Active Operations Item",
      statusBadge: "Operational",
      progress: Math.min(100, Math.max(25, (prog.student_count || 1) * 12)),
      dueDate: "Active",
      primaryActionLabel: "View Work",
      primaryActionHref: "/admin/operations/tasks",
      secondaryActionLabel: "Work Logs",
      secondaryActionHref: "/admin/operations/work-logs",
    }));
  }

  const instQuickShortcuts: QuickShortcut[] = [
    {
      title: "Task & Work Management",
      description: "Assign work, track employee deliverables, and review milestones.",
      href: "/admin/operations/tasks",
      icon: Briefcase,
      colorBg: "bg-blue-500/10",
      colorText: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Staff & Team Directory",
      description: "Manage staff profiles, assign permissions, and track attendance.",
      href: "/admin/staff",
      icon: Users,
      colorBg: "bg-emerald-500/10",
      colorText: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Sales Pipeline & Leads",
      description: "Track prospective clients, proposals, and pipeline conversions.",
      href: "/admin/sales/pipeline",
      icon: TrendingUp,
      colorBg: "bg-amber-500/10",
      colorText: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Finance & Invoices",
      description: "Track work billing, invoices, expenses, and payments.",
      href: "/admin/finance/invoice",
      icon: CreditCard,
      colorBg: "bg-rose-500/10",
      colorText: "text-rose-600 dark:text-rose-400",
    },
    {
      title: "Public Store Front",
      description: "View your live customer-facing storefront, catalog, products/services, and reviews.",
      href: "/storefront",
      icon: Store,
      colorBg: "bg-purple-500/10",
      colorText: "text-purple-600 dark:text-purple-400",
    },
  ];

  const allowedInstShortcuts = instQuickShortcuts.filter((s) => {
    if (s.href === "/storefront") return true;
    return hasAdminPagePermission(user, s.href);
  });

  return (
    <UnifiedDashboardView
      role="institution_admin"
      statusBadgeText="Workspace Operational • Active Session"
      idBadgeText="INST-BIZ"
      greetingSubtitle="Managing your operations, staff workflow, tasks, finances, and client leads."
      primaryButtonText={hasAdminPagePermission(user, "/admin/operations/tasks") ? "Create Task / Work" : "My Work"}
      primaryButtonHref={hasAdminPagePermission(user, "/admin/operations/tasks") ? "/admin/operations/tasks" : "/admin/operations/tasks?scope=me"}
      primaryButtonIcon={Briefcase}
      secondaryButtonText={hasAdminPagePermission(user, "/admin/sales/pipeline") ? "Leads & Sales" : "My Profile"}
      secondaryButtonHref={hasAdminPagePermission(user, "/admin/sales/pipeline") ? "/admin/sales/pipeline" : "/admin/my-profile"}
      secondaryButtonIcon={TrendingUp}
      contextLabel="SWITCH ACTIVE WORKSPACE VIEW"
      contexts={instContexts}
      metricsTitle="Performance & Operations Metrics"
      metrics={instMetrics}
      actionRequired={dashboard?.actionRequired}
      latestRecords={dashboard?.latestRecords}
      activeSectionTitle="Active Team Operations & Workflows"
      activeSectionSubtitle="Operations and tasks currently tracked across your organization."
      activeModules={instActiveModules}
      quickShortcuts={allowedInstShortcuts.length > 0 ? allowedInstShortcuts : instQuickShortcuts}
      notifications={notifications}
    />
  );
}

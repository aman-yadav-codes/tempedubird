"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAdminGuard } from "@/hooks/use-admin-guard";
import { ACTIVE_CHILD_CHANGE_EVENT, getStoredActiveChildStudentId } from "@/lib/auth/active-child";
import { toRoleRoutePath } from "@/lib/auth/role-routes";
import { useAuthStore } from "@/store";

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

function formatActivityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dashboardCopy(role: DashboardPayload["role"] | undefined) {
  if (role === "platform_admin") {
    return {
      title: "Dashboard",
      subtitle: "Platform overview across institutions, support, and assignments.",
    };
  }
  if (role === "institution_admin") {
    return {
      title: "Dashboard",
      subtitle: "Institution overview for teachers, students, and support.",
    };
  }
  if (role === "teacher") {
    return {
      title: "Dashboard",
      subtitle: "Teacher workspace summary.",
    };
  }
  if (role === "student") {
    return {
      title: "Dashboard",
      subtitle: "Your assignments, attendance, and latest updates.",
    };
  }
  if (role === "parent") {
    return {
      title: "Dashboard",
      subtitle: "Child overview for attendance, assignments, and updates.",
    };
  }
  return {
    title: "Dashboard",
    subtitle: "Welcome back to the admin panel.",
  };
}

import { UnifiedDashboardView, ContextOption, DashboardMetricCard, ActiveModuleItem, QuickShortcut } from "@/components/dashboard/unified-dashboard-view";
import {
  Building2,
  Users,
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
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChildVersion, setActiveChildVersion] = useState(0);

  const isStudent = user?.role_codes?.includes("student") || user?.roles?.includes("student") || user?.primary_role === "student";

  useEffect(() => {
    if (isReady && isStudent) {
      router.replace(toRoleRoutePath("/admin/my-program", user));
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

  useEffect(() => {
    if (!isReady || !accessToken) return;

    let cancelled = false;
    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const json = await fetchDashboard(accessToken);
        if (!cancelled) setDashboard(json);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard";
        if (!cancelled) {
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [accessToken, activeChildVersion, isReady]);

  if (!isReady) {
    return <div className="p-8 text-center text-muted-foreground">Loading EduBird Dashboard...</div>;
  }

  const role = dashboard?.role || "institution_admin";
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
    const contexts: ContextOption[] = [
      {
        id: 1,
        category: "Global Network",
        title: "EduBird Central Platform Ecosystem",
        subtitle: "Overseeing all registered institutions & platform services",
        code: "ADM-GLOBAL-01",
        metric: `${getCardValue(0, "15")} Institutions`,
      },
      {
        id: 2,
        category: "Premier Group",
        title: "Apex Institute of Engineering & Tech Network",
        subtitle: "Varanasi, Delhi NCR & Regional Campuses",
        code: "INST-APEX-01",
        metric: "1,850 Enrolled",
      },
      {
        id: 3,
        category: "Tech Academy",
        title: "Technorigator School of Applied Technology",
        subtitle: "Mumbai & Bangalore Innovation Hubs",
        code: "INST-TECH-02",
        metric: "2,400 Enrolled",
      },
    ];

    const metrics: DashboardMetricCard[] = [
      {
        label: getCardLabel(0, "Total Institutions"),
        value: getCardValue(0, "15"),
        hint: getCardHint(0, "Active registered institutions"),
        color: "emerald",
        icon: Building2,
      },
      {
        label: getCardLabel(1, "Institution Admins"),
        value: getCardValue(1, "42"),
        hint: getCardHint(1, "Active admin accounts"),
        color: "primary",
        icon: Users,
      },
      {
        label: getCardLabel(2, "Open Support Tickets"),
        value: getCardValue(2, "4"),
        hint: getCardHint(2, "SLA response time < 15m"),
        color: "blue",
        icon: AlertCircle,
      },
      {
        label: getCardLabel(3, "Total Assignments"),
        value: getCardValue(3, "128"),
        hint: getCardHint(3, "Live academic records"),
        color: "amber",
        icon: FileSpreadsheet,
      },
    ];

    const activeModules: ActiveModuleItem[] = [
      {
        id: 1,
        code: "INST-01",
        title: "Apex Institute of Engineering & Technology",
        subtitle: "Varanasi Main Campus • Registered Verified",
        statusBadge: "99.8% Uptime",
        progress: 95,
        dueDate: "Active License",
        primaryActionLabel: "Manage Institution",
        primaryActionHref: "/admin/institutions",
        secondaryActionLabel: "View Staff",
        secondaryActionHref: "/admin/users",
      },
      {
        id: 2,
        code: "INST-02",
        title: "Technorigator School of Technology",
        subtitle: "Delhi NCR Campus • Executive Learning",
        statusBadge: "99.5% Uptime",
        progress: 88,
        dueDate: "Active License",
        primaryActionLabel: "Manage Institution",
        primaryActionHref: "/admin/institutions",
        secondaryActionLabel: "View Staff",
        secondaryActionHref: "/admin/users",
      },
    ];

    const quickShortcuts: QuickShortcut[] = [
      {
        title: "Institutions Directory",
        description: "Onboard, verify, and configure partner educational institutions.",
        href: "/admin/institutions",
        icon: Building2,
        colorBg: "bg-blue-500/10",
        colorText: "text-blue-600 dark:text-blue-400",
      },
      {
        title: "Platform User Directory",
        description: "Manage global user roles, platform permissions, and credentials.",
        href: "/admin/users",
        icon: Users,
        colorBg: "bg-rose-500/10",
        colorText: "text-rose-600 dark:text-rose-400",
      },
      {
        title: "Support Desk Center",
        description: "Respond to institution tickets, bug reports, and user support.",
        href: "/admin/support/tickets",
        icon: AlertCircle,
        colorBg: "bg-amber-500/10",
        colorText: "text-amber-600 dark:text-amber-400",
      },
      {
        title: "Master Data & Exams",
        description: "Configure national exam templates, subjects, and card templates.",
        href: "/admin/master-data/exams",
        icon: Settings,
        colorBg: "bg-purple-500/10",
        colorText: "text-purple-600 dark:text-purple-400",
      },
    ];

    return (
      <UnifiedDashboardView
        role="platform_admin"
        statusBadgeText="Platform Operational • Global Multi-Tenant"
        idBadgeText="ADM-2026-GLOBAL"
        greetingSubtitle="Overviewing global platform performance, institution registrations, system health, and student enrollments."
        primaryButtonText="Onboard Institution"
        primaryButtonHref="/admin/institutions"
        primaryButtonIcon={Plus}
        secondaryButtonText="Support Desk"
        secondaryButtonHref="/admin/support/tickets"
        secondaryButtonIcon={AlertCircle}
        contextLabel="SWITCH ACTIVE SYSTEM SCOPE"
        contexts={contexts}
        metricsTitle="System Performance & Global Metrics"
        metrics={metrics}
        activeSectionTitle="Partner Institutions & Campus Status"
        activeSectionSubtitle="Real-time operational status across onboarded academic partners."
        activeModules={activeModules}
        quickShortcuts={quickShortcuts}
        notifications={notifications}
      />
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
  if (dashboard?.branches && dashboard.branches.length > 0) {
    instContexts = dashboard.branches.map((branch, idx) => ({
      id: branch.id,
      category: branch.is_primary ? "Main Campus" : "Branch Campus",
      title: branch.branch_name,
      subtitle: [branch.city, branch.state].filter(Boolean).join(", ") || dashboard?.institutions?.[0]?.name || "Campus Location",
      code: `BRANCH-${String(idx + 1).padStart(2, "0")}`,
      metric: "Active Branch",
    }));
  } else if (dashboard?.institutions && dashboard.institutions.length > 0) {
    instContexts = dashboard.institutions.map((inst, idx) => ({
      id: inst.id,
      category: "Registered Institution",
      title: inst.name,
      subtitle: inst.location_name || "Main Campus",
      code: `CAMPUS-${String(idx + 1).padStart(2, "0")}`,
      metric: `${inst.student_count || 0} Students`,
    }));
  } else {
    instContexts = [
      {
        id: 1,
        category: "Institution Campus",
        title: dashboard?.institutions?.[0]?.name || "My Institution Campus",
        subtitle: "Main Operational Campus",
        code: "CAMPUS-01",
        metric: `${getCardValue(0, "0")} Students`,
      },
    ];
  }

  const instMetrics: DashboardMetricCard[] = [
    {
      label: getCardLabel(0, "Enrolled Students"),
      value: getCardValue(0, "0"),
      hint: getCardHint(0, "Active student registrations"),
      color: "emerald",
      icon: Users,
    },
    {
      label: getCardLabel(1, "Faculty & Staff"),
      value: getCardValue(1, "0"),
      hint: getCardHint(1, "Teaching staff members"),
      color: "primary",
      icon: UserCheck,
    },
    {
      label: getCardLabel(2, "Live Programs"),
      value: getCardValue(2, "0"),
      hint: getCardHint(2, "Offered degree & courses"),
      color: "blue",
      icon: BookOpen,
    },
    {
      label: getCardLabel(3, "Open Enquiries"),
      value: getCardValue(3, "0"),
      hint: getCardHint(3, "Website leads awaiting response"),
      color: "amber",
      icon: AlertCircle,
    },
  ];

  let instActiveModules: ActiveModuleItem[] = [];
  if (dashboard?.programs && dashboard.programs.length > 0) {
    instActiveModules = dashboard.programs.map((prog) => ({
      id: prog.id,
      code: prog.code || `PROG-${prog.id}`,
      title: prog.title,
      subtitle: `${prog.student_count || 0} Enrolled Students`,
      statusBadge: "Active Course",
      progress: Math.min(100, Math.max(25, (prog.student_count || 1) * 12)),
      dueDate: "Session 2025-2026",
      primaryActionLabel: "Manage Students",
      primaryActionHref: `/admin/students?programId=${prog.id}`,
      secondaryActionLabel: "Course Details",
      secondaryActionHref: "/admin/institutions/programs",
    }));
  }

  const instQuickShortcuts: QuickShortcut[] = [
    {
      title: "Student Admissions & Records",
      description: "Register students, assign roll numbers, upload documents, and track enrollments.",
      href: "/admin/students",
      icon: Users,
      colorBg: "bg-blue-500/10",
      colorText: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Programs & Courses",
      description: "Manage offered degree courses, streams, syllabus details, and intake capacity.",
      href: "/admin/institutions/programs",
      icon: BookOpen,
      colorBg: "bg-emerald-500/10",
      colorText: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Course Inquiries & Leads",
      description: "Respond to incoming student inquiries, contact admission leads, and track pipeline.",
      href: "/admin/sales/leads",
      icon: Phone,
      colorBg: "bg-amber-500/10",
      colorText: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Fee & Payment Management",
      description: "Collect tuition fees, generate invoice receipts, and track defaulters.",
      href: "/admin/students/fee-management",
      icon: CreditCard,
      colorBg: "bg-rose-500/10",
      colorText: "text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <UnifiedDashboardView
      role="institution_admin"
      statusBadgeText="Campus Operational • Active Session"
      idBadgeText="INST-CAMPUS"
      greetingSubtitle="Managing your campus programs, faculty, student admissions, fee collections, and website leads."
      primaryButtonText="Add New Student"
      primaryButtonHref="/admin/students"
      primaryButtonIcon={Plus}
      secondaryButtonText="Course Inquiries"
      secondaryButtonHref="/admin/sales/leads"
      secondaryButtonIcon={Phone}
      contextLabel="SWITCH ACTIVE CAMPUS VIEW"
      contexts={instContexts}
      metricsTitle="Campus Performance & Attendance Metrics"
      metrics={instMetrics}
      actionRequired={dashboard?.actionRequired}
      latestRecords={dashboard?.latestRecords}
      activeSectionTitle="Active Campus Academic Programs"
      activeSectionSubtitle="Programs and student enrollment numbers configured for your institution."
      activeModules={instActiveModules}
      quickShortcuts={instQuickShortcuts}
      notifications={notifications}
    />
  );
}


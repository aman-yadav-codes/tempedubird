"use client";

import { useEffect, useState } from "react";
import {
  Percent,
  Plus,
  Search,
  Filter,
  Users,
  Building2,
  TrendingUp,
  CheckCircle2,
  Clock,
  DollarSign,
  Briefcase,
  Layers,
  Settings,
  Pencil,
  Trash2,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  UserCheck,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";

type CommissionRecord = {
  id: number;
  institution_id: number;
  employee_id?: number | null;
  employee_name: string;
  employee_role: string;
  student_name?: string | null;
  course_title: string;
  sale_amount: number;
  commission_percentage: number;
  commission_amount: number;
  commission_reason: string;
  status: "pending" | "approved" | "paid";
  notes?: string | null;
  created_at: string;
};

type CommissionRule = {
  id: number;
  institution_id: number;
  title: string;
  applicable_role: string;
  course_name: string;
  commission_percentage: number;
  description?: string;
  is_active: boolean;
};

const EMPLOYEE_ROLES = [
  "Sales Counsellor",
  "Senior Admission Counsellor",
  "Academic Advisor",
  "Admission Coordinator",
  "Teacher / Faculty",
  "Outreach & PR Officer",
  "Regional Agent",
];

const COMMISSION_REASON_TEMPLATES = [
  "Direct student admission conversion during Open Day Counselling session",
  "Executive corporate batch referral closure with full upfront annual fee payment",
  "Early bird spot-registration incentive for top-100 test batch",
  "Regional campus branch inquiry follow-up and confirmed seat booking",
  "Merit scholarship student conversion & document verification closure",
  "Parent walkthrough & spot hostel booking commission incentive",
];

export default function SalesCommissionsPage() {
  const { user } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [stats, setStats] = useState<any>({
    totalCommissions: 0,
    paidCommissions: 0,
    pendingCommissions: 0,
    totalSalesInfluenced: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("commissions");

  // Log Commission Dialog State
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("Sales Counsellor");
  const [studentName, setStudentName] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [saleAmount, setSaleAmount] = useState<string>("100000");
  const [commissionRate, setCommissionRate] = useState<string>("8.0");
  const [commissionReason, setCommissionReason] = useState("");
  const [commissionStatus, setCommissionStatus] = useState<"pending" | "approved" | "paid">("pending");
  const [savingCommission, setSavingCommission] = useState(false);

  // Rule Dialog State
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleRole, setRuleRole] = useState("all");
  const [ruleCourse, setRuleCourse] = useState("All Courses");
  const [ruleRate, setRuleRate] = useState<string>("7.5");
  const [ruleDesc, setRuleDesc] = useState("");
  const [ruleActive, setRuleActive] = useState(true);
  const [savingRule, setSavingRule] = useState(false);
  const [roles, setRoles] = useState<{ id: number; name: string; code: string }[]>([]);
  const [courses, setCourses] = useState<{ id: number; title: string; slug?: string }[]>([]);

  const resolvedInstId = activeInstitutionId || user?.memberships?.[0]?.institution_id || 1;

  useEffect(() => {
    fetchCommissionsData();
    fetchRolesAndCourses();
  }, [resolvedInstId]);

  const fetchRolesAndCourses = async () => {
    // 1. Fetch all roles added by platform admin
    try {
      const rolesRes = await fetch("/api/admin/access/options?type=institutionRoles&limit=100");
      if (rolesRes.ok) {
        const rolesJson = await rolesRes.json();
        if (Array.isArray(rolesJson.data) && rolesJson.data.length > 0) {
          setRoles(rolesJson.data);
        }
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
    }

    // 2. Fetch all courses / programs added by institution
    try {
      const coursesRes = await fetch(`/api/admin/institutions/programs?institutionId=${resolvedInstId}&limit=100`);
      if (coursesRes.ok) {
        const coursesJson = await coursesRes.json();
        if (Array.isArray(coursesJson.data) && coursesJson.data.length > 0) {
          setCourses(coursesJson.data);
        } else {
          // Fallback to content courses if institution programs are not present
          const fallbackRes = await fetch("/api/admin/content/courses?limit=100");
          if (fallbackRes.ok) {
            const fallbackJson = await fallbackRes.json();
            if (Array.isArray(fallbackJson.data)) {
              setCourses(fallbackJson.data);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching institution courses:", err);
    }
  };

  const fetchCommissionsData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sales/commissions?institutionId=${resolvedInstId}`);
      if (res.ok) {
        const data = await res.json();
        setCommissions(data.commissions || []);
        setRules(data.rules || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error("Error fetching commissions data:", e);
    } finally {
      setLoading(false);
    }
  };

  // Quick Commission Calculation
  const computedCommAmount = (Number(saleAmount || 0) * Number(commissionRate || 0)) / 100;

  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !courseTitle.trim() || !commissionReason.trim()) {
      toast.error("Please fill in Employee Name, Course, and Reason of Commission.");
      return;
    }

    setSavingCommission(true);
    try {
      const res = await fetch("/api/admin/sales/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution_id: resolvedInstId,
          employee_name: empName.trim(),
          employee_role: empRole,
          student_name: studentName.trim() || null,
          course_title: courseTitle.trim(),
          sale_amount: Number(saleAmount),
          commission_percentage: Number(commissionRate),
          commission_amount: computedCommAmount,
          commission_reason: commissionReason.trim(),
          status: commissionStatus,
        }),
      });

      if (res.ok) {
        toast.success("Employee commission logged successfully!");
        setLogDialogOpen(false);
        resetCommissionForm();
        fetchCommissionsData();
      } else {
        toast.error("Failed to save commission record.");
      }
    } catch {
      toast.error("Network error while saving commission.");
    } finally {
      setSavingCommission(false);
    }
  };

  const resetCommissionForm = () => {
    setEmpName("");
    setStudentName("");
    setCourseTitle("");
    setSaleAmount("100000");
    setCommissionRate("8.0");
    setCommissionReason("");
    setCommissionStatus("pending");
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTitle.trim()) {
      toast.error("Please enter a rule title.");
      return;
    }

    setSavingRule(true);
    try {
      const res = await fetch("/api/admin/sales/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingRuleId ? "update_rule" : "create_rule",
          rule_id: editingRuleId || undefined,
          institution_id: resolvedInstId,
          title: ruleTitle.trim(),
          applicable_role: ruleRole,
          course_name: ruleCourse.trim(),
          commission_percentage: Number(ruleRate),
          description: ruleDesc.trim(),
          is_active: ruleActive,
        }),
      });

      if (res.ok) {
        toast.success(editingRuleId ? "Commission rule updated!" : "Commission rule created!");
        setRuleDialogOpen(false);
        setEditingRuleId(null);
        setRuleTitle("");
        setRuleDesc("");
        fetchCommissionsData();
      } else {
        toast.error("Failed to save commission rule.");
      }
    } catch {
      toast.error("Error saving rule.");
    } finally {
      setSavingRule(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/sales/commissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Commission status updated to ${newStatus.toUpperCase()}`);
        fetchCommissionsData();
      }
    } catch {
      toast.error("Failed to update commission status");
    }
  };

  const handleDeleteCommission = async (id: number) => {
    if (!confirm("Are you sure you want to delete this commission record?")) return;
    try {
      const res = await fetch(`/api/admin/sales/commissions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Commission record deleted");
        fetchCommissionsData();
      }
    } catch {
      toast.error("Failed to delete record");
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm("Delete this commission rule configuration?")) return;
    try {
      const res = await fetch(`/api/admin/sales/commissions?rule_id=${ruleId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Commission rule removed");
        fetchCommissionsData();
      }
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const openEditRule = (rule: CommissionRule) => {
    setEditingRuleId(rule.id);
    setRuleTitle(rule.title);
    setRuleRole(rule.applicable_role);
    setRuleCourse(rule.course_name);
    setRuleRate(String(rule.commission_percentage));
    setRuleDesc(rule.description || "");
    setRuleActive(rule.is_active);
    setRuleDialogOpen(true);
  };

  const filteredCommissions = commissions.filter((c) => {
    const matchesSearch =
      c.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.course_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.student_name && c.student_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.commission_reason.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-[#800000] border border-rose-500/20 text-xs font-bold uppercase tracking-wider mb-1.5">
            <Percent className="h-3.5 w-3.5" />
            <span>Sales & Employee Incentive Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Employee Sales Commissions & Incentive % Rules
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Track employee sales commissions, rationale/reasons of payouts, and configure institution commission percentages.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingRuleId(null);
              setRuleTitle("");
              setRuleDesc("");
              setRuleRate("7.5");
              setRuleDialogOpen(true);
            }}
            className="text-xs font-bold h-9"
          >
            <Settings className="h-4 w-4 mr-1.5 text-primary" /> Configure Commission %
          </Button>

          <Button
            size="sm"
            onClick={() => {
              resetCommissionForm();
              setLogDialogOpen(true);
            }}
            className="bg-[#800000] hover:bg-rose-800 text-white font-bold text-xs h-9 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Log Employee Commission
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 rounded-2xl border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase">Total Commissions</span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            ₹{stats.totalCommissions.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-muted-foreground">Across {stats.count} total admission deals</p>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase">Paid Payouts</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            ₹{stats.paidCommissions.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-emerald-600/80">Disbursed to staff bank accounts</p>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase">Pending Payouts</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            ₹{stats.pendingCommissions.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-amber-600/80">Awaiting payout approval</p>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase">Sales Revenue Influenced</span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-[#800000] flex items-center justify-center font-bold">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            ₹{stats.totalSalesInfluenced.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-muted-foreground">Gross admission course value</p>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="commissions" className="text-xs font-bold gap-1.5">
              <Users className="h-3.5 w-3.5" /> Employee Commission Records
            </TabsTrigger>
            <TabsTrigger value="rules" className="text-xs font-bold gap-1.5">
              <Percent className="h-3.5 w-3.5" /> Institution Commission % Rules ({rules.length})
            </TabsTrigger>
          </TabsList>

          {activeTab === "commissions" && (
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search employee, reason..."
                  className="pl-8 text-xs h-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-9 text-xs font-semibold">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* TAB 1: ALL EMPLOYEE COMMISSIONS */}
        <TabsContent value="commissions" className="space-y-4 m-0">
          <Card className="rounded-2xl border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 font-bold text-muted-foreground uppercase text-[10px]">
                    <th className="p-3.5">Employee Name & Role</th>
                    <th className="p-3.5">Student / Admission</th>
                    <th className="p-3.5">Course / Program</th>
                    <th className="p-3.5 text-right">Sale Amount</th>
                    <th className="p-3.5 text-center">Comm. %</th>
                    <th className="p-3.5 text-right">Commission Payout</th>
                    <th className="p-3.5 min-w-[220px]">Reason of Commission</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        Loading employee sales commissions...
                      </td>
                    </tr>
                  ) : filteredCommissions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        No commission records found. Click &quot;Log Employee Commission&quot; to add one.
                      </td>
                    </tr>
                  ) : (
                    filteredCommissions.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-foreground">{c.employee_name}</div>
                          <div className="text-[11px] text-muted-foreground">{c.employee_role}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-foreground">{c.student_name || "—"}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        </td>

                        <td className="p-3.5 font-medium text-foreground max-w-[180px] truncate" title={c.course_title}>
                          {c.course_title}
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-foreground">
                          ₹{Number(c.sale_amount).toLocaleString("en-IN")}
                        </td>

                        <td className="p-3.5 text-center">
                          <Badge variant="secondary" className="font-mono font-bold text-rose-700 bg-rose-50">
                            {c.commission_percentage}%
                          </Badge>
                        </td>

                        <td className="p-3.5 text-right font-mono font-extrabold text-foreground">
                          ₹{Number(c.commission_amount).toLocaleString("en-IN")}
                        </td>

                        <td className="p-3.5">
                          <div className="p-2 rounded-lg bg-muted/40 border border-border/60 text-[11px] text-foreground leading-snug">
                            {c.commission_reason}
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <Badge
                            className={`capitalize text-[10px] font-bold ${
                              c.status === "paid"
                                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                : c.status === "approved"
                                ? "bg-blue-500/15 text-blue-600 border-blue-500/30"
                                : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                            }`}
                          >
                            {c.status}
                          </Badge>
                        </td>

                        <td className="p-3.5 text-right space-x-1">
                          {c.status !== "paid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(c.id, "paid")}
                              className="h-7 text-[10px] font-bold border-emerald-500/40 text-emerald-600 hover:bg-emerald-50"
                            >
                              Mark Paid
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCommission(c.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: COMMISSION % RULES (ADMIN DECISION / SETUP) */}
        <TabsContent value="rules" className="space-y-4 m-0">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border">
            <div>
              <h3 className="text-sm font-bold text-foreground">Active Commission Percentage Policies</h3>
              <p className="text-xs text-muted-foreground">
                Define the default commission rate (%) applicable when employees close student admissions for specific courses or roles.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setEditingRuleId(null);
                setRuleTitle("");
                setRuleDesc("");
                setRuleRate("7.5");
                setRuleDialogOpen(true);
              }}
              className="text-xs font-bold bg-[#800000] text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Commission Rule
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rules.map((r) => (
              <Card key={r.id} className="p-5 rounded-2xl border bg-card shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-foreground leading-snug">{r.title}</h4>
                    <Badge className="bg-rose-500/10 text-[#800000] border-rose-500/30 text-xs font-extrabold font-mono">
                      {r.commission_percentage}%
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {r.description || "Applicable for sales and direct student admission closures."}
                  </p>

                  <div className="space-y-1 text-[11px] pt-2 border-t text-muted-foreground">
                    <div>
                      <span className="font-bold">Applicable Role:</span> {r.applicable_role}
                    </div>
                    <div>
                      <span className="font-bold">Course / Stream:</span> {r.course_name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t text-xs">
                  <span className={`inline-flex items-center gap-1 font-bold ${r.is_active ? "text-emerald-600" : "text-slate-400"}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> {r.is_active ? "Active Policy" : "Disabled"}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEditRule(r)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteRule(r.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG 1: LOG EMPLOYEE COMMISSION */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" /> Log Employee Sales Commission
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record a student admission sale and calculate the exact commission payout and justification reason.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCommission} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Employee Name *</Label>
                <Input
                  required
                  placeholder="e.g. Ananya Sen"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Employee Role</Label>
                <Select value={empRole} onValueChange={setEmpRole}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {roles.length > 0
                      ? roles.map((role) => (
                          <SelectItem key={role.id || role.code} value={role.name} className="text-xs">
                            {role.name}
                          </SelectItem>
                        ))
                      : EMPLOYEE_ROLES.map((role) => (
                          <SelectItem key={role} value={role} className="text-xs">
                            {role}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Course / Program Sold *</Label>
                {courses.length > 0 ? (
                  <Select value={courseTitle} onValueChange={setCourseTitle}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select enrolled course" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.title} className="text-xs">
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    required
                    placeholder="e.g. B.Tech CS & AI"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="text-xs h-9"
                  />
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Enrolled Student Name</Label>
                <Input
                  placeholder="e.g. Pooja Verma"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Sale & Rate Calculation */}
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-muted/40 border">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Total Sale (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(e.target.value)}
                  className="text-xs h-8 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Commission %</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="text-xs h-8 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-primary">Payout Amount (₹)</Label>
                <div className="h-8 rounded-md bg-background border px-2 flex items-center font-mono font-extrabold text-xs text-foreground">
                  ₹{computedCommAmount.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Reason of Commission (CRITICAL REQUIREMENT) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Reason of Commission / Justification *</Label>
                <span className="text-[10px] text-muted-foreground">Select template below or write custom</span>
              </div>
              <Textarea
                required
                rows={2}
                placeholder="Reason for granting this commission (e.g. Direct conversion, Spot registration, Referral bonus)..."
                value={commissionReason}
                onChange={(e) => setCommissionReason(e.target.value)}
                className="text-xs resize-none"
              />

              {/* Quick Template Pills */}
              <div className="flex flex-wrap gap-1 pt-1">
                {COMMISSION_REASON_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCommissionReason(tmpl)}
                    className="text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md border border-border/60 transition-colors text-left"
                  >
                    + {tmpl.slice(0, 36)}...
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Payout Status</Label>
              <Select value={commissionStatus} onValueChange={(v: any) => setCommissionStatus(v)}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved for Payout</SelectItem>
                  <SelectItem value="paid">Paid & Disbursed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setLogDialogOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={savingCommission} size="sm" className="bg-[#800000] text-white font-bold text-xs">
                {savingCommission ? "Saving..." : "Save Commission Record"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: SET / CONFIGURE COMMISSION % RULE */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              {editingRuleId ? "Edit Commission Percentage Policy" : "Create Commission % Policy"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the percentage commission and rules that your institution grants on sales.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRule} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Policy / Rule Title *</Label>
              <Input
                required
                placeholder="e.g. Standard Degree Admission Incentive"
                value={ruleTitle}
                onChange={(e) => setRuleTitle(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Commission % Rate *</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  placeholder="e.g. 8.5"
                  value={ruleRate}
                  onChange={(e) => setRuleRate(e.target.value)}
                  className="text-xs h-9 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Applicable Staff Role</Label>
                <Select value={ruleRole} onValueChange={setRuleRole}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select staff role" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all" className="font-semibold text-xs">All Roles</SelectItem>
                    {roles.length > 0
                      ? roles.map((role) => (
                          <SelectItem key={role.id || role.code} value={role.name} className="text-xs">
                            {role.name}
                          </SelectItem>
                        ))
                      : EMPLOYEE_ROLES.map((role) => (
                          <SelectItem key={role} value={role} className="text-xs">
                            {role}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Course / Department Scope</Label>
              <Select value={ruleCourse} onValueChange={setRuleCourse}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Select course scope" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="All Courses" className="font-semibold text-xs">All Courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.title} className="text-xs">
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Policy Description</Label>
              <Textarea
                rows={2}
                placeholder="Explanation of eligibility and conditions for this commission rate..."
                value={ruleDesc}
                onChange={(e) => setRuleDesc(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border">
              <span className="text-xs font-semibold">Activate this Policy</span>
              <Switch checked={ruleActive} onCheckedChange={setRuleActive} />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setRuleDialogOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={savingRule} size="sm" className="bg-[#800000] text-white font-bold text-xs">
                {savingRule ? "Saving..." : "Save Policy"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

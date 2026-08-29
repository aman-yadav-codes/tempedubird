"use client";

import { useEffect, useState } from "react";
import {
  GraduationCap,
  Search,
  Filter,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Building2,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  Clock,
  IndianRupee,
  MessageSquare,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuthStore } from "@/store";

type InstitutionOption = {
  id: number;
  name: string;
  slug: string;
  type_name?: string;
};

type EnrollmentRecord = {
  enrollment_id: number;
  enrollment_status: string;
  admission_date: string;
  created_at: string;
  user_id: number;
  student_name: string;
  student_email: string;
  student_phone: string;
  student_profile_id: number;
  admission_number?: string;
  program_id: number;
  program_title: string;
  program_code?: string;
  program_duration?: string;
  program_fee: string | number;
  teaching_method?: string | null;
  seats_available?: number | null;
  languages?: string | null;
  fee_components?: Array<{
    id?: number;
    title: string;
    amount: number;
    unit?: string | null;
    payment_mode?: string | null;
    discount_type?: string | null;
    discount_value?: number | null;
    final_amount?: number | null;
    installments_count?: number | null;
  }> | null;
  institution_id: number;
  institution_name: string;
  institution_slug?: string;
  guardian_info?: {
    guardian_name?: string;
    guardian_phone?: string;
    guardian_email?: string;
    relationship?: string;
  } | null;
};

type Stats = {
  totalEnrollments: number;
  enrollmentsThisMonth: number;
  activeCount: number;
  totalRevenueValue: number;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Active / Enrolled", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  confirmed: { label: "Confirmed", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  contacted: { label: "Contacted", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  pending: { label: "Pending Review", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function AdminSalesEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEnrollments: 0,
    enrollmentsThisMonth: 0,
    activeCount: 0,
    totalRevenueValue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInstitutionFilter, setSelectedInstitutionFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const { accessToken } = useAuthStore();

  useEffect(() => {
    fetchInstitutions();
  }, [accessToken]);

  useEffect(() => {
    fetchEnrollments();

    const handleUpdate = () => fetchEnrollments();
    window.addEventListener("student_enrollment_updated", handleUpdate);
    return () => {
      window.removeEventListener("student_enrollment_updated", handleUpdate);
    };
  }, [statusFilter, selectedInstitutionFilter, accessToken]);

  const fetchInstitutions = async () => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/institutions/options", { headers });
      if (res.ok) {
        const json = await res.json();
        setInstitutions(json.institutions || []);
      }
    } catch (err) {
      console.error("Error fetching institutions:", err);
    }
  };

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (selectedInstitutionFilter !== "all") params.set("institutionId", selectedInstitutionFilter);

      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/sales/enrollments?${params.toString()}`, { headers });
      const json = await res.json();
      if (res.ok) {
        setEnrollments(json.data || []);
        if (json.stats) setStats(json.stats);
      } else {
        toast.error(json.error || "Failed to load enrollment records");
      }
    } catch (err) {
      toast.error("Error loading course enrollments");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (enrollmentId: number, nextStatus: string) => {
    setUpdatingId(enrollmentId);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/sales/enrollments", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ enrollmentId, status: nextStatus }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update status");

      toast.success(`Status updated to "${nextStatus}"`);
      fetchEnrollments();
    } catch (err: any) {
      toast.error(err.message || "Could not update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredEnrollments = enrollments.filter(
    (e) =>
      e.student_name.toLowerCase().includes(search.toLowerCase()) ||
      e.student_email.toLowerCase().includes(search.toLowerCase()) ||
      e.student_phone.toLowerCase().includes(search.toLowerCase()) ||
      e.program_title.toLowerCase().includes(search.toLowerCase()) ||
      (e.institution_name && e.institution_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Sales & Enrollment Management</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Course Enrollments & Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track student course enrollment applications, view applicant details, and update admission pipeline stages.
          </p>
        </div>

        <Button onClick={fetchEnrollments} variant="outline" size="sm" className="font-bold gap-2 text-xs h-9">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* Summary Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Total Enrollments</span>
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{stats.totalEnrollments}</p>
          <p className="text-[11px] text-muted-foreground">Course applications received</p>
        </Card>

        <Card className="p-4 bg-card border-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">This Month</span>
            <Calendar className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-blue-600">{stats.enrollmentsThisMonth}</p>
          <p className="text-[11px] text-muted-foreground">Applications in current month</p>
        </Card>

        <Card className="p-4 bg-card border-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Active / Confirmed</span>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">{stats.activeCount}</p>
          <p className="text-[11px] text-muted-foreground">Enrolled students</p>
        </Card>

        <Card className="p-4 bg-card border-border shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Pipeline Revenue Value</span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">
            ₹{Number(stats.totalRevenueValue || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-muted-foreground">Total course fee potential</p>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student name, email, phone, course..."
            className="pl-9 text-xs h-10 bg-background"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground shrink-0">Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-10 text-xs bg-background">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active / Enrolled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Institution Filter (for Super Admin / Multi-institution) */}
          {institutions.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground shrink-0">Institution:</span>
              <Select value={selectedInstitutionFilter} onValueChange={setSelectedInstitutionFilter}>
                <SelectTrigger className="w-[200px] h-10 text-xs bg-background">
                  <SelectValue placeholder="All Institutions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Institutions ({institutions.length})</SelectItem>
                  {institutions.map((inst) => (
                    <SelectItem key={inst.id} value={String(inst.id)}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Enrollments Data List / Table */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading enrollment applications...</span>
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground space-y-3">
          <GraduationCap className="h-10 w-10 mx-auto opacity-30 text-primary" />
          <p className="font-semibold text-lg text-foreground">No Course Enrollments Found</p>
          <p className="text-xs">When users click "Enroll Now" on your listed courses, their applications will appear here.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Showing {filteredEnrollments.length} Enrollment Application Records
            </span>
          </div>

          <div className="grid gap-4 grid-cols-1">
            {filteredEnrollments.map((item) => {
              const statusCfg = STATUS_CONFIG[item.enrollment_status?.toLowerCase()] || {
                label: item.enrollment_status || "Active",
                color: "bg-primary/10 text-primary border-primary/20",
              };

              const formattedFee = item.program_fee
                ? `₹${Number(String(item.program_fee).replace(/[^0-9.]/g, "") || 25000).toLocaleString("en-IN")}`
                : "Standard Fee";

              return (
                <Card key={item.enrollment_id} className="p-5 shadow-xs hover:border-primary/40 transition-all bg-card border-border">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left Column: Student Details & Course */}
                    <div className="space-y-2.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-extrabold text-foreground truncate">
                          {item.student_name}
                        </span>
                        {item.admission_number && (
                          <Badge variant="secondary" className="text-[10px] font-bold font-mono">
                            {item.admission_number}
                          </Badge>
                        )}
                        {item.guardian_info?.guardian_name && (
                          <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-bold">
                            👨‍👩‍👧 Parent: {item.guardian_info.guardian_name} {item.guardian_info.guardian_phone ? `(${item.guardian_info.guardian_phone})` : ""}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[11px] font-bold ${statusCfg.color}`}>
                          {statusCfg.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                          <Clock className="h-3 w-3 text-primary shrink-0" />
                          {new Date(item.created_at || Date.now()).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-muted/40 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Enrolled Course</span>
                          <span className="font-bold text-foreground truncate block">{item.program_title}</span>
                          <span className="text-[11px] text-primary font-medium block">
                            {item.program_duration || "Standard Duration"}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-muted/40 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Course Fee</span>
                          <span className="font-extrabold text-emerald-600 block text-sm">{formattedFee}</span>
                          {item.fee_components && item.fee_components.length > 0 && (
                            <span className="text-[10.5px] text-muted-foreground block truncate">
                              {item.fee_components.length} payment plan{item.fee_components.length > 1 ? "s" : ""} available
                            </span>
                          )}
                        </div>

                        <div className="p-2 rounded-lg bg-muted/40 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Mode & Seats</span>
                          <span className="font-bold text-foreground truncate block">
                            {item.teaching_method || "Classroom / Offline"}
                          </span>
                          <span className="text-[11px] text-muted-foreground block">
                            {item.seats_available != null ? `${item.seats_available} Seats` : "Open Intake"}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-muted/40 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Institution & Lang</span>
                          <span className="font-bold text-foreground truncate block">{item.institution_name}</span>
                          <span className="text-[11px] text-muted-foreground block truncate">
                            {item.languages || "English, Hindi"}
                          </span>
                        </div>
                      </div>

                      {/* Fee Breakdown Badges if components present */}
                      {item.fee_components && item.fee_components.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {item.fee_components.map((fc, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] py-0 px-1.5 font-semibold bg-background">
                              {fc.title}: <strong className="text-primary ml-0.5">₹{Number(fc.amount).toLocaleString()}</strong>/{fc.unit || "mo"}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                        {item.student_email && (
                          <a
                            href={`mailto:${item.student_email}`}
                            className="flex items-center gap-1 hover:text-primary transition-colors truncate"
                          >
                            <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{item.student_email}</span>
                          </a>
                        )}

                        {item.student_phone && (
                          <a
                            href={`tel:${item.student_phone}`}
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{item.student_phone}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Actions & Status Change Menu */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingId === item.enrollment_id}
                            className="text-xs font-semibold h-9 gap-1.5 bg-background shadow-2xs"
                          >
                            {updatingId === item.enrollment_id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <span>Status: {statusCfg.label}</span>
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-xs">Update Pipeline Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleUpdateStatus(item.enrollment_id, "active")}>
                            Active / Enrolled
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(item.enrollment_id, "confirmed")}>
                            Confirmed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(item.enrollment_id, "contacted")}>
                            Contacted
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(item.enrollment_id, "pending")}>
                            Pending Review
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(item.enrollment_id, "cancelled")} className="text-destructive font-semibold">
                            Cancelled
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <div className="flex items-center gap-2">
                        {item.student_phone && (
                          <a
                            href={`https://wa.me/${item.student_phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10">
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>WhatsApp</span>
                            </Button>
                          </a>
                        )}

                        {item.student_email && (
                          <a href={`mailto:${item.student_email}?subject=Regarding your enrollment in ${encodeURIComponent(item.program_title)}`}>
                            <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1 text-blue-600 border-blue-500/30 hover:bg-blue-500/10">
                              <Mail className="h-3.5 w-3.5" />
                              <span>Email</span>
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

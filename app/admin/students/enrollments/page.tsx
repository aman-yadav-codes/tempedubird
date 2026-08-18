"use client";

import { useEffect, useState, useCallback } from "react";
import {
  GraduationCap,
  Building2,
  CalendarDays,
  Search,
  CheckCircle2,
  Clock,
  Loader2,
  UserCheck,
  CreditCard,
  Mail,
  Phone,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InstitutePagination } from "@/components/public/institutes/institute-pagination";

interface EnrollmentRecord {
  enrollment_id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  student_phone: string;
  student_avatar?: string;
  institution_id: number;
  institution_name: string;
  institution_logo?: string;
  program_id: number;
  program_title: string;
  program_fee?: string | number;
  duration_value?: number;
  duration_unit?: string;
  academic_year_name?: string;
  status: string;
  admission_date?: string;
  created_at: string;
}

export default function AdminEnrollmentsPage() {
  const { accessToken } = useAuthStore();
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchEnrollments = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
      });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/students/enrollments/all?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load enrollments");

      setEnrollments(json.data || []);
      setPageCount(json.pageCount || 1);
      setTotalCount(json.total || 0);
    } catch (err: any) {
      toast.error(err.message || "Could not fetch enrollment records");
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, search, statusFilter]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const activeCount = enrollments.filter((e) => e.status === "active").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            Program Enrollments Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track student program applications and course enrollments across institutions.
          </p>
        </div>

        <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold gap-1.5">
          <UserCheck className="h-4 w-4 text-emerald-500" />
          {totalCount} Total Student Applications
        </Badge>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 bg-card shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Applications</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{totalCount}</h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Active Enrollments</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Institutions</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {new Set(enrollments.map((e) => e.institution_id)).size}
              </h3>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="flex flex-1 items-center gap-2 min-w-[240px]">
          <Search className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
          <Input
            placeholder="Search by student, program, or institution..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="border-0 shadow-none focus-visible:ring-0 text-sm h-9"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border border-border shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-bold text-xs">Student Details</TableHead>
              <TableHead className="font-bold text-xs">Enrolled Program</TableHead>
              <TableHead className="font-bold text-xs">Institution</TableHead>
              <TableHead className="font-bold text-xs">Fee Amount</TableHead>
              <TableHead className="font-bold text-xs">Status</TableHead>
              <TableHead className="font-bold text-xs text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Loading enrollment records...</p>
                </TableCell>
              </TableRow>
            ) : enrollments.length > 0 ? (
              enrollments.map((record) => (
                <TableRow key={record.enrollment_id} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-bold text-sm text-foreground">{record.student_name}</p>
                      {record.student_email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3 text-primary shrink-0" />
                          {record.student_email}
                        </p>
                      )}
                      {record.student_phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3 text-primary shrink-0" />
                          {record.student_phone}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-foreground leading-tight">
                        {record.program_title}
                      </p>
                      {record.academic_year_name && (
                        <Badge variant="outline" className="text-[10px]">
                          {record.academic_year_name}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium text-xs text-foreground truncate max-w-[180px]">
                        {record.institution_name}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="font-bold text-xs text-foreground">
                      {record.program_fee
                        ? `₹${Number(record.program_fee).toLocaleString("en-IN")}`
                        : "Standard Fee"}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={
                        record.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold"
                      }
                      variant="outline"
                    >
                      {record.status.toUpperCase()}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right text-xs text-muted-foreground">
                    {record.created_at ? new Date(record.created_at).toLocaleDateString() : "-"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                  No program enrollment applications found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {pageCount > 1 && (
          <div className="p-4 border-t border-border flex justify-end">
            <InstitutePagination
              page={page}
              pageCount={pageCount}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

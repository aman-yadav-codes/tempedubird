"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  IndianRupee,
  RefreshCw,
  Tag,
  Check,
  X,
  Edit2,
  Trash2,
  Users,
  Phone,
  Mail,
  Calendar,
  Building2,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
  BookOpen,
  Receipt,
  Clock,
  Layers,
  School,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export type StudentAdmissionRecord = {
  id: number;
  name: string;
  roll_number: string;
  email?: string;
  phone?: string;
  guardian_name?: string;
  guardian_phone?: string;
  course_program: string;
  batch_section?: string;
  admission_date?: string;
  fee_amount: number | string;
  fee_status: string;
  academic_status: string;
  address?: string;
  notes?: string;
  status: string;
  created_at?: string;
};

const COMMON_PROGRAMS = [
  "Class 11 & 12 Science (PCM/PCB)",
  "NEET Foundation & Target Batch",
  "JEE Main & Advanced Coaching",
  "Class 9 & 10 Foundation (CBSE/State)",
  "Commerce & Accountancy (11th & 12th)",
  "Police Bharti & Defense Exam Prep",
  "Railway & SSC Competitive Exams",
  "Computer & Professional Certifications",
];

const BATCH_SECTIONS = [
  "Batch A (Morning 07:00 AM - 10:00 AM)",
  "Batch B (Afternoon 02:00 PM - 05:00 PM)",
  "Batch C (Evening 05:00 PM - 08:00 PM)",
  "Weekend Target Batch",
];

export default function SalesStudentsPage() {
  const { user } = useAuthStore();
  const [students, setStudents] = useState<StudentAdmissionRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, enrolled: 0, fee_paid: 0, fee_pending: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [feeStatusFilter, setFeeStatusFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentAdmissionRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    roll_number: "",
    email: "",
    phone: "",
    guardian_name: "",
    guardian_phone: "",
    course_program: "Class 11 & 12 Science (PCM/PCB)",
    batch_section: "Batch A (Morning 07:00 AM - 10:00 AM)",
    admission_date: new Date().toISOString().split("T")[0],
    fee_amount: "15000",
    fee_status: "pending",
    academic_status: "enrolled",
    address: "",
    notes: "",
    status: "active",
  });

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (courseFilter !== "all") params.set("course_program", courseFilter);
      if (feeStatusFilter !== "all") params.set("fee_status", feeStatusFilter);

      const res = await fetch(`/api/admin/sales/students?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load student admissions");
      const data = await res.json();
      setStudents(data.students || []);
      setStats(data.stats || { total: 0, enrolled: 0, fee_paid: 0, fee_pending: 0 });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load student admissions");
    } finally {
      setLoading(false);
    }
  }, [search, courseFilter, feeStatusFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      name: "",
      roll_number: `STU-${new Date().getFullYear().toString().slice(-2)}${Math.floor(1000 + Math.random() * 9000)}`,
      email: "",
      phone: "",
      guardian_name: "",
      guardian_phone: "",
      course_program: "Class 11 & 12 Science (PCM/PCB)",
      batch_section: "Batch A (Morning 07:00 AM - 10:00 AM)",
      admission_date: new Date().toISOString().split("T")[0],
      fee_amount: "15000",
      fee_status: "pending",
      academic_status: "enrolled",
      address: "",
      notes: "",
      status: "active",
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (s: StudentAdmissionRecord) => {
    setEditingStudent(s);
    setFormData({
      name: s.name || "",
      roll_number: s.roll_number || "",
      email: s.email || "",
      phone: s.phone || "",
      guardian_name: s.guardian_name || "",
      guardian_phone: s.guardian_phone || "",
      course_program: s.course_program || "Class 11 & 12 Science (PCM/PCB)",
      batch_section: s.batch_section || "Batch A (Morning 07:00 AM - 10:00 AM)",
      admission_date: s.admission_date ? s.admission_date.split("T")[0] : new Date().toISOString().split("T")[0],
      fee_amount: s.fee_amount ? String(s.fee_amount) : "0",
      fee_status: s.fee_status || "pending",
      academic_status: s.academic_status || "enrolled",
      address: s.address || "",
      notes: s.notes || "",
      status: s.status || "active",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter student name");
      return;
    }

    try {
      setSubmitting(true);
      const url = editingStudent ? `/api/admin/sales/students/${editingStudent.id}` : `/api/admin/sales/students`;
      const method = editingStudent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save student admission");
      }

      toast.success(editingStudent ? "Student record updated!" : "Student admission successfully created!");
      setDialogOpen(false);
      fetchStudents();
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/sales/students/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete student admission");
      toast.success("Student admission removed");
      setDeleteConfirmId(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
              <GraduationCap className="size-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Student Admissions & Enrollments
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student applications, coaching enrollments, batch assignments, and fee records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchStudents}
            className="rounded-xl h-9 gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            onClick={handleOpenAdd}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-9 px-4 gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            <span>New Admission</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Admissions</p>
              <p className="text-2xl font-black text-foreground mt-1">{stats.total}</p>
            </div>
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrolled Students</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{stats.enrolled}</p>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fee Paid</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">{stats.fee_paid}</p>
            </div>
            <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Receipt className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fee Pending</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{stats.fee_pending}</p>
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-card p-3 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by student name, roll number, course, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-[190px] h-10 rounded-xl bg-background">
              <SelectValue placeholder="Course / Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {COMMON_PROGRAMS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={feeStatusFilter} onValueChange={setFeeStatusFilter}>
            <SelectTrigger className="w-[140px] h-10 rounded-xl bg-background">
              <SelectValue placeholder="Fee Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fees</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Students Table */}
      {loading ? (
        <div className="p-8 text-center bg-card rounded-2xl border animate-pulse">
          Loading student admissions...
        </div>
      ) : students.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-card space-y-3">
          <div className="size-14 rounded-2xl bg-indigo-500/10 text-indigo-600 mx-auto flex items-center justify-center">
            <GraduationCap className="size-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No Student Admissions Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Enroll students into batches, record tuition fees, and manage admission forms.
          </p>
          <Button onClick={handleOpenAdd} className="mt-2 rounded-xl">
            <Plus className="size-4 mr-1.5" />
            New Admission
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student & Roll No</TableHead>
                <TableHead>Program & Batch</TableHead>
                <TableHead>Parent / Guardian</TableHead>
                <TableHead>Contact & Phone</TableHead>
                <TableHead>Course Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell>
                    <div className="font-bold text-foreground">{s.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{s.roll_number}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-semibold text-primary">{s.course_program}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.batch_section || "General Batch"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{s.guardian_name || "N/A"}</div>
                    {s.guardian_phone && (
                      <div className="text-xs text-muted-foreground">{s.guardian_phone}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{s.phone || "No Phone"}</div>
                    {s.email && <div className="text-xs text-muted-foreground">{s.email}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-bold text-foreground">
                      ₹{Number(s.fee_amount).toLocaleString("en-IN")}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold mt-0.5 ${
                        s.fee_status === "paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : s.fee_status === "partial"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {s.fee_status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        s.academic_status === "enrolled"
                          ? "bg-emerald-600 text-white"
                          : "bg-blue-600 text-white"
                      }
                    >
                      {s.academic_status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(s)}
                        className="size-8 p-0"
                        title="Edit Details"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirmId(s.id)}
                        className="size-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        title="Delete Record"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {editingStudent ? "Edit Student Admission" : "New Student Admission"}
            </DialogTitle>
            <DialogDescription>
              Record student enrollment, academic program, fee details, and parent contact.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">Student Full Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Ankit Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="roll_number">Roll / Admission Number</Label>
                <Input
                  id="roll_number"
                  value={formData.roll_number}
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admission_date">Admission Date</Label>
                <Input
                  id="admission_date"
                  type="date"
                  value={formData.admission_date}
                  onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="course_program">Target Course / Academic Program</Label>
                <Select
                  value={formData.course_program}
                  onValueChange={(val) => setFormData({ ...formData, course_program: val })}
                >
                  <SelectTrigger id="course_program">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_PROGRAMS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="batch_section">Batch & Timing</Label>
                <Select
                  value={formData.batch_section}
                  onValueChange={(val) => setFormData({ ...formData, batch_section: val })}
                >
                  <SelectTrigger id="batch_section">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BATCH_SECTIONS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Student Mobile Number *</Label>
                <Input
                  id="phone"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guardian_name">Father / Guardian Name</Label>
                <Input
                  id="guardian_name"
                  placeholder="e.g. Rajesh Sharma"
                  value={formData.guardian_name}
                  onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guardian_phone">Parent / Guardian Contact</Label>
                <Input
                  id="guardian_phone"
                  placeholder="e.g. +91 91234 56789"
                  value={formData.guardian_phone}
                  onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fee_amount">Total Course Fee (₹)</Label>
                <Input
                  id="fee_amount"
                  type="number"
                  value={formData.fee_amount}
                  onChange={(e) => setFormData({ ...formData, fee_amount: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fee_status">Fee Payment Status</Label>
                <Select
                  value={formData.fee_status}
                  onValueChange={(val) => setFormData({ ...formData, fee_status: val })}
                >
                  <SelectTrigger id="fee_status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="academic_status">Enrollment Status</Label>
                <Select
                  value={formData.academic_status}
                  onValueChange={(val) => setFormData({ ...formData, academic_status: val })}
                >
                  <SelectTrigger id="academic_status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enrolled">Enrolled</SelectItem>
                    <SelectItem value="prospective">Prospective</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Account Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Residential Address</Label>
                <Input
                  id="address"
                  placeholder="e.g. Shivpur, Varanasi"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Remarks / Previous Academic Background</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  placeholder="e.g. Scored 88% in 10th Board, interested in medical entrance preparation..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingStudent ? "Save Changes" : "Admit Student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Student Admission</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this student admission record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

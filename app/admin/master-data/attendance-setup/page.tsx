"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Calendar,
  Users,
  GraduationCap,
  Sparkles,
  Loader2,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Info,
  CalendarDays,
  Bell,
  Check,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AttendanceSetup = {
  id: number;
  institution_id?: number | null;
  title: string;
  target_type: "STUDENTS" | "STAFF" | "ALL";
  attendance_mode: "FULL_DAY" | "PERIOD_WISE" | "BIOMETRIC" | "QR_CODE";
  who_can_mark?: string | null;
  start_time: string;
  end_time: string;
  grace_period_mins: number;
  half_day_time: string;
  min_attendance_percentage?: number;
  working_days: string[];
  auto_notify_absent?: boolean;
  is_active?: boolean;
  is_default?: boolean;
  is_dummy?: boolean;
  created_at?: string;
  updated_at?: string;
};

type Stats = {
  total: number;
  student_setups: number;
  staff_setups: number;
  active_setups: number;
  dummy_setups: number;
};

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const initialForm = {
  title: "",
  target_type: "STUDENTS" as "STUDENTS" | "STAFF" | "ALL",
  attendance_mode: "FULL_DAY" as "FULL_DAY" | "PERIOD_WISE" | "BIOMETRIC" | "QR_CODE",
  who_can_mark: "TEACHER",
  start_time: "08:00",
  end_time: "14:30",
  grace_period_mins: 15,
  half_day_time: "11:30",
  working_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  is_active: true,
};

const formatMarkingAuthorityLabel = (who?: string | null, target?: string) => {
  if (!who || who === "INSTITUTION_ADMIN") return "Institution Admin Only";
  if (who === "STAFF_SELF") return "Staff / Employee Self-Marking";
  if (who === "BOTH") return target === "STAFF" ? "Both (Admin & Staff)" : "Both Admin & Members";
  if (who === "TEACHER") return "Teachers Only";
  if (who === "STUDENT_SELF") return "Student Self-Marking";
  if (who === "ADMIN_AND_TEACHER") return "Both Admin & Teachers";
  if (who === "ALL") return "Any / All (Admin, Teachers & Students)";
  if (who === "TEACHER_AND_STAFF") return "Teachers & Staff";
  return who.replace(/_/g, " ");
};

const getMarkingAuthorityDescription = (who: string, target: string) => {
  if (target === "STAFF") {
    if (who === "INSTITUTION_ADMIN") return "🔒 Only Institution Admin has permission to mark attendance for staff.";
    if (who === "STAFF_SELF") return "👤 Staff & employees can mark their own attendance directly.";
    if (who === "BOTH") return "🤝 Both Institution Admin and Staff can mark attendance.";
  } else if (target === "STUDENTS") {
    if (who === "INSTITUTION_ADMIN") return "🔒 Only Institution Admin has permission to mark attendance for students.";
    if (who === "TEACHER") return "👨‍🏫 Only assigned teachers / faculty can mark student attendance.";
    if (who === "STUDENT_SELF") return "🎓 Students can mark their own attendance when in class / campus.";
    if (who === "ADMIN_AND_TEACHER") return "🤝 Both Institution Admin and Teachers can mark student attendance.";
    if (who === "ALL") return "✨ Any of them (Institution Admin, Teachers, or Student Self-Check-in) can mark attendance.";
  } else {
    if (who === "INSTITUTION_ADMIN") return "🔒 Only Institution Admin has permission to mark attendance.";
    if (who === "TEACHER_AND_STAFF") return "👨‍🏫 Teachers and staff members can mark attendance.";
    if (who === "ALL") return "✨ Any authorized user (Admin, Staff, or Students) can mark attendance.";
  }
  return "Select who can mark attendance for this group.";
};

export default function AttendanceSetupPage() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [setups, setSetups] = useState<AttendanceSetup[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    student_setups: 0,
    staff_setups: 0,
    active_setups: 0,
    dummy_setups: 0,
  });

  const [search, setSearch] = useState("");
  const [filterTarget, setFilterTarget] = useState<string>("ALL");

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<AttendanceSetup | null>(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<AttendanceSetup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSetups = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterTarget !== "ALL") params.set("target_type", filterTarget);

      const res = await fetch(`/api/admin/master-data/attendance-setup?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load attendance setups");

      setSetups(data.data || []);
      setStats(
        data.stats || {
          total: 0,
          student_setups: 0,
          staff_setups: 0,
          active_setups: 0,
          dummy_setups: 0,
        }
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch attendance setups");
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, filterTarget]);

  useEffect(() => {
    fetchSetups();
  }, [fetchSetups]);

  const handleOpenAdd = () => {
    setEditingSetup(null);
    setForm(initialForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: AttendanceSetup) => {
    setEditingSetup(item);
    setForm({
      title: item.title,
      target_type: item.target_type,
      attendance_mode: item.attendance_mode,
      who_can_mark: item.who_can_mark || (item.target_type === "STAFF" ? "BOTH" : item.target_type === "STUDENTS" ? "TEACHER" : "INSTITUTION_ADMIN"),
      start_time: item.start_time || "08:00",
      end_time: item.end_time || "14:30",
      grace_period_mins: item.grace_period_mins || 15,
      half_day_time: item.half_day_time || "11:30",
      working_days: Array.isArray(item.working_days) ? item.working_days : ALL_DAYS.slice(0, 6),
      is_active: item.is_active !== undefined ? Boolean(item.is_active) : true,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Please enter a setup title.");
      return;
    }

    setSaving(true);
    try {
      const isEdit = Boolean(editingSetup?.id);
      const url = "/api/admin/master-data/attendance-setup";
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit ? { ...form, id: editingSetup?.id } : form;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save attendance setup");

      toast.success(isEdit ? "Attendance setup modified!" : "New attendance setup created!");
      setDialogOpen(false);
      fetchSetups();
    } catch (err: any) {
      toast.error(err.message || "Failed to save setup");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/master-data/attendance-setup?id=${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete setup");

      toast.success(`"${deleteTarget.title}" deleted successfully.`);
      setDeleteTarget(null);
      fetchSetups();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete setup");
    } finally {
      setDeleting(false);
    }
  };

  const toggleDay = (day: string) => {
    if (form.working_days.includes(day)) {
      setForm({ ...form, working_days: form.working_days.filter((d) => d !== day) });
    } else {
      setForm({ ...form, working_days: [...form.working_days, day] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <ClipboardCheck className="size-4" />
            Attendance Rules & Shifts
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground">
            Attendance Setup & Shifts
          </h1>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
            Configure default working hours, grace periods, biometric & period-wise shifts, and automatic attendance policies for students and staff.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenAdd} className="h-9 gap-1.5 font-bold text-xs">
            <Plus className="size-4" />
            Create Attendance Setup
          </Button>
        </div>
      </div>

      {/* Notice info banner for dummy pre-configured setups */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              Default Sample Setup Included
              <Badge variant="outline" className="text-[10px] bg-background">Ready to Use</Badge>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Standard attendance shifts (Academic, Faculty, Period-wise) are pre-loaded. You can modify any timing/policy, delete them, or add your custom shifts.
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Shifts</span>
            <ClipboardCheck className="size-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Configured shifts</p>
        </Card>

        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Student Shifts</span>
            <GraduationCap className="size-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{stats.student_setups}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Academic batches</p>
        </Card>

        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Staff & Faculty</span>
            <Users className="size-4 text-purple-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{stats.staff_setups}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Employee timings</p>
        </Card>

        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Policies</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.active_setups}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Currently enforced</p>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search shift or setup name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            size="sm"
            variant={filterTarget === "ALL" ? "default" : "outline"}
            className="h-8 text-xs font-semibold px-3"
            onClick={() => setFilterTarget("ALL")}
          >
            All ({stats.total})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filterTarget === "STUDENTS" ? "default" : "outline"}
            className="h-8 text-xs font-semibold px-3 gap-1"
            onClick={() => setFilterTarget("STUDENTS")}
          >
            <GraduationCap className="size-3.5" />
            For Students ({stats.student_setups})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filterTarget === "STAFF" ? "default" : "outline"}
            className="h-8 text-xs font-semibold px-3 gap-1"
            onClick={() => setFilterTarget("STAFF")}
          >
            <Users className="size-3.5" />
            For Staff ({stats.staff_setups})
          </Button>
        </div>
      </div>

      {/* List of Setups */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Loader2 className="size-8 animate-spin text-primary mb-3" />
          <p className="text-xs text-muted-foreground">Loading attendance configurations...</p>
        </div>
      ) : setups.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <ClipboardCheck className="size-6" />
          </div>
          <h3 className="font-bold text-sm">No Attendance Setups Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Get started by creating your institution's first attendance shift and timing schedule.
          </p>
          <Button onClick={handleOpenAdd} size="sm" className="gap-1 text-xs font-bold">
            <Plus className="size-3.5" /> Create Setup
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {setups.map((setup) => {
            const isStudent = setup.target_type === "STUDENTS";
            const isStaff = setup.target_type === "STAFF";

            return (
              <Card
                key={setup.id}
                className={`flex flex-col justify-between border transition-all duration-200 hover:shadow-md ${
                  setup.is_default ? "border-primary/50 bg-primary/5" : "border-border/80 bg-card"
                }`}
              >
                <CardHeader className="p-4 pb-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant={isStudent ? "default" : isStaff ? "secondary" : "outline"}
                        className="text-[10px] font-bold"
                      >
                        {isStudent ? (
                          <GraduationCap className="size-3 mr-1 inline" />
                        ) : (
                          <Users className="size-3 mr-1 inline" />
                        )}
                        {setup.target_type}
                      </Badge>

                      <Badge variant="outline" className="text-[10px]">
                        {setup.attendance_mode.replace("_", " ")}
                      </Badge>

                      {setup.is_default && (
                        <Badge className="text-[10px] bg-primary text-primary-foreground font-bold">
                          Default Shift
                        </Badge>
                      )}

                      {setup.is_dummy && (
                        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                          Sample Setup
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenEdit(setup)}
                        title="Edit setup"
                      >
                        <Edit2 className="size-3.5 text-muted-foreground hover:text-primary" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(setup)}
                        title="Delete setup"
                      >
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <CardTitle className="text-sm font-bold text-foreground line-clamp-1">
                    {setup.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-3">
                  {/* Shift Timings */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-primary shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium">Timing</p>
                        <p className="font-bold">
                          {setup.start_time} – {setup.end_time}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">Grace Period</p>
                      <p className="font-bold">{setup.grace_period_mins} mins</p>
                    </div>
                  </div>

                  {/* Policy details */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserCheck className="size-3 text-primary" /> Marking Authority:
                      </span>
                      <span className="font-bold text-foreground">
                        {formatMarkingAuthorityLabel(setup.who_can_mark, setup.target_type)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Half-Day Threshold:</span>
                      <span className="font-semibold text-foreground">{setup.half_day_time || "11:30"}</span>
                    </div>
                  </div>

                  {/* Working Days Chips */}
                  <div className="pt-1">
                    <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Working Days</p>
                    <div className="flex flex-wrap gap-1">
                      {ALL_DAYS.map((day) => {
                        const isWorking = Array.isArray(setup.working_days) && setup.working_days.includes(day);
                        return (
                          <span
                            key={day}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isWorking
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "bg-muted text-muted-foreground/40 line-through"
                            }`}
                          >
                            {day}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="pt-2 border-t flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className={`size-2 rounded-full ${
                          setup.is_active ? "bg-emerald-500" : "bg-muted-foreground"
                        }`}
                      />
                      {setup.is_active ? "Active Rule" : "Inactive"}
                    </span>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(setup)}
                      className="h-7 text-xs font-semibold"
                    >
                      Modify Policy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-primary" />
              {editingSetup ? "Modify Attendance Setup" : "Create Attendance Setup"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="setup-title" className="text-xs font-bold">
                Setup Name / Policy Title *
              </Label>
              <Input
                id="setup-title"
                placeholder="e.g. Standard Academic Shift, Morning Faculty, Evening Coaching"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Target Audience</Label>
                <Select
                  value={form.target_type}
                  onValueChange={(val: any) => {
                    let defaultWho = "INSTITUTION_ADMIN";
                    if (val === "STAFF") defaultWho = "BOTH";
                    else if (val === "STUDENTS") defaultWho = "TEACHER";
                    setForm({ ...form, target_type: val, who_can_mark: defaultWho });
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENTS">Students (Academic)</SelectItem>
                    <SelectItem value="STAFF">Staff & Faculty</SelectItem>
                    <SelectItem value="ALL">All Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Attendance Mode</Label>
                <Select
                  value={form.attendance_mode}
                  onValueChange={(val: any) => setForm({ ...form, attendance_mode: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_DAY">Daily Full Day</SelectItem>
                    <SelectItem value="PERIOD_WISE">Period-Wise / Lecture</SelectItem>
                    <SelectItem value="BIOMETRIC">Biometric / RFID Card</SelectItem>
                    <SelectItem value="QR_CODE">QR Code / Geo-Fencing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Who Can Mark Attendance Selection */}
            <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-1.5">
                <UserCheck className="size-4 text-primary" />
                <Label className="text-xs font-bold">Who Can Mark Attendance? *</Label>
              </div>
              <Select
                value={form.who_can_mark}
                onValueChange={(val: string) => setForm({ ...form, who_can_mark: val })}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Select who can mark" />
                </SelectTrigger>
                <SelectContent>
                  {form.target_type === "STAFF" ? (
                    <>
                      <SelectItem value="INSTITUTION_ADMIN" className="text-xs">
                        Institution Admin Only
                      </SelectItem>
                      <SelectItem value="STAFF_SELF" className="text-xs">
                        Staff / Employee (Self-Marking)
                      </SelectItem>
                      <SelectItem value="BOTH" className="text-xs">
                        Both (Institution Admin & Staff)
                      </SelectItem>
                    </>
                  ) : form.target_type === "STUDENTS" ? (
                    <>
                      <SelectItem value="INSTITUTION_ADMIN" className="text-xs">
                        Institution Admin Only
                      </SelectItem>
                      <SelectItem value="TEACHER" className="text-xs">
                        Teachers Only
                      </SelectItem>
                      <SelectItem value="STUDENT_SELF" className="text-xs">
                        Students (Self-Marking)
                      </SelectItem>
                      <SelectItem value="ADMIN_AND_TEACHER" className="text-xs">
                        Both Admin & Teachers
                      </SelectItem>
                      <SelectItem value="ALL" className="text-xs">
                        Any / All of them (Admin, Teachers & Students)
                      </SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="INSTITUTION_ADMIN" className="text-xs">
                        Institution Admin Only
                      </SelectItem>
                      <SelectItem value="TEACHER_AND_STAFF" className="text-xs">
                        Teachers & Staff Members
                      </SelectItem>
                      <SelectItem value="ALL" className="text-xs">
                        Any / All of them (Admin, Staff & Students)
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground pt-0.5">
                {getMarkingAuthorityDescription(form.who_can_mark, form.target_type)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/20">
              <div className="space-y-1.5">
                <Label htmlFor="start-time" className="text-xs font-bold">
                  Shift Start Time
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="end-time" className="text-xs font-bold">
                  Shift End Time
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grace-time" className="text-xs font-bold">
                  Grace Period (Minutes)
                </Label>
                <Input
                  id="grace-time"
                  type="number"
                  placeholder="15"
                  value={form.grace_period_mins}
                  onChange={(e) => setForm({ ...form, grace_period_mins: Number(e.target.value) })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="half-day" className="text-xs font-bold">
                  Half-Day Cutoff Time
                </Label>
                <Input
                  id="half-day"
                  type="time"
                  value={form.half_day_time}
                  onChange={(e) => setForm({ ...form, half_day_time: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">
                Working Days (Days this shift operates)
              </Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {ALL_DAYS.map((day) => {
                  const active = form.working_days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`h-8 px-3 rounded-md text-xs font-bold border transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-input hover:bg-muted"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>



            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="text-xs h-9 font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                {editingSetup ? "Save Changes" : "Create Setup"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" /> Delete Attendance Setup
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteTarget?.title}"</strong>?
              {deleteTarget?.is_dummy && " This is a dummy template and can be removed cleanly."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Delete Setup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

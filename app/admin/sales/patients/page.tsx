"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  HeartPulse,
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
  Stethoscope,
  Activity,
  Droplet,
  MapPin,
  Clock,
  ShieldCheck,
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

export type PatientRecord = {
  id: number;
  name: string;
  patient_id_number: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  blood_group?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  department: string;
  doctor_assigned?: string;
  visit_type: string;
  consultation_fee: number | string;
  medical_history?: string;
  allergies?: string;
  status: string;
  created_at?: string;
};

const DEPARTMENTS = [
  "General Medicine",
  "Cardiology",
  "Dental Care",
  "Orthopedics",
  "Pediatrics",
  "Dermatology",
  "Ophthalmology",
  "Neurology",
  "Gynecology",
  "ENT (Ear, Nose, Throat)",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const VISIT_TYPES = ["OPD", "IPD", "Consultation", "Emergency", "Follow-up"];

export default function SalesPatientsPage() {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, opd: 0, ipd: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [visitFilter, setVisitFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    patient_id_number: "",
    age: "",
    gender: "Male",
    phone: "",
    email: "",
    blood_group: "O+",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    department: "General Medicine",
    doctor_assigned: "",
    visit_type: "OPD",
    consultation_fee: "500",
    medical_history: "",
    allergies: "",
    status: "active",
  });

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (deptFilter !== "all") params.set("department", deptFilter);
      if (visitFilter !== "all") params.set("visit_type", visitFilter);

      const res = await fetch(`/api/admin/sales/patients?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load patients");
      const data = await res.json();
      setPatients(data.patients || []);
      setStats(data.stats || { total: 0, active: 0, opd: 0, ipd: 0 });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load patient records");
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter, visitFilter]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleOpenAdd = () => {
    setEditingPatient(null);
    setFormData({
      name: "",
      patient_id_number: `PT-${new Date().getFullYear().toString().slice(-2)}${Math.floor(1000 + Math.random() * 9000)}`,
      age: "",
      gender: "Male",
      phone: "",
      email: "",
      blood_group: "O+",
      address: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      department: "General Medicine",
      doctor_assigned: "",
      visit_type: "OPD",
      consultation_fee: "500",
      medical_history: "",
      allergies: "",
      status: "active",
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (p: PatientRecord) => {
    setEditingPatient(p);
    setFormData({
      name: p.name || "",
      patient_id_number: p.patient_id_number || "",
      age: p.age ? String(p.age) : "",
      gender: p.gender || "Male",
      phone: p.phone || "",
      email: p.email || "",
      blood_group: p.blood_group || "O+",
      address: p.address || "",
      emergency_contact_name: p.emergency_contact_name || "",
      emergency_contact_phone: p.emergency_contact_phone || "",
      department: p.department || "General Medicine",
      doctor_assigned: p.doctor_assigned || "",
      visit_type: p.visit_type || "OPD",
      consultation_fee: p.consultation_fee ? String(p.consultation_fee) : "500",
      medical_history: p.medical_history || "",
      allergies: p.allergies || "",
      status: p.status || "active",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter patient name");
      return;
    }

    try {
      setSubmitting(true);
      const url = editingPatient ? `/api/admin/sales/patients/${editingPatient.id}` : `/api/admin/sales/patients`;
      const method = editingPatient ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save patient record");
      }

      toast.success(editingPatient ? "Patient record updated!" : "Patient successfully registered!");
      setDialogOpen(false);
      fetchPatients();
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/sales/patients/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete patient record");
      toast.success("Patient record removed");
      setDeleteConfirmId(null);
      fetchPatients();
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
            <div className="p-2 bg-rose-500/10 text-rose-600 rounded-xl">
              <HeartPulse className="size-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Patients & Clinical Admissions
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage clinic appointments, patient registrations, consultations, and doctor assignments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchPatients}
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
            <span>Register Patient</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Patients</p>
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Patients</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</p>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">OPD Consultations</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{stats.opd}</p>
            </div>
            <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <Stethoscope className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">IPD Admissions</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">{stats.ipd}</p>
            </div>
            <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Activity className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-card p-3 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient name, ID, phone, doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl bg-background">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={visitFilter} onValueChange={setVisitFilter}>
            <SelectTrigger className="w-[140px] h-10 rounded-xl bg-background">
              <SelectValue placeholder="Visit Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Visits</SelectItem>
              {VISIT_TYPES.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Patients Table */}
      {loading ? (
        <div className="p-8 text-center bg-card rounded-2xl border animate-pulse">
          Loading patient records...
        </div>
      ) : patients.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-card space-y-3">
          <div className="size-14 rounded-2xl bg-rose-500/10 text-rose-600 mx-auto flex items-center justify-center">
            <HeartPulse className="size-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No Patients Registered Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Register your clinical appointments, OPD consultations, and patient history.
          </p>
          <Button onClick={handleOpenAdd} className="mt-2 rounded-xl">
            <Plus className="size-4 mr-1.5" />
            Register First Patient
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient & ID</TableHead>
                <TableHead>Demographics</TableHead>
                <TableHead>Department & Doctor</TableHead>
                <TableHead>Contact & Phone</TableHead>
                <TableHead>Visit Type & Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell>
                    <div className="font-bold text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.patient_id_number}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {p.age ? `${p.age} Yrs` : "N/A"}, {p.gender}
                    </div>
                    {p.blood_group && (
                      <Badge variant="outline" className="text-[10px] font-bold mt-0.5 text-rose-600 bg-rose-50/50 border-rose-200">
                        <Droplet className="size-2.5 mr-0.5 fill-rose-500" /> {p.blood_group}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-semibold text-primary">{p.department}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.doctor_assigned ? `Dr. ${p.doctor_assigned.replace(/^Dr\.\s*/i, "")}` : "Not Assigned"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{p.phone || "No Phone"}</div>
                    {p.emergency_contact_phone && (
                      <div className="text-xs text-muted-foreground">
                        Emerg: {p.emergency_contact_phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-bold text-xs">
                      {p.visit_type}
                    </Badge>
                    <div className="text-xs font-semibold text-foreground mt-1">
                      ₹{Number(p.consultation_fee).toLocaleString("en-IN")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        p.status === "active"
                          ? "bg-emerald-600 text-white"
                          : p.status === "admitted"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-600 text-white"
                      }
                    >
                      {p.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(p)}
                        className="size-8 p-0"
                        title="Edit Details"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirmId(p.id)}
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
              {editingPatient ? "Edit Patient Record" : "Register New Patient"}
            </DialogTitle>
            <DialogDescription>
              Record patient medical details, clinical department, doctor assignment, and fees.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">Patient Full Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Ramesh Kumar Verma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="patient_id_number">Patient ID / MRN</Label>
                <Input
                  id="patient_id_number"
                  value={formData.patient_id_number}
                  onChange={(e) => setFormData({ ...formData, patient_id_number: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="age">Age (Years)</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="e.g. 34"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(val) => setFormData({ ...formData, gender: val })}
                >
                  <SelectTrigger id="gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="blood_group">Blood Group</Label>
                <Select
                  value={formData.blood_group}
                  onValueChange={(val) => setFormData({ ...formData, blood_group: val })}
                >
                  <SelectTrigger id="blood_group">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number *</Label>
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
                  placeholder="patient@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="department">Clinical Department</Label>
                <Select
                  value={formData.department}
                  onValueChange={(val) => setFormData({ ...formData, department: val })}
                >
                  <SelectTrigger id="department">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doctor_assigned">Assigned Doctor</Label>
                <Input
                  id="doctor_assigned"
                  placeholder="e.g. Dr. Alok Nath"
                  value={formData.doctor_assigned}
                  onChange={(e) => setFormData({ ...formData, doctor_assigned: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="visit_type">Visit Type</Label>
                <Select
                  value={formData.visit_type}
                  onValueChange={(val) => setFormData({ ...formData, visit_type: val })}
                >
                  <SelectTrigger id="visit_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_TYPES.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="consultation_fee">Consultation Fee (₹)</Label>
                <Input
                  id="consultation_fee"
                  type="number"
                  value={formData.consultation_fee}
                  onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  placeholder="e.g. Sunita Verma (Spouse)"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  placeholder="e.g. +91 91234 56789"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Address / Locality</Label>
                <Input
                  id="address"
                  placeholder="e.g. Flat 302, Green Park Apartments, Sigra, Varanasi"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="medical_history">Medical History / Symptoms</Label>
                <Textarea
                  id="medical_history"
                  rows={2}
                  placeholder="Known chronic illnesses, diabetes, hypertension, chief complaints..."
                  value={formData.medical_history}
                  onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="allergies">Known Drug / Food Allergies</Label>
                <Input
                  id="allergies"
                  placeholder="e.g. Penicillin, Sulfa drugs, Peanuts, None"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="admitted">Admitted</SelectItem>
                    <SelectItem value="discharged">Discharged</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingPatient ? "Save Changes" : "Register Patient"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Patient Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this patient record? This action cannot be undone.
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

"use client";

import { useEffect, useState } from "react";
import {
  Edit2,
  Loader2,
  Search,
  RefreshCw,
  CreditCard,
  GraduationCap,
  Building2,
  Clock,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useAuthStore } from "@/store";
import { getStoredActiveInstitutionId } from "@/lib/auth/active-institution";

type ProgramFee = {
  id: number;
  institution_id: number;
  institution_name: string;
  course_name: string;
  program_type_name: string | null;
  duration_value: number | null;
  duration_unit: string | null;
  fee_amount: number;
  fee_unit: string;
  admission_fee: number;
  teaching_method: string | null;
  seats_available: number | null;
  is_active: boolean;
};

export default function AdminPackagesPage() {
  const { accessToken } = useAuthStore();
  const [programFees, setProgramFees] = useState<ProgramFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Fee Edit Modal State
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<ProgramFee | null>(null);
  const [savingFee, setSavingFee] = useState(false);
  const [feeFormData, setFeeFormData] = useState({
    feeAmount: "25000",
    feeUnit: "year",
    admissionFee: "2500",
  });

  useEffect(() => {
    fetchData();
  }, [search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const activeInstId = getStoredActiveInstitutionId();
      let url = `/api/admin/marketing/packages?search=${encodeURIComponent(search)}`;
      if (activeInstId) {
        url += `&institutionId=${activeInstId}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(activeInstId ? { "x-institution-id": String(activeInstId) } : {}),
        },
      });
      const data = await res.json();
      if (res.ok && data.programFees) {
        setProgramFees(data.programFees);
      }
    } catch (err) {
      console.error("Error fetching course fee packages:", err);
      toast.error("Failed to load course fee packages.");
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Program Fee Modal
  const handleOpenFeeEdit = (fee: ProgramFee) => {
    setEditingFee(fee);
    setFeeFormData({
      feeAmount: String(fee.fee_amount || 25000),
      feeUnit: fee.fee_unit || "year",
      admissionFee: String(fee.admission_fee || 2500),
    });
    setFeeDialogOpen(true);
  };

  // Save Program Fee Update
  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFee) return;

    setSavingFee(true);
    try {
      const res = await fetch("/api/admin/marketing/packages", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          isProgramFee: true,
          programId: editingFee.id,
          feeAmount: parseFloat(feeFormData.feeAmount) || 0,
          feeUnit: feeFormData.feeUnit,
          admissionFee: parseFloat(feeFormData.admissionFee) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update course fee");

      toast.success(`Fee structure updated for ${editingFee.course_name}!`);
      setFeeDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingFee(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-[#D91B1B]" />
            Course Fee Packages & Pricing
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Manage course fee structures, tuition fees, and admission fees for all programs.
          </p>
        </div>

        {/* Search & Refresh Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search courses or institutions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs font-semibold bg-white border-slate-200"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} title="Refresh" className="h-9 cursor-pointer">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-[#D91B1B]" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Program Course Fee Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#D91B1B]" />
          <span className="text-xs font-semibold">Loading course fee packages...</span>
        </div>
      ) : programFees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-500 space-y-3 bg-slate-50/50">
          <GraduationCap className="h-12 w-12 mx-auto opacity-30 text-[#D91B1B]" />
          <p className="font-extrabold text-lg text-slate-900">No Course Fee Packages Found</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Courses & programs created under your institution listings will automatically appear here with their fee structures.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {programFees.map((fee) => (
            <div
              key={fee.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-[10px] font-bold text-rose-700 bg-rose-50 border-rose-200">
                      {fee.program_type_name || "Course Program"}
                    </Badge>
                    <h3 className="font-extrabold text-base text-slate-900 line-clamp-1">{fee.course_name}</h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {fee.institution_name}
                    </p>
                  </div>
                  <Badge className={fee.is_active ? "bg-emerald-500 text-white font-bold" : "bg-slate-300 text-slate-700 font-bold"}>
                    {fee.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {/* Fee Pricing Details */}
                <div className="p-3.5 bg-gradient-to-br from-slate-50 to-rose-50/30 rounded-xl border border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Course Tuition Fee</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">
                      ₹{Number(fee.fee_amount).toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">/{fee.fee_unit}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1.5 border-t border-slate-200/60 font-medium">
                    <span>Admission Fee:</span>
                    <span className="font-extrabold text-slate-900">₹{Number(fee.admission_fee).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Duration & Mode Specs */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <Clock className="h-3.5 w-3.5 text-[#D91B1B] shrink-0" />
                    <span>{fee.duration_value ? `${fee.duration_value} ${fee.duration_unit || "year"}` : "Standard Duration"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <Layers className="h-3.5 w-3.5 text-[#D91B1B] shrink-0" />
                    <span>{fee.teaching_method || "On Campus"}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Seats: <strong className="text-slate-800">{fee.seats_available ?? 60}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenFeeEdit(fee)}
                  className="gap-1.5 text-xs font-bold text-[#D91B1B] border-rose-200 hover:bg-rose-50 cursor-pointer rounded-xl"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Fee Structure</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Program Fee Modal */}
      <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#D91B1B]" />
              Update Course Fee Package
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Set the course tuition fee, billing frequency, and admission fee for{" "}
              <strong className="text-slate-800">{editingFee?.course_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFee} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="fee-amount" className="text-xs font-bold">Tuition Fee Amount (₹) *</Label>
                <Input
                  id="fee-amount"
                  type="number"
                  placeholder="25000"
                  value={feeFormData.feeAmount}
                  onChange={(e) => setFeeFormData({ ...feeFormData, feeAmount: e.target.value })}
                  required
                  className="h-10 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Fee Frequency / Unit</Label>
                <Select
                  value={feeFormData.feeUnit}
                  onValueChange={(val) => setFeeFormData({ ...feeFormData, feeUnit: val })}
                >
                  <SelectTrigger className="h-10 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="year">Per Year</SelectItem>
                    <SelectItem value="semester">Per Semester</SelectItem>
                    <SelectItem value="month">Per Month</SelectItem>
                    <SelectItem value="total">Total Course Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admission-fee" className="text-xs font-bold">Admission & Registration Fee (₹)</Label>
              <Input
                id="admission-fee"
                type="number"
                placeholder="2500"
                value={feeFormData.admissionFee}
                onChange={(e) => setFeeFormData({ ...feeFormData, admissionFee: e.target.value })}
                className="h-10 text-xs font-semibold"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setFeeDialogOpen(false)} className="rounded-xl cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={savingFee} className="bg-[#D91B1B] hover:bg-[#b01414] text-white font-bold rounded-xl gap-2 cursor-pointer">
                {savingFee ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Course Fee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

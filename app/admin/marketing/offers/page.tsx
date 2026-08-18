"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sparkles,
  Plus,
  Tag,
  Calendar,
  Percent,
  Trash2,
  Check,
  BookOpen,
  Clock,
  Search,
  IndianRupee,
  BadgePercent,
  CheckSquare,
  Square,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { readJsonResponse } from "@/lib/api/read-json-response";

type OfferRecord = {
  id: number;
  institution_id: number;
  title: string;
  code: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
  discount_text: string;
  offer_type: "duration_based" | "course_based";
  valid_from: string;
  valid_till: string;
  course_ids?: number[];
  course_names?: string[];
  description?: string | null;
  target_audience?: string;
  is_active: boolean;
  institution_name?: string;
};

type ProgramItem = {
  id: number;
  title: string;
  code?: string;
};

export default function OffersPage() {
  useAdminGuard();
  const { accessToken } = useAuthStore();

  const [offers, setOffers] = useState<OfferRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Offer Form State
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "flat">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [offerType, setOfferType] = useState<"duration_based" | "course_based">("duration_based");
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split("T")[0]);
  const [validTill, setValidTill] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");

  // Courses List for Course-based offer
  const [programsList, setProgramsList] = useState<ProgramItem[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [programSearch, setProgramSearch] = useState("");

  const fetchOffers = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/institutions/offers`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJsonResponse<{ offers?: OfferRecord[]; error?: string }>(res);
      if (res.ok && json.offers) {
        setOffers(json.offers);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchPrograms = useCallback(async () => {
    if (!accessToken) return;
    setLoadingPrograms(true);
    try {
      const res = await fetch(`/api/admin/institutions/programs?limit=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJsonResponse<{ data?: ProgramItem[]; error?: string }>(res);
      if (res.ok && json.data) {
        setProgramsList(json.data);
      }
    } catch {
      // silent fallback
    } finally {
      setLoadingPrograms(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchOffers();
    fetchPrograms();
  }, [fetchOffers, fetchPrograms]);

  // Toggle selection for multiple courses
  const toggleCourseSelection = (courseId: number) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const selectAllCourses = () => {
    if (selectedCourseIds.length === filteredPrograms.length) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(filteredPrograms.map((p) => p.id));
    }
  };

  const filteredPrograms = useMemo(() => {
    if (!programSearch.trim()) return programsList;
    const q = programSearch.toLowerCase();
    return programsList.filter((p) => p.title.toLowerCase().includes(q));
  }, [programsList, programSearch]);

  const resetForm = () => {
    setTitle("");
    setCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setOfferType("duration_based");
    setValidFrom(new Date().toISOString().split("T")[0]);
    setValidTill("");
    setSelectedCourseIds([]);
    setDescription("");
    setTargetAudience("all");
    setProgramSearch("");
  };

  const handleCreateOffer = async () => {
    if (!title.trim()) {
      toast.error("Please enter offer title");
      return;
    }
    if (!code.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    if (!discountValue || Number(discountValue) <= 0) {
      toast.error("Please enter a valid discount value");
      return;
    }
    if (!validTill) {
      toast.error("Please select an expiry date (Valid Till)");
      return;
    }
    if (offerType === "course_based" && selectedCourseIds.length === 0) {
      toast.error("Please select at least one course for course-based offer");
      return;
    }

    if (!accessToken) return;
    setSaving(true);

    try {
      const selectedNames = programsList
        .filter((p) => selectedCourseIds.includes(p.id))
        .map((p) => p.title);

      const dVal = Number(discountValue);
      const computedDiscountText =
        discountType === "percentage" ? `${dVal}% OFF` : `₹${dVal.toLocaleString("en-IN")} Flat`;

      const res = await fetch(`/api/admin/institutions/offers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          code: code.trim().toUpperCase(),
          discountType,
          discountValue: dVal,
          discountText: computedDiscountText,
          offerType,
          validFrom,
          validTill,
          courseIds: offerType === "course_based" ? selectedCourseIds : [],
          courseNames: offerType === "course_based" ? selectedNames : ["All Courses"],
          description: description.trim(),
          targetAudience,
        }),
      });

      const json = await readJsonResponse<{ success?: boolean; offer?: OfferRecord; error?: string }>(res);
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create promotional offer");
      }

      toast.success("New offer created successfully!");
      setCreateOpen(false);
      resetForm();
      fetchOffers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create offer");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOffer = async (id: number) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    if (!accessToken) return;

    try {
      const res = await fetch(`/api/admin/institutions/offers?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        toast.success("Offer deleted");
        setOffers((prev) => prev.filter((o) => o.id !== id));
      }
    } catch {
      toast.error("Failed to delete offer");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#D91B1B]" />
            New Promotional Offers & Discounts
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Manage promotional coupon codes, seasonal course discounts, and duration-based offers for your institution.
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setCreateOpen(true);
          }}
          className="gap-2 bg-[#D91B1B] hover:bg-[#b01414] text-white font-bold rounded-xl shadow-md cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>+ Create New Offer</span>
        </Button>
      </div>

      {/* Offers Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm font-semibold">Loading promotional offers...</span>
        </div>
      ) : offers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Tag className="h-10 w-10 mx-auto text-slate-400 opacity-50 mb-2" />
          <h3 className="font-bold text-base text-slate-800">No Offers Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Click "+ Create New Offer" to set up duration-based or course-specific discounts.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => {
            const isCourseBased = offer.offer_type === "course_based";
            const coursesCount = offer.course_names?.length || offer.course_ids?.length || 0;

            return (
              <div
                key={offer.id}
                className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-[#D91B1B] transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Card Header Pills */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="font-mono text-xs font-black tracking-wider text-[#D91B1B] bg-rose-50 border-rose-200">
                      {offer.code}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-black uppercase ${
                          isCourseBased
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-sky-50 text-sky-700 border border-sky-200"
                        }`}
                      >
                        {isCourseBased ? (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            Course Based
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Duration Based
                          </span>
                        )}
                      </Badge>
                      <button
                        onClick={() => handleDeleteOffer(offer.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Delete offer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Discount Value */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug">{offer.title}</h3>
                    <p className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
                      {offer.discount_text}
                    </p>
                  </div>

                  {/* Applicability & Courses */}
                  <div className="space-y-1.5 text-xs text-slate-600 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-700">
                      Applies to:{" "}
                      {isCourseBased
                        ? `${coursesCount} Specific Course${coursesCount > 1 ? "s" : ""}`
                        : "All Institution Courses"}
                    </p>
                    {isCourseBased && offer.course_names && offer.course_names.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {offer.course_names.slice(0, 3).map((cName, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                            {cName}
                          </Badge>
                        ))}
                        {offer.course_names.length > 3 && (
                          <Badge variant="secondary" className="text-[10px] font-bold bg-white text-slate-500">
                            +{offer.course_names.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {offer.description && (
                    <p className="text-xs text-slate-500 italic line-clamp-2">{offer.description}</p>
                  )}
                </div>

                {/* Footer Validity Dates */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-1 text-slate-600">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Valid till: {offer.valid_till}
                  </span>
                  <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border border-emerald-200 font-bold text-[10px]">
                    Active
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE NEW OFFER DIALOG MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Tag className="h-5 w-5 text-[#D91B1B]" />
              Create New Promotional Offer
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500">
              Configure coupon codes, discount rates, and choose duration-based or course-specific targeting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Offer Title & Code */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800">Offer Title / Campaign Name *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monsoon Early Bird Concession"
                  className="h-9 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800">Coupon / Promo Code *</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MONSOON2026"
                  className="h-9 text-xs font-bold font-mono uppercase"
                />
              </div>
            </div>

            {/* Discount Type & Discount Value */}
            <div className="grid gap-3 sm:grid-cols-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800">Discount Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDiscountType("percentage")}
                    className={`flex items-center justify-center gap-1 h-9 rounded-lg font-bold transition-all border ${
                      discountType === "percentage"
                        ? "bg-[#D91B1B] text-white border-[#D91B1B]"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <Percent className="h-3.5 w-3.5" />
                    <span>Percentage (% OFF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("flat")}
                    className={`flex items-center justify-center gap-1 h-9 rounded-lg font-bold transition-all border ${
                      discountType === "flat"
                        ? "bg-[#D91B1B] text-white border-[#D91B1B]"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <IndianRupee className="h-3.5 w-3.5" />
                    <span>Flat Amount (₹ OFF)</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800">
                  Discount Value ({discountType === "percentage" ? "%" : "₹"}) *
                </label>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "e.g. 20 (for 20% OFF)" : "e.g. 2000 (for ₹2000 OFF)"}
                  className="h-9 text-xs font-bold bg-white"
                />
              </div>
            </div>

            {/* Offer Applicability Type: Duration Based vs Course Based */}
            <div className="space-y-2">
              <label className="font-extrabold text-slate-800">Offer Applicability Scope *</label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setOfferType("duration_based")}
                  className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex flex-col gap-1.5 ${
                    offerType === "duration_based"
                      ? "border-[#D91B1B] bg-rose-50/50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-sky-600" />
                      Duration Based
                    </span>
                    {offerType === "duration_based" && (
                      <Check className="h-4 w-4 text-[#D91B1B]" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Valid for all programs during a specific date window.
                  </p>
                </div>

                <div
                  onClick={() => setOfferType("course_based")}
                  className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex flex-col gap-1.5 ${
                    offerType === "course_based"
                      ? "border-[#D91B1B] bg-rose-50/50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-purple-600" />
                      Course / Program Based
                    </span>
                    {offerType === "course_based" && (
                      <Check className="h-4 w-4 text-[#D91B1B]" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Applies strictly to selected courses/programs.
                  </p>
                </div>
              </div>
            </div>

            {/* MULTIPLE COURSES SELECTION (Visible when Course Based selected) */}
            {offerType === "course_based" && (
              <div className="space-y-2.5 bg-purple-50/60 p-3.5 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <label className="font-black text-purple-900 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-purple-700" />
                    Select Target Courses / Programs ({selectedCourseIds.length} selected)
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAllCourses}
                    className="h-6 text-[11px] font-bold text-purple-700 hover:bg-purple-100 px-2"
                  >
                    {selectedCourseIds.length === filteredPrograms.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                {/* Course Search Input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={programSearch}
                    onChange={(e) => setProgramSearch(e.target.value)}
                    placeholder="Search course title..."
                    className="pl-8 h-8 text-xs bg-white font-medium"
                  />
                </div>

                {/* Multi-select Courses List */}
                <div className="max-h-40 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-purple-200">
                  {loadingPrograms ? (
                    <div className="p-3 text-center text-xs text-slate-400">Loading courses...</div>
                  ) : filteredPrograms.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">No courses match search.</div>
                  ) : (
                    filteredPrograms.map((prog) => {
                      const isSelected = selectedCourseIds.includes(prog.id);
                      return (
                        <div
                          key={prog.id}
                          onClick={() => toggleCourseSelection(prog.id)}
                          className={`flex items-center gap-2.5 p-2 rounded-md cursor-pointer transition-colors text-xs ${
                            isSelected
                              ? "bg-purple-100/80 text-purple-900 font-extrabold"
                              : "hover:bg-slate-50 text-slate-700 font-medium"
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-purple-700 shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300 shrink-0" />
                          )}
                          <span className="truncate">{prog.title}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Validity Dates */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800">Valid From</label>
                <Input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="h-9 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800">Valid Till (Expiry Date) *</label>
                <Input
                  type="date"
                  value={validTill}
                  onChange={(e) => setValidTill(e.target.value)}
                  className="h-9 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Target Audience & Description */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-800">Target Audience</label>
              <Select value={targetAudience} onValueChange={setTargetAudience}>
                <SelectTrigger className="h-9 text-xs font-semibold">
                  <SelectValue placeholder="Select Audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Applicants & Visitors</SelectItem>
                  <SelectItem value="students">Students Only</SelectItem>
                  <SelectItem value="guardians">Parents & Guardians</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-800">Offer Description / Terms & Conditions</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details, terms, or conditions..."
                rows={2}
                className="text-xs font-medium resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="h-9 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateOffer}
              disabled={saving}
              className="h-9 text-xs font-bold bg-[#D91B1B] hover:bg-[#b01414] text-white rounded-xl gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Create Offer</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

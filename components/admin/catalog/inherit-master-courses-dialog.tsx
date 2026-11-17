"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen,
  Search,
  CheckCircle2,
  Loader2,
  IndianRupee,
  Layers,
  GraduationCap,
  Clock,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export interface MasterCourseItem {
  id: number;
  name: string;
  slug: string;
  code?: string | null;
  category_id?: number | null;
  category_name?: string;
  authority_type?: string | null;
  university_name?: string | null;
  duration?: string;
  duration_value?: number;
  duration_unit?: string;
  seats_available?: number;
  description?: string | null;
  thumbnail_url?: string | null;
  icon_url?: string | null;
  already_inherited: boolean;
}

interface InheritMasterCoursesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  accessToken?: string | null;
}

export function InheritMasterCoursesDialog({
  open,
  onOpenChange,
  onSuccess,
  accessToken,
}: InheritMasterCoursesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<MasterCourseItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [customFees, setCustomFees] = useState<Record<number, string>>({});

  // Fetch master courses available for inheritance
  const fetchMasterCourses = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/catalog/courses/inherit", { headers });
      const data = await res.json();

      if (data.success && Array.isArray(data.courses)) {
        setCourses(data.courses);
      } else {
        toast.error(data.error || "Failed to load master courses");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load master courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMasterCourses();
      setSelectedIds([]);
      setCustomFees({});
      setSearch("");
      setSelectedCategoryId("all");
    }
  }, [open]);

  // Extract unique categories
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((c) => {
      const name = c.category_name || "General";
      map.set(name, name);
    });
    return Array.from(map.values()).sort();
  }, [courses]);

  // Filtered list
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        !search.trim() ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(search.toLowerCase())) ||
        (c.university_name && c.university_name.toLowerCase().includes(search.toLowerCase()));

      const matchCat =
        selectedCategoryId === "all" ||
        (c.category_name && c.category_name.toLowerCase() === selectedCategoryId.toLowerCase());

      return matchSearch && matchCat;
    });
  }, [courses, search, selectedCategoryId]);

  // Select all visible non-inherited
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const available = filteredCourses
        .filter((c) => !c.already_inherited)
        .map((c) => c.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...available])));
    } else {
      const toRemove = new Set(filteredCourses.map((c) => c.id));
      setSelectedIds(selectedIds.filter((id) => !toRemove.has(id)));
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleFeeChange = (id: number, val: string) => {
    setCustomFees((prev) => ({ ...prev, [id]: val }));
  };

  // Submit inheritance
  const handleInherit = async () => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one course to inherit");
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/catalog/courses/inherit", {
        method: "POST",
        headers,
        body: JSON.stringify({
          master_course_ids: selectedIds,
          custom_fees: customFees,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to inherit courses");
      }

      toast.success(data.message || `Successfully inherited ${data.inheritedCount} course(s)!`);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to inherit courses");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-5 border-b bg-muted/20">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Layers className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Catalog Inheritance</span>
          </div>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span>Inherit Courses from Master Catalog</span>
            <Badge variant="outline" className="font-mono text-xs font-medium">
              {filteredCourses.length} Available
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Select standardized academic, professional, and certification courses from the global master repository to instantly add them to your marketing catalog.
          </DialogDescription>
        </DialogHeader>

        {/* Filters Bar */}
        <div className="p-4 border-b bg-card flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by course name, code, university..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
              <Button
                variant={selectedCategoryId === "all" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs font-medium rounded-lg"
                onClick={() => setSelectedCategoryId("all")}
              >
                All Categories
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategoryId === cat ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs font-medium rounded-lg shrink-0"
                  onClick={() => setSelectedCategoryId(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Selection Bar */}
        <div className="px-5 py-2.5 bg-muted/40 border-b flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-courses"
              checked={
                filteredCourses.filter((c) => !c.already_inherited).length > 0 &&
                filteredCourses
                  .filter((c) => !c.already_inherited)
                  .every((c) => selectedIds.includes(c.id))
              }
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all-courses" className="font-medium cursor-pointer">
              Select All Visible Available Courses
            </label>
          </div>
          <span className="text-muted-foreground font-semibold">
            {selectedIds.length} course(s) selected
          </span>
        </div>

        {/* Content Table / List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-7 animate-spin text-primary" />
              <p className="text-xs font-medium">Loading courses from master catalog...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <BookOpen className="size-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-semibold">No matching master courses found</p>
              <p className="text-xs">Try adjusting your search criteria or category filter</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredCourses.map((c) => {
                const isSelected = selectedIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all ${
                      c.already_inherited
                        ? "bg-muted/30 border-muted opacity-75"
                        : isSelected
                        ? "bg-primary/5 border-primary/40 shadow-xs"
                        : "bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                      <div className="pt-0.5">
                        <Checkbox
                          checked={c.already_inherited || isSelected}
                          disabled={c.already_inherited}
                          onCheckedChange={() => handleToggleSelect(c.id)}
                        />
                      </div>

                      <div className="size-11 rounded-lg border bg-muted/40 overflow-hidden shrink-0 flex items-center justify-center">
                        {c.thumbnail_url || c.icon_url ? (
                          <img
                            src={c.thumbnail_url || c.icon_url || ""}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <GraduationCap className="size-5 text-muted-foreground/60" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs text-foreground truncate">{c.name}</h4>
                          {c.code && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1 font-mono font-bold">
                              {c.code}
                            </Badge>
                          )}
                          {c.already_inherited && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0">
                              <CheckCircle2 className="size-2.5 mr-1" />
                              Already In Catalog
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                          {c.category_name && (
                            <span className="flex items-center gap-1 font-medium text-foreground/80">
                              <BookOpen className="size-3 text-primary" /> {c.category_name}
                            </span>
                          )}
                          {c.university_name && (
                            <span className="flex items-center gap-1">
                              <Sparkles className="size-3 text-amber-500" /> {c.university_name}
                            </span>
                          )}
                          {c.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3 text-sky-500" /> {c.duration}
                            </span>
                          )}
                          {c.seats_available ? (
                            <span className="flex items-center gap-1">
                              <Users className="size-3 text-emerald-500" /> {c.seats_available} Seats
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Fee configuration */}
                    {!c.already_inherited && (
                      <div className="flex items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 mt-2 sm:mt-0 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-muted-foreground">Fee:</span>
                          <div className="relative w-28">
                            <IndianRupee className="size-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              placeholder="0 (Free)"
                              value={customFees[c.id] || ""}
                              onChange={(e) => handleFeeChange(c.id, e.target.value)}
                              className="h-8 pl-6 text-xs font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleInherit}
            disabled={submitting || selectedIds.length === 0}
            className="gap-1.5 font-bold"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Layers className="size-4" />
            )}
            Inherit {selectedIds.length} Selected Course(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

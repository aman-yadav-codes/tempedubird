"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Landmark,
  Search,
  Calendar,
  Clock,
  FileText,
  ExternalLink,
  Eye,
  BookOpen,
  Award,
  AlertCircle,
  Building2,
  CheckCircle2,
  Sparkles,
  DollarSign,
  HelpCircle,
  GraduationCap,
  Layers,
} from "lucide-react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store";

interface GovernmentExam {
  id: number;
  title: string;
  description?: string | null;
  conducting_body?: string | null;
  exam_category?: string | null;
  apply_url?: string | null;
  application_start_date?: string | null;
  application_end_date?: string | null;
  admit_card_date?: string | null;
  eligibility_criteria?: string | null;
  application_fee?: string | number | null;
  exam_date?: string | null;
  exam_time?: string | null;
  total_marks?: number | string | null;
  duration_minutes?: number | null;
  exam_mode?: string | null;
  question_count?: number | null;
  syllabus_data?: any;
  is_active?: boolean;
  created_at?: string;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "TBA";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function PublicGovernmentExamsPage() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<GovernmentExam[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const [totalRows, setTotalRows] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    categories: 0,
    questions: 0,
  });

  const [selectedExam, setSelectedExam] = useState<GovernmentExam | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchGovernmentExams = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        is_government: "true",
        view: "government",
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const res = await fetch(`/api/admin/master-data/exams?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load government exams");

      setExams(json.data || []);
      setTotalRows(Number(json.total || 0));
      setPageCount(Number(json.pageCount || 1));
      if (json.stats) {
        setStats({
          total: Number(json.stats.total || 0),
          active: Number(json.stats.active || 0),
          categories: Number(json.stats.blocked || 0),
          questions: Number(json.stats.questions || 0),
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch government exams");
    } finally {
      setLoading(false);
    }
  }, [accessToken, debouncedSearch, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    fetchGovernmentExams();
  }, [fetchGovernmentExams]);

  const columns: ColumnDef<GovernmentExam>[] = [
    {
      accessorKey: "title",
      header: "Exam & Conducting Body",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="space-y-1.5 py-1 max-w-md">
            <div className="font-bold text-sm text-foreground hover:text-primary transition-colors cursor-pointer" onClick={() => { setSelectedExam(item); setDetailsOpen(true); }}>
              {item.title}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {item.conducting_body && (
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-bold text-[10px] gap-1 px-1.5 py-0">
                  <Landmark className="size-2.5" />
                  {item.conducting_body}
                </Badge>
              )}
              {item.exam_category && (
                <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0">
                  {item.exam_category}
                </Badge>
              )}
              {item.apply_url && (
                <a
                  href={item.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline ml-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="size-3" />
                  Apply Portal
                </a>
              )}
            </div>
            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {item.description}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: "important_dates",
      header: "Important Dates",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="size-3.5 text-primary shrink-0" />
              <span>Exam Date: <strong className="font-bold">{formatDate(item.exam_date)}</strong></span>
            </div>
            {(item.application_start_date || item.application_end_date) && (
              <div className="text-[11px] text-muted-foreground">
                Apply: {formatDate(item.application_start_date)} – {formatDate(item.application_end_date)}
              </div>
            )}
            {item.admit_card_date && (
              <div className="text-[10px] text-muted-foreground">
                Admit Card: {formatDate(item.admit_card_date)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "eligibility_fee",
      header: "Eligibility & Fee",
      cell: ({ row }) => {
        const item = row.original;
        const fee = Number(item.application_fee) || 0;
        return (
          <div className="space-y-1 text-xs">
            <div>
              {fee > 0 ? (
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                  Fee: ₹{fee}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400 font-bold text-[10px]">
                  Free / Govt Subsidized
                </Badge>
              )}
            </div>
            {item.eligibility_criteria ? (
              <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-[200px]" title={item.eligibility_criteria}>
                {item.eligibility_criteria}
              </p>
            ) : (
              <span className="text-[10px] text-muted-foreground">See official notice</span>
            )}
          </div>
        );
      },
    },
    {
      id: "marks_duration",
      header: "Marks & Mode",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="space-y-1 text-xs">
            <div className="font-bold">
              {Number(item.total_marks || 0).toFixed(0)} Marks
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              {item.duration_minutes ?? 180} mins
            </div>
            <Badge variant="outline" className="text-[10px] font-normal uppercase">
              {item.exam_mode || "ONLINE (CBT)"}
            </Badge>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedExam(item);
                setDetailsOpen(true);
              }}
              className="h-8 gap-1.5 text-xs font-bold"
            >
              <Eye className="size-3.5" />
              View Details
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Landmark className="size-4" />
            National & State Examinations
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground">
            Government & Selection Exams
          </h1>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
            Explore national competitive exams, selection tests, and eligibility schedules published by the platform.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3 shadow-xs">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <Sparkles className="size-5" />
        </div>
        <div className="text-xs">
          <h4 className="font-bold text-foreground">Official Government & Competitive Examination Directory</h4>
          <p className="text-muted-foreground mt-0.5">
            These examinations are curated and updated by the Platform Admin with official dates, syllabus outlines, eligibility criteria, and application portals.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Government Exams</span>
            <Landmark className="size-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold">{totalRows}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Curated selection tests</p>
        </Card>

        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Notifications</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active || totalRows}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Open for application & preparation</p>
        </Card>

        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Exam Questions & Papers</span>
            <FileText className="size-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.questions}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Mapped practice questions</p>
        </Card>
      </div>

      {/* Search Input */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search exam name, conducting body (UPSC, NTA, SSC)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Exams Data Table */}
      <DataTable
        columns={columns}
        data={exams}
        loading={loading}
        emptyText="No government & selection exams found."
        totalRows={totalRows}
        manualPagination
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        getRowId={(row) => `gov-exam-${row.id}`}
      />

      {/* View Exam Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-bold text-xs gap-1">
                <Landmark className="size-3" />
                {selectedExam?.conducting_body || "Government Exam"}
              </Badge>
              {selectedExam?.exam_category && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {selectedExam.exam_category}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-lg font-black text-foreground pt-1">
              {selectedExam?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Official notification schedule, eligibility rules, and examination details.
            </DialogDescription>
          </DialogHeader>

          {selectedExam && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Important Dates Grid */}
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="size-4 text-primary" /> Key Dates & Schedule
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Exam Date</span>
                    <p className="font-bold text-foreground">{formatDate(selectedExam.exam_date)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Application Start</span>
                    <p className="font-bold text-foreground">{formatDate(selectedExam.application_start_date)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Application End</span>
                    <p className="font-bold text-foreground">{formatDate(selectedExam.application_end_date)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Admit Card Release</span>
                    <p className="font-bold text-foreground">{formatDate(selectedExam.admit_card_date)}</p>
                  </div>
                </div>
              </div>

              {/* Exam Specs Grid */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl border bg-muted/20">
                <div>
                  <span className="text-[10px] text-muted-foreground">Total Marks</span>
                  <p className="font-bold text-sm text-foreground">{Number(selectedExam.total_marks || 0).toFixed(0)} Marks</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Duration</span>
                  <p className="font-bold text-sm text-foreground">{selectedExam.duration_minutes ?? 180} Minutes</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Examination Mode</span>
                  <p className="font-bold text-sm text-foreground uppercase">{selectedExam.exam_mode || "ONLINE (CBT)"}</p>
                </div>
              </div>

              {/* Eligibility & Application Fee */}
              <div className="p-3.5 rounded-xl border bg-card space-y-2">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <GraduationCap className="size-4 text-primary" /> Eligibility Criteria & Application Fee
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selectedExam.eligibility_criteria || "Please refer to the official notification bulletin for detailed educational qualifications, age limits, and category relaxations."}
                </p>
                <div className="pt-1 flex items-center justify-between border-t border-border/80">
                  <span className="text-xs text-muted-foreground">Application Fee:</span>
                  <span className="font-bold text-foreground">
                    {Number(selectedExam.application_fee) > 0 ? `₹${selectedExam.application_fee}` : "Free / As per official notification"}
                  </span>
                </div>
              </div>

              {/* Apply Portal Link */}
              {selectedExam.apply_url && (
                <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-foreground">Official Application Portal</h5>
                    <p className="text-[11px] text-muted-foreground">Visit the official conducting body registration portal</p>
                  </div>
                  <a
                    href={selectedExam.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors shadow-xs shrink-0"
                  >
                    <ExternalLink className="size-3.5" />
                    Open Portal
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

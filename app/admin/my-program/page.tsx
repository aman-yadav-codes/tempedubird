"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, CalendarDays, GraduationCap, Hash, IdCard, Loader2, RefreshCw, School } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthStore } from "@/store";

type StudentProgram = {
  id: number;
  enrollmentId: number;
  institutionName: string;
  programName: string;
  classCategoryName: string | null;
  sectionName: string | null;
  academicYearName: string;
  rollNumber: string | null;
  admissionNumber: string | null;
  admissionDate: string | null;
  status: string;
  duration: string | null;
};

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid response" };
  }
}

function statusLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function ProgramStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={status === "active" ? "outline" : "secondary"}
      className={status === "active" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : undefined}
    >
      {statusLabel(status)}
    </Badge>
  );
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-md border bg-muted/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 min-w-0 break-words text-sm font-medium">{value || "-"}</p>
    </div>
  );
}

function ProgramDetailContent({ program }: { program: StudentProgram }) {
  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="size-4" />
              {program.institutionName}
            </div>
            <h3 className="mt-2 text-xl font-semibold">{program.programName}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {program.classCategoryName ?? "Class"}{program.sectionName ? ` - Section ${program.sectionName}` : ""}
            </p>
          </div>
          <ProgramStatusBadge status={program.status} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailBlock label="Academic Year" value={program.academicYearName} />
        <DetailBlock label="Duration" value={program.duration} />
        <DetailBlock label="Roll Number" value={program.rollNumber} />
        <DetailBlock label="Admission Number" value={program.admissionNumber} />
        <DetailBlock label="Admission Date" value={formatDate(program.admissionDate)} />
        <DetailBlock label="Enrollment ID" value={program.enrollmentId} />
      </div>
    </div>
  );
}

export default function MyProgramPage() {
  const { isReady } = useAdminGuard();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { accessToken, clearAuth } = useAuthStore();
  const [programs, setPrograms] = useState<StudentProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<StudentProgram | null>(null);

  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken],
  );

  const handleAuthError = useCallback(() => {
    clearAuth();
    toast.error("Session expired. Please log in again.");
    router.push("/");
  }, [clearAuth, router]);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch("/api/admin/student/programs", { headers });
      const json = await readJson(res);
      if (res.status === 401) {
        handleAuthError();
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Failed to load programs");
      setPrograms(json.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load programs");
    } finally {
      setLoading(false);
    }
  }, [accessToken, handleAuthError]);

  useEffect(() => {
    if (!isReady) return;
    const timer = window.setTimeout(() => {
      void fetchPrograms();
    }, 0);

    const handleEnrollmentUpdate = () => {
      void fetchPrograms();
    };
    window.addEventListener("student_enrollment_updated", handleEnrollmentUpdate);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("student_enrollment_updated", handleEnrollmentUpdate);
    };
  }, [fetchPrograms, isReady]);

  const columns = useMemo<ColumnDef<StudentProgram>[]>(
    () => [
      {
        accessorKey: "programName",
        header: ({ column }) => (
          <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Program
            <ArrowUpDown className="size-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-semibold">{row.original.programName}</div>
            <div className="text-sm text-muted-foreground">
              {row.original.classCategoryName ?? "Class"}{row.original.sectionName ? ` - Section ${row.original.sectionName}` : ""}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "institutionName",
        header: "Institution",
        cell: ({ row }) => row.original.institutionName,
      },
      {
        accessorKey: "academicYearName",
        header: "Academic Year",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            {row.original.academicYearName}
          </div>
        ),
      },
      {
        accessorKey: "rollNumber",
        header: "Roll No.",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Hash className="size-4 text-muted-foreground" />
            {row.original.rollNumber || "-"}
          </div>
        ),
      },
      {
        accessorKey: "duration",
        header: "Duration",
        cell: ({ row }) => row.original.duration ?? "-",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <ProgramStatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

  const totalPrograms = programs.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Program</h1>
          <p className="text-muted-foreground">View the programs and classes you are enrolled in.</p>
        </div>
        <Button variant="outline" onClick={() => void fetchPrograms()} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IdCard className="size-4" />
            Enrolled Programs
          </div>
          <p className="mt-2 text-2xl font-semibold">{totalPrograms}</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <School className="size-4" />
            Active Classes
          </div>
          <p className="mt-2 text-2xl font-semibold">
            {programs.filter((program) => program.status === "active").length}
          </p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            Academic Years
          </div>
          <p className="mt-2 text-2xl font-semibold">
            {new Set(programs.map((program) => program.academicYearName)).size}
          </p>
        </div>
      </div>

      <DataTable<StudentProgram, unknown>
        columns={columns}
        data={programs}
        loading={loading}
        searchKey="programName"
        filterPlaceholder="Search program, institution, class..."
        emptyText="No enrolled programs found."
        totalRows={programs.length}
        enableRowSelection={false}
        onRowClick={(program) => setSelectedProgram(program)}
      />

      {isMobile ? (
        <Drawer open={Boolean(selectedProgram)} onOpenChange={(open) => !open && setSelectedProgram(null)}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Program Details</DrawerTitle>
              <DrawerDescription>{selectedProgram?.programName ?? "Enrolled program"}</DrawerDescription>
            </DrawerHeader>
            <div className="max-h-[68vh] overflow-y-auto px-4 pb-4">
              {selectedProgram && <ProgramDetailContent program={selectedProgram} />}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={Boolean(selectedProgram)} onOpenChange={(open) => !open && setSelectedProgram(null)}>
          <SheetContent side="right" defaultSize={560} minSize={420} resizeStorageKey="student-my-program-detail-sheet">
            <SheetHeader>
              <SheetTitle>Program Details</SheetTitle>
              <SheetDescription>{selectedProgram?.programName ?? "Enrolled program"}</SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto px-6 pb-6">
              {selectedProgram && <ProgramDetailContent program={selectedProgram} />}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Sparkles } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import {
  getStoredActiveAcademicYearId,
  getStoredActiveAcademicSession,
  getStoredActiveAcademicSessions,
  setStoredActiveAcademicSession,
  setStoredActiveAcademicSessions,
  setStoredActiveAcademicYearId,
  type ActiveAcademicSession,
} from "@/lib/auth/active-academic-session";
import {
  getStoredActiveStudentEnrollmentId,
  getStoredStudentDefaultAcademicYearId,
  setStoredActiveStudentEnrollmentId,
  setStoredStudentDefaultAcademicYearId,
  type ActiveStudentEnrollment,
} from "@/lib/auth/active-student-enrollment";
import { readJsonResponse } from "@/lib/api/read-json-response";
import { useAuthStore } from "@/store";

export function AdminAcademicSessionSelector() {
  const { accessToken, user } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<ActiveAcademicSession[]>([]);
  const [studentEnrollments, setStudentEnrollments] = useState<ActiveStudentEnrollment[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const isStudent = Boolean(user?.role_codes?.includes("student"));
  const isPlatformAdmin = Boolean(
    user?.role_codes?.includes("platform_admin") ||
    user?.role_codes?.includes("super_admin") ||
    user?.is_super_admin
  );

  useEffect(() => {
    setMounted(true);
    const storedId = user?.role_codes?.includes("student")
      ? getStoredActiveStudentEnrollmentId()
      : getStoredActiveAcademicYearId(activeInstitutionId);
    if (storedId) {
      setSelectedId(String(storedId));
    }
  }, [user, activeInstitutionId]);

  const selectedSession = useMemo(
    () => sessions.find((session) => String(session.id) === selectedId) ?? null,
    [selectedId, sessions],
  );
  const selectedEnrollment = useMemo(
    () => studentEnrollments.find((enrollment) => String(enrollment.id) === selectedId) ?? null,
    [selectedId, studentEnrollments],
  );

  const uniqueStudentEnrollments = useMemo(() => {
    const activeEnrollment = studentEnrollments.find((enrollment) => String(enrollment.id) === selectedId) ?? null;
    const seen = new Set<number>();
    const programScopedEnrollments = activeEnrollment
      ? studentEnrollments.filter((enrollment) =>
        enrollment.institutionId === activeEnrollment.institutionId &&
        enrollment.programId === activeEnrollment.programId &&
        enrollment.sectionId === activeEnrollment.sectionId
      )
      : studentEnrollments;

    return programScopedEnrollments.filter((enrollment) => {
      if (seen.has(enrollment.academicYearId)) {
        return false;
      }
      seen.add(enrollment.academicYearId);
      return true;
    });
  }, [selectedId, studentEnrollments]);

  const loadSessions = useCallback(async () => {
    if (isPlatformAdmin) {
      return;
    }

    if (isStudent) {
      if (!accessToken) {
        setStudentEnrollments([]);
        setSessions([]);
        setSelectedId("");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/admin/student/enrollments", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const json = await readJsonResponse<{ data?: ActiveStudentEnrollment[]; error?: string }>(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to load sessions");
        const rows = (json.data ?? []) as ActiveStudentEnrollment[];
        setStudentEnrollments(rows);

        const storedId = getStoredActiveStudentEnrollmentId();
        const stored = rows.find((enrollment) => enrollment.id === storedId) ?? null;
        const defaultSource =
          rows.find((enrollment) =>
            (!activeInstitutionId || enrollment.institutionId === activeInstitutionId) &&
            enrollment.institutionDefaultAcademicYearId
          ) ?? rows.find((enrollment) => enrollment.institutionDefaultAcademicYearId) ?? null;
        const institutionDefaultAcademicYearId = defaultSource?.institutionDefaultAcademicYearId ?? null;
        const institutionDefault = institutionDefaultAcademicYearId
          ? rows.find((enrollment) =>
            enrollment.academicYearId === institutionDefaultAcademicYearId &&
            (!activeInstitutionId || enrollment.institutionId === activeInstitutionId)
          ) ?? rows.find((enrollment) => enrollment.academicYearId === institutionDefaultAcademicYearId) ?? null
          : null;
        const storedDefaultAcademicYearId = defaultSource
          ? getStoredStudentDefaultAcademicYearId(defaultSource.institutionId)
          : null;
        const shouldUseInstitutionDefault =
          !stored && Boolean(institutionDefault) && storedDefaultAcademicYearId !== institutionDefaultAcademicYearId;
        const selected = shouldUseInstitutionDefault
          ? institutionDefault
          : stored ?? institutionDefault ?? rows[0] ?? null;
        setSelectedId(selected ? String(selected.id) : "");
        if (selected && selected.id !== storedId) {
          setStoredActiveStudentEnrollmentId(selected.id);
        }
        if (defaultSource && institutionDefaultAcademicYearId) {
          setStoredStudentDefaultAcademicYearId(defaultSource.institutionId, institutionDefaultAcademicYearId);
        }
      } catch (err) {
        console.warn("Failed to load student sessions", err);
        setStudentEnrollments([]);
        setSelectedId("");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!accessToken) {
      setSessions([]);
      setSelectedId("");
      return;
    }

    const chooseSession = (rows: ActiveAcademicSession[]) => {
      const storedId = getStoredActiveAcademicYearId(activeInstitutionId);
      const stored = rows.find((session) => session.id === storedId) ?? null;
      const institutionDefaultId = rows.find((session) => session.institutionDefaultAcademicYearId)?.institutionDefaultAcademicYearId ?? null;
      const institutionDefault = rows.find((session) => session.id === institutionDefaultId) ?? null;
      const today = new Date().toISOString().slice(0, 10);
      const current =
        rows.find((session) => session.startDate <= today && session.endDate >= today) ??
        rows.find((session) => session.isActive) ??
        rows[0] ??
        null;
      return stored ?? institutionDefault ?? current;
    };

    if (activeInstitutionId) {
      const cachedSessions = getStoredActiveAcademicSessions(activeInstitutionId).filter(
        (session) => session.institutionId === activeInstitutionId,
      );
      if (cachedSessions.length) {
        setSessions(cachedSessions);
        const cachedSelected = chooseSession(cachedSessions);
        setSelectedId(cachedSelected ? String(cachedSelected.id) : "");
        if (cachedSelected) setStoredActiveAcademicSession(cachedSelected);
        return;
      }
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "100",
        pastOrCurrentOnly: "true",
      });
      if (activeInstitutionId) {
        params.set("institutionId", String(activeInstitutionId));
      }

      const res = await fetch(`/api/admin/institutions/academic-years?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJsonResponse<{ data?: Record<string, unknown>[]; error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load sessions");

      const rows = (json.data ?? []).map((row: Record<string, unknown>) => ({
        id: Number(row.id),
        institutionId: Number(row.institution_id),
        name: String(row.name ?? "Session"),
        startDate: String(row.start_date ?? ""),
        endDate: String(row.end_date ?? ""),
        isActive: Boolean(row.is_active),
        institutionDefaultAcademicYearId: Number(row.institution_default_academic_year_id) || null,
      })) as ActiveAcademicSession[];

      setSessions(rows);
      if (activeInstitutionId) {
        setStoredActiveAcademicSessions(activeInstitutionId, rows);
      }

      const next = chooseSession(rows);
      setSelectedId(next ? String(next.id) : "");
      if (next) setStoredActiveAcademicSession(next);
    } catch (err) {
      console.warn("Failed to load academic sessions", err);
      setSessions([]);
      setSelectedId("");
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeInstitutionId, isPlatformAdmin, isStudent]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSessions();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadSessions]);

  function cleanSessionLabel(label?: string) {
    if (!label) return "";
    return label.replace(/\s*Academic\s+Session\s*/gi, "").trim();
  }

  const options = useMemo(() => {
    if (isStudent) {
      return uniqueStudentEnrollments.map((enrollment) => ({
        id: enrollment.id,
        label: cleanSessionLabel(enrollment.academicYearName),
      }));
    }

    const seenNames = new Set<string>();
    const uniqueOptions: { id: number; label: string }[] = [];

    // Prioritize active institution's sessions first, sorted descending
    const sorted = [...sessions].sort((a, b) => {
      if (activeInstitutionId) {
        if (a.institutionId === activeInstitutionId && b.institutionId !== activeInstitutionId) return -1;
        if (b.institutionId === activeInstitutionId && a.institutionId !== activeInstitutionId) return 1;
      }
      return b.name.localeCompare(a.name);
    });

    for (const session of sorted) {
      const cleanLabel = cleanSessionLabel(session.name);
      if (!cleanLabel || seenNames.has(cleanLabel)) continue;
      seenNames.add(cleanLabel);
      uniqueOptions.push({
        id: session.id,
        label: cleanLabel,
      });
    }

    return uniqueOptions;
  }, [isStudent, uniqueStudentEnrollments, sessions, activeInstitutionId]);

  if (isPlatformAdmin) {
    return null;
  }

  if (!mounted) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-bold text-foreground shadow-2xs">
          <CalendarDays className="size-3.5 text-primary shrink-0" />
          <span className="hidden sm:inline text-muted-foreground text-[11px] font-semibold">Session:</span>
          <span className="text-xs font-bold text-foreground">2026-2027</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-bold text-foreground shadow-2xs">
        <CalendarDays className="size-3.5 text-primary shrink-0" />
        <span className="hidden sm:inline text-muted-foreground text-[11px] font-semibold">Session:</span>
        <Select
          value={selectedId}
          onValueChange={(value) => {
            setSelectedId(value);
            if (isStudent) {
              setStoredActiveStudentEnrollmentId(Number(value));
              return;
            }
            const session = sessions.find((item) => String(item.id) === value);
            if (session) {
              setStoredActiveAcademicSession(session);
            } else {
              setStoredActiveAcademicYearId(Number(value), activeInstitutionId);
            }
          }}
          disabled={loading || options.length === 0}
        >
          <SelectTrigger className="h-7 border-0 bg-transparent p-0 text-xs font-bold shadow-none focus:ring-0 gap-1.5 min-w-[90px] max-w-[150px]">
            <SelectValue placeholder={loading ? "Loading..." : "Select Year"} />
          </SelectTrigger>
          <SelectContent align="start">
            {options.map((option) => (
              <SelectItem key={option.id} value={String(option.id)} className="text-xs font-semibold">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loading ? <Loader2 className="size-3 animate-spin text-muted-foreground" /> : null}
      </div>
    </div>
  );
}

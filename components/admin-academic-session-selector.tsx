"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";

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
  const [sessions, setSessions] = useState<ActiveAcademicSession[]>([]);
  const [studentEnrollments, setStudentEnrollments] = useState<ActiveStudentEnrollment[]>([]);
  const [selectedId, setSelectedId] = useState(() => {
    const storedId = user?.role_codes?.includes("student")
      ? getStoredActiveStudentEnrollmentId()
      : null;
    return storedId ? String(storedId) : "";
  });
  const [loading, setLoading] = useState(false);
  const isStudent = Boolean(user?.role_codes?.includes("student"));

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

    if (!accessToken || !activeInstitutionId) {
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

    setLoading(true);
    try {
      const params = new URLSearchParams({
        institutionId: String(activeInstitutionId),
        page: "1",
        limit: "100",
        pastOrCurrentOnly: "true",
      });
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
      setStoredActiveAcademicSessions(activeInstitutionId, rows);

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
  }, [accessToken, activeInstitutionId, isStudent]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSessions();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadSessions]);

  if (!isStudent && !activeInstitutionId) return null;
  const options = isStudent
    ? uniqueStudentEnrollments.map((enrollment) => ({
      id: enrollment.id,
      label: enrollment.academicYearName,
    }))
    : sessions.map((session) => ({
      id: session.id,
      label: session.name,
    }));

  return (
    <div className="flex min-w-0 items-center gap-2">
      <CalendarDays className="size-4 text-muted-foreground" />
      <Select
        value={selectedId}
        onValueChange={(value) => {
          setSelectedId(value);
          if (isStudent) {
            setStoredActiveStudentEnrollmentId(Number(value));
            return;
          }
          const session = sessions.find((item) => String(item.id) === value);
          if (session) setStoredActiveAcademicSession(session);
          else setStoredActiveAcademicYearId(Number(value), activeInstitutionId);
        }}
        disabled={loading || options.length === 0}
      >
        <SelectTrigger className="h-9 w-48 max-w-[42vw]">
          <SelectValue placeholder={loading ? "Loading session..." : "Select session"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={String(option.id)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      {selectedSession || selectedEnrollment ? (
        <span className="hidden text-xs text-muted-foreground lg:inline">
          Current active session
        </span>
      ) : null}
    </div>
  );
}

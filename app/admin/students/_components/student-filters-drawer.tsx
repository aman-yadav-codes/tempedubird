"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { SlidersHorizontal } from "lucide-react"

import { AsyncSearchPopover } from "@/components/shared/async-search-popover"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ProgramOption = {
  id: number
  title: string
  academic_year_id?: number | null
  academic_year_name?: string | null
}

type AcademicYearOption = {
  id: number
  name: string
}

type SectionOption = {
  id: number
  name: string
}

export type StudentFilters = {
  search: string
  programId: string
  programLabel: string
  sectionId: string
  sectionLabel: string
  academicYearId: string
  academicYearLabel: string
}

type StudentFiltersDrawerProps = {
  filters: StudentFilters
  activeCount: number
  accessToken: string | null
  institutionId?: number | null
  onApply: (filters: StudentFilters) => void
  onReset: () => void
}

const defaultStudentFilters: StudentFilters = {
  search: "",
  programId: "",
  programLabel: "",
  sectionId: "",
  sectionLabel: "",
  academicYearId: "",
  academicYearLabel: "",
}

export function getDefaultStudentFilters() {
  return { ...defaultStudentFilters }
}

export function isStudentFilters(value: unknown): value is StudentFilters {
  if (!value || typeof value !== "object") return false
  const filters = value as Partial<Record<keyof StudentFilters, unknown>>
  return (
    typeof filters.search === "string" &&
    typeof filters.programId === "string" &&
    typeof filters.programLabel === "string" &&
    typeof filters.sectionId === "string" &&
    typeof filters.sectionLabel === "string" &&
    typeof filters.academicYearId === "string" &&
    typeof filters.academicYearLabel === "string"
  )
}

export function StudentFiltersDrawer({
  filters,
  activeCount,
  accessToken,
  institutionId,
  onApply,
  onReset,
}: StudentFiltersDrawerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<StudentFilters>(filters)
  const [sections, setSections] = useState<SectionOption[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const authHeader = useMemo(
    () => accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    [accessToken],
  )

  const fetchPrograms = useCallback(async (search: string, page: number) => {
    if (!institutionId) return { data: [], hasMore: false }
    const params = new URLSearchParams({
      institutionId: String(institutionId),
      search,
      page: String(page),
      limit: "10",
    })
    const res = await fetch(`/api/admin/institutions/programs?${params.toString()}`, {
      headers: authHeader,
    })
    if (!res.ok) throw new Error("Failed to fetch classes")
    const json = await res.json()
    return {
      data: (json.data ?? []) as ProgramOption[],
      hasMore: page < (json.pageCount ?? page),
    }
  }, [authHeader, institutionId])

  const fetchAcademicYears = useCallback(async (search: string, page: number) => {
    if (!institutionId) return { data: [], hasMore: false }
    const params = new URLSearchParams({
      institutionId: String(institutionId),
      search,
      page: String(page),
      limit: "10",
    })
    const res = await fetch(`/api/admin/institutions/academic-years?${params.toString()}`, {
      headers: authHeader,
    })
    if (!res.ok) throw new Error("Failed to fetch years")
    const json = await res.json()
    return {
      data: (json.data ?? []) as AcademicYearOption[],
      hasMore: page < (json.pageCount ?? page),
    }
  }, [authHeader, institutionId])

  useEffect(() => {
    if (!open || !draft.programId || !accessToken) return

    let cancelled = false
    async function loadSections() {
      setSectionsLoading(true)
      try {
        const res = await fetch(`/api/admin/institutions/programs/${draft.programId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error ?? "Failed to load sections")
        if (cancelled) return
        const data = json.data ?? {}
        const nextSections = ((data.section_ids ?? []) as number[]).map((sectionId, index) => ({
          id: sectionId,
          name: data.section_names?.[index] ?? `Section ${sectionId}`,
        }))
        setSections(nextSections)
        setDraft((current) => {
          if (!current.sectionId) return current
          const sectionExists = nextSections.some((section) => String(section.id) === current.sectionId)
          return sectionExists
            ? current
            : { ...current, sectionId: "", sectionLabel: "" }
        })
      } catch {
        if (!cancelled) setSections([])
      } finally {
        if (!cancelled) setSectionsLoading(false)
      }
    }

    void loadSections()
    return () => {
      cancelled = true
    }
  }, [accessToken, draft.programId, open])

  const applyFilters = () => {
    onApply(draft)
    setOpen(false)
  }

  const resetFilters = () => {
    setDraft(getDefaultStudentFilters())
    onReset()
    setOpen(false)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setDraft(filters)
        } else {
          setSections([])
          setSectionsLoading(false)
        }
        setOpen(nextOpen)
      }}
      direction="bottom"
    >
      <DrawerTrigger asChild>
        <Button variant="outline" className="relative w-full sm:w-auto">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="ml-2 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[85dvh] w-full max-w-none overflow-hidden border-x-0 sm:h-[50dvh]">
        <DrawerHeader className="px-6 text-left md:text-left">
          <DrawerTitle>Student Filters</DrawerTitle>
          <DrawerDescription>
            Narrow the students list by class, section, and academic year.
          </DrawerDescription>
        </DrawerHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto px-6 pb-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Class</Label>
            <AsyncSearchPopover<ProgramOption>
              value={draft.programId}
              onChange={(value) => {
                setSections([])
                setDraft((current) => ({
                  ...current,
                  programId: value,
                  programLabel: value ? current.programLabel : "",
                  sectionId: "",
                  sectionLabel: "",
                }))
              }}
              onSelectItem={(program) => {
                setSections([])
                setDraft((current) => ({
                  ...current,
                  programId: String(program.id),
                  programLabel: program.title,
                  sectionId: "",
                  sectionLabel: "",
                }))
              }}
              selectedLabel={draft.programLabel || undefined}
              placeholder="All classes"
              searchPlaceholder="Search classes..."
              emptyText="No class found"
              fetcher={fetchPrograms}
              getValue={(program) => String(program.id)}
              getLabel={(program) => program.title}
              showDefaultOption
              defaultOptionLabel="All classes"
              defaultOptionValue=""
              hideDefaultOptionOnSearch
            />
          </div>

          <div className="space-y-2">
            <Label>Section</Label>
            <Select
              value={draft.sectionId || "all"}
              disabled={!draft.programId || sectionsLoading}
              onValueChange={(value) => {
                const section = sections.find((item) => String(item.id) === value)
                setDraft((current) => ({
                  ...current,
                  sectionId: value === "all" ? "" : value,
                  sectionLabel: value === "all" ? "" : section?.name ?? "",
                }))
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={sectionsLoading ? "Loading sections..." : "All sections"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sections</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={String(section.id)}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Academic Year</Label>
            <AsyncSearchPopover<AcademicYearOption>
              value={draft.academicYearId}
              onChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  academicYearId: value,
                  academicYearLabel: value ? current.academicYearLabel : "",
                }))
              }}
              onSelectItem={(year) => {
                setDraft((current) => ({
                  ...current,
                  academicYearId: String(year.id),
                  academicYearLabel: year.name,
                }))
              }}
              selectedLabel={draft.academicYearLabel || undefined}
              placeholder="All years"
              searchPlaceholder="Search years..."
              emptyText="No year found"
              fetcher={fetchAcademicYears}
              getValue={(year) => String(year.id)}
              getLabel={(year) => year.name}
              showDefaultOption
              defaultOptionLabel="All years"
              defaultOptionValue=""
              hideDefaultOptionOnSearch
            />
          </div>
        </div>

        <DrawerFooter className="shrink-0 border-t px-6 sm:flex-row sm:items-center sm:justify-end">
          <DrawerClose asChild>
            <Button variant="ghost" className="sm:w-28">Cancel</Button>
          </DrawerClose>
          <Button variant="outline" onClick={resetFilters} className="sm:w-28">Reset</Button>
          <Button onClick={applyFilters} className="sm:w-36">Apply Filters</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

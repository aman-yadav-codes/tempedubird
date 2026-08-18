"use client"

import { useState } from "react"
import { SlidersHorizontal } from "lucide-react"

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

export const STAFF_TABLE_ROLE_CODES = [
  "institution_admin",
  "teacher",
  "driver",
  "platform_admin",
] as const

export type StaffRoleFilter = "all" | typeof STAFF_TABLE_ROLE_CODES[number]

export type StaffFilters = {
  search: string
  roleCode: StaffRoleFilter
  status: "all" | "active" | "inactive"
}

const defaultStaffFilters: StaffFilters = {
  search: "",
  roleCode: "all",
  status: "all",
}

type StaffFiltersDrawerProps = {
  filters: StaffFilters
  activeCount: number
  onApply: (filters: StaffFilters) => void
  onReset: () => void
}

export function getDefaultStaffFilters() {
  return { ...defaultStaffFilters }
}

export function isStaffRoleFilter(value: unknown): value is StaffRoleFilter {
  return value === "all" || STAFF_TABLE_ROLE_CODES.includes(value as typeof STAFF_TABLE_ROLE_CODES[number])
}

export function isStaffFilters(value: unknown): value is StaffFilters {
  if (!value || typeof value !== "object") return false
  const filters = value as Partial<Record<keyof StaffFilters, unknown>>
  return (
    typeof filters.search === "string" &&
    isStaffRoleFilter(filters.roleCode) &&
    (filters.status === "all" || filters.status === "active" || filters.status === "inactive")
  )
}

export function StaffFiltersDrawer({
  filters,
  activeCount,
  onApply,
  onReset,
}: StaffFiltersDrawerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<StaffFilters>(filters)

  const applyFilters = () => {
    onApply(draft)
    setOpen(false)
  }

  const resetFilters = () => {
    setDraft(getDefaultStaffFilters())
    onReset()
    setOpen(false)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setDraft(filters)
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
          <DrawerTitle>Staff Filters</DrawerTitle>
          <DrawerDescription>
            Narrow the staff list by role and account status.
          </DrawerDescription>
        </DrawerHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto px-6 pb-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={draft.roleCode}
              onValueChange={(roleCode) => {
                if (isStaffRoleFilter(roleCode)) {
                  setDraft((current) => ({ ...current, roleCode }))
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="institution_admin">Institution Admin</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
                <SelectItem value="platform_admin">Platform Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={draft.status}
              onValueChange={(status: StaffFilters["status"]) => {
                setDraft((current) => ({ ...current, status }))
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
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

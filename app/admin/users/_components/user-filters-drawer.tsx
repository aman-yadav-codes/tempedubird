"use client"

import { useState } from "react"
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
import type { RoleOption } from "@/app/admin/users/add-user-dialog"

type InstitutionOption = {
  id: number
  name?: string
  organization_name?: string | null
  slug?: string
}

export type UserFilters = {
  search: string
  institutionId: string
  institutionLabel: string
  roleId: string
  status: "all" | "active" | "inactive"
}

type UserFiltersDrawerProps = {
  filters: UserFilters
  roles: RoleOption[]
  activeCount: number
  accessToken: string | null
  onApply: (filters: UserFilters) => void
  onReset: () => void
}

const defaultDraft: UserFilters = {
  search: "",
  institutionId: "",
  institutionLabel: "",
  roleId: "all",
  status: "all",
}

export function getDefaultUserFilters(): UserFilters {
  return { ...defaultDraft }
}

export function isUserFilters(value: unknown): value is UserFilters {
  if (!value || typeof value !== "object") return false
  const filters = value as Partial<Record<keyof UserFilters, unknown>>
  return (
    typeof filters.search === "string" &&
    typeof filters.institutionId === "string" &&
    typeof filters.institutionLabel === "string" &&
    typeof filters.roleId === "string" &&
    (filters.status === "all" || filters.status === "active" || filters.status === "inactive")
  )
}

export function UserFiltersDrawer({
  filters,
  roles,
  activeCount,
  accessToken,
  onApply,
  onReset,
}: UserFiltersDrawerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<UserFilters>(filters)

  const authHeader = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined

  async function fetchInstitutions(search: string, page: number) {
    const params = new URLSearchParams({
      search,
      page: String(page),
      limit: "10",
    })
    const res = await fetch(`/api/admin/institutions/profiles?${params.toString()}`, {
      headers: authHeader,
    })
    if (!res.ok) throw new Error("Failed to fetch institutions")
    const json = await res.json()
    return {
      data: (json.data ?? []) as InstitutionOption[],
      hasMore: page < (json.pageCount ?? page),
    }
  }

  const applyFilters = () => {
    onApply(draft)
    setOpen(false)
  }

  const resetFilters = () => {
    setDraft(getDefaultUserFilters())
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
          <DrawerTitle>User Filters</DrawerTitle>
          <DrawerDescription>
            Narrow the users list by institution, role, and account status.
          </DrawerDescription>
        </DrawerHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto px-6 pb-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Institution</Label>
            <AsyncSearchPopover<InstitutionOption>
              value={draft.institutionId}
              onChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  institutionId: value,
                  institutionLabel: value ? current.institutionLabel : "",
                }))
              }}
              onSelectItem={(item) => {
                setDraft((current) => ({
                  ...current,
                  institutionId: String(item.id),
                  institutionLabel: item.organization_name || item.name || item.slug || `Institution ${item.id}`,
                }))
              }}
              selectedLabel={draft.institutionLabel || undefined}
              placeholder="All institutions"
              searchPlaceholder="Search institutions..."
              emptyText="No institution found"
              fetcher={fetchInstitutions}
              getValue={(item) => String(item.id)}
              getLabel={(item) => item.organization_name || item.name || item.slug || `Institution ${item.id}`}
              showDefaultOption
              defaultOptionLabel="All institutions"
              defaultOptionValue=""
              hideDefaultOptionOnSearch
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={draft.roleId}
              onValueChange={(value) => setDraft((current) => ({ ...current, roleId: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={draft.status}
              onValueChange={(value: UserFilters["status"]) => setDraft((current) => ({ ...current, status: value }))}
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

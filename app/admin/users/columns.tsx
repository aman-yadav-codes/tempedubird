"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, KeyRound, MoreHorizontal, UserCheck, ShieldAlert, Users, Landmark } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatIndianDate } from "@/lib/format-time"

export type User = {
  id: number
  full_name: string
  email: string
  phone: string | null
  is_active: boolean
  is_verified: boolean
  created_at: string
  roles: string[]
  generated_password?: string | null
  employment_status?: string | null
  show_in_team?: boolean
}

type UserColumnsOptions = {
  onViewProfile: (user: User) => void
  onEditUser: (user: User) => void
  onManageSalaryAccount?: (user: User) => void
  onGeneratePassword?: (user: User) => void
  onChangeEmploymentStatus?: (user: User, status: string) => void
  onToggleShowInTeam?: (user: User, showInTeam: boolean) => void
  onRemoveUser: (user: User) => void
  removalLabel: string
  entityLabel?: string
}

export function buildUserColumns({
  onViewProfile,
  onEditUser,
  onManageSalaryAccount,
  onGeneratePassword,
  onChangeEmploymentStatus,
  onToggleShowInTeam,
  onRemoveUser,
  removalLabel,
  entityLabel = "user",
}: UserColumnsOptions): ColumnDef<User>[] {
  return [
    // Checkbox column
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    // Name
    {
      accessorKey: "full_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 px-3"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium">{user.full_name}</span>
            {user.show_in_team && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/20 font-semibold">
                Team
              </Badge>
            )}
          </div>
        );
      },
    },
    // Email
    {
      accessorKey: "email",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 px-3"
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("email")}</span>
      ),
    },
    // Role
    {
      accessorKey: "roles",
      header: "Role",
      cell: ({ row }) => <span className="text-muted-foreground capitalize">{((row.getValue("roles") as string[]) || []).join(', ')}</span>,
    },
    // Saved Password
    {
      accessorKey: "generated_password",
      header: "Saved Password",
      cell: ({ row }) => {
        const pass = row.getValue("generated_password") as string | undefined | null;
        if (!pass) return <span className="text-xs text-muted-foreground italic">Not saved</span>;
        return (
          <code className="px-2 py-0.5 rounded bg-muted text-xs font-mono text-foreground font-semibold">
            {pass}
          </code>
        );
      },
    },
    // Status & Employment Status
    {
      accessorKey: "is_active",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 px-3"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const user = row.original;
        const isActive = user.is_active;
        const empStatus = (user.employment_status || (isActive ? "ACTIVE" : "INACTIVE")).toUpperCase();

        const statusBadges: Record<string, { label: string; className: string }> = {
          ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200" },
          PROBATION: { label: "Probation", className: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200" },
          ON_LEAVE: { label: "On Leave", className: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200" },
          NOTICE_PERIOD: { label: "Notice Period", className: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200" },
          RETIRED: { label: "Retired", className: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200" },
          TERMINATED: { label: "Terminated / Fired", className: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200" },
          RESIGNED: { label: "Resigned", className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200" },
          INACTIVE: { label: "Inactive", className: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200" },
        };

        const config = statusBadges[empStatus] || { label: empStatus, className: "bg-muted text-muted-foreground border-border" };

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
    // Joined
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 px-3"
        >
          Joined
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        return (
          <span className="text-muted-foreground">
            {formatIndianDate(row.getValue("created_at"))}
          </span>
        )
      },
    },
    // Row actions
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(user.email)}
              >
                Copy email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onViewProfile(user)}>
                View profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditUser(user)}>
                Edit {entityLabel.toLowerCase()}
              </DropdownMenuItem>
              {onManageSalaryAccount && (
                <DropdownMenuItem
                  onClick={() => onManageSalaryAccount(user)}
                  className="cursor-pointer font-medium"
                >
                  <Landmark className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Salary & Bank Account
                </DropdownMenuItem>
              )}
              {onGeneratePassword && (
                <DropdownMenuItem onClick={() => onGeneratePassword(user)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Generate password
                </DropdownMenuItem>
              )}

              {onChangeEmploymentStatus && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <UserCheck className="mr-2 h-4 w-4 text-primary" />
                      Employment Status
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48">
                      <DropdownMenuItem onClick={() => onChangeEmploymentStatus(user, "ACTIVE")}>
                        🟢 Active
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeEmploymentStatus(user, "PROBATION")}>
                        ⏳ On Probation
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeEmploymentStatus(user, "ON_LEAVE")}>
                        🗓️ On Leave
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeEmploymentStatus(user, "NOTICE_PERIOD")}>
                        ⚠️ Notice Period
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeEmploymentStatus(user, "RETIRED")}>
                        👴 Retired
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeEmploymentStatus(user, "RESIGNED")}>
                        📄 Resigned
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive font-medium"
                        onClick={() => onChangeEmploymentStatus(user, "TERMINATED")}
                      >
                        🚫 Fired / Terminated
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}

              {onToggleShowInTeam && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer font-medium"
                    onClick={() => onToggleShowInTeam(user, !user.show_in_team)}
                  >
                    <Users className="mr-2 h-4 w-4 text-purple-600" />
                    {user.show_in_team ? "Remove from Team" : "Show in Team"}
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onRemoveUser(user)}
              >
                {removalLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

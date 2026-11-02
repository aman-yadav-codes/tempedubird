"use client"

import { ColumnDef } from "@tanstack/react-table"
import {
  ArrowUpDown,
  BadgeDollarSign,
  Calendar,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  KeyRound,
  Landmark,
  MoreHorizontal,
  Pencil,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
  Copy,
  Sparkles,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
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
  currentUserId?: number
  onViewProfile?: (user: User) => void
  onEditUser: (user: User) => void
  onManageSalaryAccount?: (user: User) => void
  onManageCommission?: (user: User) => void
  onGeneratePassword?: (user: User) => void
  onChangeEmploymentStatus?: (user: User, status: string) => void
  onToggleShowInTeam?: (user: User, showInTeam: boolean) => void
  onViewDocuments?: (user: User) => void
  onViewSalaryRecords?: (user: User) => void
  onViewSalarySlips?: (user: User) => void
  onViewAttendance?: (user: User) => void
  onViewPerformance?: (user: User) => void
  onRemoveUser: (user: User) => void
  removalLabel: string
  entityLabel?: string
  basePrefix?: string
}

export function buildUserColumns({
  currentUserId,
  onViewProfile,
  onEditUser,
  onManageSalaryAccount,
  onManageCommission,
  onGeneratePassword,
  onChangeEmploymentStatus,
  onToggleShowInTeam,
  onViewDocuments,
  onViewSalaryRecords,
  onViewSalarySlips,
  onViewAttendance,
  onViewPerformance,
  onRemoveUser,
  removalLabel,
  entityLabel = "user",
  basePrefix = "/admin",
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
      cell: ({ row }) => {
        const isSelf = Boolean(currentUserId && row.original.id === currentUserId);
        return (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={isSelf}
            onCheckedChange={(value) => {
              if (isSelf) return;
              row.toggleSelected(!!value);
            }}
            aria-label={isSelf ? "Current user cannot be selected" : "Select row"}
          />
        );
      },
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
        const isSelf = Boolean(currentUserId && user.id === currentUserId);
        const prefix = basePrefix || "/admin";
        const profileUrl = `${prefix}/staff/profile?id=${user.id}`;
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline text-foreground hover:text-primary transition-colors cursor-pointer"
              title="Open profile in new tab"
            >
              {user.full_name}
            </a>
            {isSelf && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold">
                You
              </Badge>
            )}
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
        const user = row.original;
        const pass = row.getValue("generated_password") as string | undefined | null;
        if (!pass) {
          return onGeneratePassword ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGeneratePassword(user)}
              className="h-6 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 gap-1 rounded-md border border-dashed border-primary/40 cursor-pointer shadow-2xs"
              title="Generate login password for this staff member"
            >
              <Sparkles className="w-3 h-3 text-primary" />
              <span>+ Generate</span>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground italic">Not saved</span>
          );
        }
        return (
          <div className="flex items-center gap-1.5">
            <code
              onClick={() => onGeneratePassword && onGeneratePassword(user)}
              className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-xs font-mono text-foreground font-semibold cursor-pointer transition-colors border border-border"
              title="Click to view or edit login credentials"
            >
              {pass}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Copy password to clipboard"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(pass);
                toast.success(`Password for ${user.full_name} copied!`);
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
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
        const isSelf = Boolean(currentUserId && user.id === currentUserId)
        const prefix = basePrefix || "/admin"
        return (
          <div className="flex items-center gap-1.5 justify-end">
            {onGeneratePassword && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onGeneratePassword(user)}
                className="h-8 px-2.5 rounded-lg text-xs font-semibold border-primary/30 hover:bg-primary/10 text-primary gap-1.5 cursor-pointer shadow-2xs"
                title="Generate or view staff login password"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Password</span>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEditUser(user)} className="cursor-pointer">
                <Pencil className="mr-2 h-4 w-4" />
                Edit {entityLabel.toLowerCase()}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onViewDocuments ? onViewDocuments(user) : window.open(`${prefix}/staff/documents?staffUserId=${user.id}`, "_blank")}
                className="cursor-pointer font-medium"
              >
                <FileText className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                Documents
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
              <DropdownMenuItem
                onClick={() => onViewSalaryRecords ? onViewSalaryRecords(user) : window.open(`${prefix}/staff/salary?staffUserId=${user.id}`, "_blank")}
                className="cursor-pointer font-medium"
              >
                <IndianRupee className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Salary Records
              </DropdownMenuItem>
              {onManageCommission && (
                <DropdownMenuItem
                  onClick={() => onManageCommission(user)}
                  className="cursor-pointer font-medium"
                >
                  <BadgeDollarSign className="mr-2 h-4 w-4 text-primary" />
                  Commission & Incentive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onViewSalarySlips ? onViewSalarySlips(user) : window.open(`${prefix}/staff/salary-slips?staffUserId=${user.id}`, "_blank")}
                className="cursor-pointer font-medium"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4 text-teal-600 dark:text-teal-400" />
                Salary Slips
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onViewAttendance ? onViewAttendance(user) : window.open(`${prefix}/staff/attendance?staffUserId=${user.id}`, "_blank")}
                className="cursor-pointer font-medium"
              >
                <Calendar className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
                Attendance
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onViewPerformance ? onViewPerformance(user) : window.open(`${prefix}/staff/performance?staffUserId=${user.id}`, "_blank")}
                className="cursor-pointer font-medium"
              >
                <TrendingUp className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                Performance
              </DropdownMenuItem>
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
                      {!isSelf && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive font-medium"
                            onClick={() => onChangeEmploymentStatus(user, "TERMINATED")}
                          >
                            🚫 Fired / Terminated
                          </DropdownMenuItem>
                        </>
                      )}
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

              {!isSelf && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onRemoveUser(user)}
                  >
                    {removalLabel}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
  ]
}

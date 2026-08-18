"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, KeyRound, MoreHorizontal } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
}

type UserColumnsOptions = {
  onViewProfile: (user: User) => void
  onEditUser: (user: User) => void
  onGeneratePassword?: (user: User) => void
  onRemoveUser: (user: User) => void
  removalLabel: string
  entityLabel?: string
}

export function buildUserColumns({
  onViewProfile,
  onEditUser,
  onGeneratePassword,
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
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("full_name")}</span>
      ),
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
    // Status
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
        const isActive = row.getValue("is_active") as boolean

        return (
          <Badge
            variant="default"
            className={
              isActive
                ? "bg-green-100 text-green-700 hover:bg-green-100"
                : "bg-red-100 text-red-700 hover:bg-red-100"
            }
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        )
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
            <DropdownMenuContent align="end">
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
              {onGeneratePassword && (
                <DropdownMenuItem onClick={() => onGeneratePassword(user)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Generate password
                </DropdownMenuItem>
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

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Eye, GraduationCap, KeyRound, Loader2, MoreHorizontal, Pencil, Repeat2, Trash2, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatIndianDate } from "@/lib/format-time";

export type Student = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  institutions: string[];
  status?: string | null;
  program_name?: string | null;
  section_name?: string | null;
  academic_year_name?: string | null;
  roll_number?: string | null;
};

type StudentColumnsOptions = {
  onViewProfile: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  onRemoveStudent: (student: Student) => void;
  onAssignClass?: (student: Student) => void;
  onManageGuardians?: (student: Student) => void;
  onManagePromotions?: (student: Student) => void;
  onSetPassword?: (student: Student) => void;
  removalLabel: string;
  loadingStudentId?: number | null;
};

export function buildStudentColumns({
  onViewProfile,
  onEditStudent,
  onRemoveStudent,
  onAssignClass,
  onManageGuardians,
  onManagePromotions,
  onSetPassword,
  removalLabel,
  loadingStudentId = null,
}: StudentColumnsOptions): ColumnDef<Student>[] {
  return [
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
          checked={Boolean(row.getIsSelected())}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
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
        <button
          type="button"
          className="text-left font-medium hover:text-primary"
          onClick={() => onViewProfile(row.original)}
        >
          {row.getValue("full_name")}
        </button>
      ),
    },
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
    {
      id: "class_scope",
      header: "Class",
      cell: ({ row }) => {
        const student = row.original;
        const sectionText = student.section_name
          ? (student.section_name.toLowerCase().startsWith("section")
              ? student.section_name
              : `Section ${student.section_name}`)
          : null;
        const classLine = [
          student.program_name,
          sectionText,
        ].filter(Boolean).join(" - ");

        const detailsLine = [
          student.academic_year_name,
          student.roll_number ? `Roll: ${student.roll_number}` : null,
        ].filter(Boolean).join(" • ");

        return (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground text-xs sm:text-sm">{classLine || "-"}</p>
            {detailsLine ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{detailsLine}</p>
            ) : null}
          </div>
        );
      },
    },
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
        const student = row.original;
        const isDraft = student.id < 0 || student.status === "Draft";
        const isActive = row.getValue("is_active") as boolean;

        if (isDraft) {
          return (
            <Badge
              variant="default"
              className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-semibold border-amber-300"
            >
              Draft Saved
            </Badge>
          );
        }

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
        );
      },
    },
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
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatIndianDate(row.getValue("created_at"))}
        </span>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const student = row.original;
        if (loadingStudentId === student.id) {
          return (
            <div className="flex h-8 w-8 items-center justify-center">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="sr-only">Loading student details</span>
            </div>
          );
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5 font-medium">
              <DropdownMenuLabel className="text-xs font-bold text-muted-foreground px-2 py-1">Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onViewProfile(student)} className="cursor-pointer py-2 text-xs font-semibold">
                <Eye className="mr-2 h-4 w-4 text-primary" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEditStudent(student)} className="cursor-pointer py-2 text-xs font-semibold">
                <Pencil className="mr-2 h-4 w-4 text-primary" />
                Edit Student
              </DropdownMenuItem>
              {onAssignClass && (
                <DropdownMenuItem onSelect={() => onAssignClass(student)} className="cursor-pointer py-2 text-xs font-semibold">
                  <GraduationCap className="mr-2 h-4 w-4 text-primary" />
                  Assign Class
                </DropdownMenuItem>
              )}
              {onManageGuardians && (
                <DropdownMenuItem onSelect={() => onManageGuardians(student)} className="cursor-pointer py-2 text-xs font-semibold">
                  <UsersRound className="mr-2 h-4 w-4 text-primary" />
                  Manage Guardians
                </DropdownMenuItem>
              )}
              {onManagePromotions && (
                <DropdownMenuItem onSelect={() => onManagePromotions(student)} className="cursor-pointer py-2 text-xs font-semibold">
                  <Repeat2 className="mr-2 h-4 w-4 text-primary" />
                  Promotion Details
                </DropdownMenuItem>
              )}
              {onSetPassword && (
                <DropdownMenuItem onSelect={() => onSetPassword(student)} className="cursor-pointer py-2 text-xs font-semibold">
                  <KeyRound className="mr-2 h-4 w-4 text-primary" />
                  Set Password
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer py-2 text-xs font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive"
                onSelect={() => onRemoveStudent(student)}
              >
                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                {removalLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  PaginationState,
  OnChangeFn,
  Row,
  RowSelectionState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

function formatColumnLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getColumnMenuLabel(column: { id: string; columnDef: { header?: unknown } }) {
  const header = column.columnDef.header;

  if (typeof header === "string" || typeof header === "number") {
    const text = String(header).trim();
    if (text) return text;
  }

  return formatColumnLabel(column.id);
}

function isInteractiveTableClick(
  target: EventTarget | null,
  rowElement: HTMLElement
) {
  if (!(target instanceof Element)) return false
  const interactiveElement = target.closest(
    "button, a, input, select, textarea, [role='button'], [role='menuitem'], [data-radix-collection-item]"
  )
  return Boolean(interactiveElement && interactiveElement !== rowElement)
}

function getDefaultRowId<TData>(originalRow: TData, index: number) {
  if (originalRow && typeof originalRow === "object" && "id" in originalRow) {
    const id = (originalRow as { id?: unknown }).id
    if (typeof id === "string" || typeof id === "number") return String(id)
  }
  return String(index)
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  toolbarLeft?:
    | React.ReactNode
    | ((controls: { columnsButton: (className?: string) => React.ReactNode }) => React.ReactNode)
  toolbarRight?: React.ReactNode
  toolbarBelow?: React.ReactNode
  hideMobileColumnsButton?: boolean
  showRowNumbers?: boolean
  rowNumberHeader?: string
  filterPlaceholder?: string
  filterKey?: string
  searchKey?: string
  pageCount?: number
  totalRows?: number
  manualPagination?: boolean
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
  loading?: boolean
  emptyText?: string
  getRowId?: (originalRow: TData, index: number) => string
  selectionResetKey?: string | number
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean)
  onRowClick?: (row: TData) => void
  onSelectionChange?: (selectedRows: TData[]) => void
  selectedActions?: (
    selectedRows: TData[],
    resetSelection: () => void
  ) => React.ReactNode
}
export function DataTable<TData, TValue>({
  columns,
  data,
  showRowNumbers = false,
  rowNumberHeader = "No.",
  filterPlaceholder = "Filter...",
  filterKey,
  searchKey,
  hideMobileColumnsButton = false,
  toolbarLeft,
  toolbarRight,
  toolbarBelow,
  pageCount,
  totalRows,
  manualPagination,
  pagination,
  onPaginationChange,
  loading = false,
  emptyText = "No results.",
  getRowId,
  selectionResetKey,
  enableRowSelection,
  onRowClick,
  onSelectionChange,
  selectedActions,
}: DataTableProps<TData, TValue>) {
  // Support both filterKey and searchKey prop names
  const activeFilterKey = filterKey ?? searchKey
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [selectedRowCache, setSelectedRowCache] = React.useState<Record<string, TData>>({})

  // TanStack Table intentionally returns dynamic functions that React Compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination: onPaginationChange !== undefined ? true : manualPagination,
    getRowId: getRowId ?? getDefaultRowId,
    enableRowSelection,
    onPaginationChange,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      ...(pagination !== undefined && { pagination }),
    },
  })
  const selectedRowIds = React.useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection]
  )
  const currentPageSelectedRows = React.useMemo(() => {
    const map = new Map<string, TData>()
    table.getRowModel().rows.forEach((row) => {
      if (row.getIsSelected()) map.set(row.id, row.original)
    })
    return map
  }, [table])
  const selectedRows = React.useMemo(
    () => selectedRowIds
      .map((id) => currentPageSelectedRows.get(id) ?? selectedRowCache[id])
      .filter((row): row is TData => Boolean(row)),
    [currentPageSelectedRows, selectedRowCache, selectedRowIds]
  )
  const resetSelection = () => {
    setSelectedRowCache({})
    table.resetRowSelection()
  }

  React.useEffect(() => {
    setSelectedRowCache({})
    setRowSelection({})
  }, [selectionResetKey])

  React.useEffect(() => {
    setSelectedRowCache((current) => {
      const next = { ...current }
      table.getRowModel().rows.forEach((row) => {
        if (row.getIsSelected()) {
          next[row.id] = row.original
        } else {
          delete next[row.id]
        }
      })
      Object.keys(next).forEach((id) => {
        if (!rowSelection[id]) delete next[id]
      })
      const currentKeys = Object.keys(current)
      const nextKeys = Object.keys(next)
      const unchanged =
        currentKeys.length === nextKeys.length &&
        nextKeys.every((key) => current[key] === next[key])
      return unchanged ? current : next
    })
  }, [rowSelection, table])

  React.useEffect(() => {
    onSelectionChange?.(selectedRows)
  }, [data, onSelectionChange, selectedRows])

  const paginationState = table.getState().pagination
  const rowNumberOffset = paginationState.pageIndex * paginationState.pageSize
  const hasSelectionColumn = table.getAllLeafColumns()[0]?.id === "select"
  const visibleColumnCount = table.getVisibleLeafColumns().length + (showRowNumbers ? 1 : 0)
  const skeletonRowCount = Math.min(Math.max(pagination?.pageSize ?? 5, 3), 8)
  const visibleRowCount = table.getRowModel().rows.length
  const filteredRowCount = table.getFilteredRowModel().rows.length
  const totalRecordCount = totalRows ?? filteredRowCount
  const rangeStart = totalRecordCount === 0 ? 0 : rowNumberOffset + 1
  const rangeEnd = totalRecordCount === 0
    ? 0
    : Math.min(rowNumberOffset + visibleRowCount, totalRecordCount)
  const renderColumnsButton = (className?: string) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className}>
          Columns <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {table
          .getAllColumns()
          .filter((col) => col.getCanHide())
          .map((col) => (
            <DropdownMenuCheckboxItem
              key={col.id}
              className="capitalize"
              checked={col.getIsVisible()}
              onCheckedChange={(value) => col.toggleVisibility(!!value)}
            >
              {getColumnMenuLabel(col)}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
  const toolbarLeftContent =
    typeof toolbarLeft === "function"
      ? toolbarLeft({ columnsButton: renderColumnsButton })
      : toolbarLeft

  return (
    <div className="w-full min-w-0">
      {/* Toolbar */}
      <div className="flex flex-col items-stretch gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap gap-2 sm:flex-nowrap sm:items-center">
          {activeFilterKey && (
            <Input
              placeholder={filterPlaceholder}
              value={(table.getColumn(activeFilterKey)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(activeFilterKey)?.setFilterValue(event.target.value)
              }
              className="w-full sm:max-w-sm"
            />
          )}
          {toolbarLeftContent}
          {!hideMobileColumnsButton && (
            <div className="min-w-0 flex-1 sm:hidden">
              {renderColumnsButton("w-full")}
            </div>
          )}
        </div>

        <div className="hidden w-full items-center justify-end gap-2 sm:flex sm:w-auto">
          {renderColumnsButton("flex-1 sm:flex-none")}
          {toolbarRight}
        </div>
      </div>
      {toolbarBelow && <div className="pb-4">{toolbarBelow}</div>}

      {selectedRowIds.length > 0 && selectedActions && (
        <div className="mb-3 flex flex-col gap-3 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium">
            {selectedRowIds.length} selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedActions(selectedRows, resetSelection)}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border bg-card">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <React.Fragment key={header.id}>
                      <TableHead className="whitespace-nowrap">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                      {showRowNumbers && hasSelectionColumn && index === 0 && (
                        <TableHead className="whitespace-nowrap">{rowNumberHeader}</TableHead>
                      )}
                    </React.Fragment>
                  ))}
                  {showRowNumbers && !hasSelectionColumn && <TableHead className="whitespace-nowrap">{rowNumberHeader}</TableHead>}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
                  <TableRow key={`loading-${rowIndex}`}>
                    {Array.from({ length: visibleColumnCount }).map((__, cellIndex) => (
                      <TableCell key={`loading-${rowIndex}-${cellIndex}`}>
                        <div
                          className={[
                            "h-4 animate-pulse rounded bg-foreground/10 dark:bg-foreground/15",
                            cellIndex === 0 ? "w-5" : cellIndex % 3 === 0 ? "w-20" : cellIndex % 2 === 0 ? "w-28" : "w-44",
                          ].join(" ")}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? "button" : undefined}
                    className={onRowClick ? "cursor-pointer hover:cursor-pointer" : undefined}
                    onClick={
                      onRowClick
                        ? (event) => {
                            if (!isInteractiveTableClick(event.target, event.currentTarget)) {
                              onRowClick(row.original)
                            }
                          }
                        : undefined
                    }
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (
                              !isInteractiveTableClick(event.target, event.currentTarget) &&
                              (event.key === "Enter" || event.key === " ")
                            ) {
                              event.preventDefault()
                              onRowClick(row.original)
                            }
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <React.Fragment key={cell.id}>
                        <TableCell>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                        {showRowNumbers && hasSelectionColumn && index === 0 && (
                          <TableCell className="font-mono text-sm text-muted-foreground whitespace-nowrap">
                            {rowNumberOffset + row.index + 1}
                          </TableCell>
                        )}
                      </React.Fragment>
                    ))}
                    {showRowNumbers && !hasSelectionColumn && (
                      <TableCell className="font-mono text-sm text-muted-foreground whitespace-nowrap">
                        {rowNumberOffset + row.index + 1}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length + (showRowNumbers ? 1 : 0)} className="h-24 text-center text-muted-foreground">
                    {emptyText}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-y-4 space-x-2 py-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>
            Showing {rangeStart}-{rangeEnd} of {totalRecordCount} records
          </span>
          <span aria-hidden="true">|</span>
          <span>
            {selectedRowIds.length} selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

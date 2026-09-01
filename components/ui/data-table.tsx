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
import { ChevronDown, LayoutGrid, Table as TableIcon } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [viewMode, setViewMode] = React.useState<"auto" | "table" | "cards">("auto")

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
        <Button variant="outline" size="sm" className={cn("text-xs font-semibold", className)}>
          Columns <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
        {table
          .getAllColumns()
          .filter((col) => col.getCanHide())
          .map((col) => (
            <DropdownMenuCheckboxItem
              key={col.id}
              className="text-xs capitalize"
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

  const renderViewToggle = () => (
    <div className="flex items-center rounded-lg border border-border/80 p-0.5 bg-muted/40 md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setViewMode("cards")}
        className={cn(
          "h-7 px-2.5 text-xs font-bold gap-1 rounded-md",
          (viewMode === "cards" || viewMode === "auto") ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span>Cards</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setViewMode("table")}
        className={cn(
          "h-7 px-2.5 text-xs font-bold gap-1 rounded-md",
          viewMode === "table" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
        )}
      >
        <TableIcon className="h-3.5 w-3.5" />
        <span>Table</span>
      </Button>
    </div>
  )

  return (
    <div className="w-full min-w-0 space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col items-stretch gap-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2 flex-1">
          {activeFilterKey && (
            <Input
              placeholder={filterPlaceholder}
              value={(table.getColumn(activeFilterKey)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(activeFilterKey)?.setFilterValue(event.target.value)
              }
              className="w-full sm:max-w-xs text-xs h-9"
            />
          )}
          {toolbarLeftContent}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap sm:flex-nowrap">
          {renderViewToggle()}
          <div className="flex items-center gap-2">
            {!hideMobileColumnsButton && (
              <div className="sm:hidden">
                {renderColumnsButton()}
              </div>
            )}
            <div className="hidden sm:block">
              {renderColumnsButton()}
            </div>
            {toolbarRight}
          </div>
        </div>
      </div>
      {toolbarBelow && <div>{toolbarBelow}</div>}

      {selectedRowIds.length > 0 && selectedActions && (
        <div className="flex flex-col gap-3 rounded-lg border bg-primary/5 border-primary/20 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-bold text-primary flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            {selectedRowIds.length} item(s) selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedActions(selectedRows, resetSelection)}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. MOBILE RESPONSIVE CARDS VIEW (< md or cards mode)      */}
      {/* ========================================================= */}
      <div className={cn("space-y-3", viewMode === "table" ? "hidden" : "md:hidden")}>
        {loading ? (
          Array.from({ length: skeletonRowCount }).map((_, i) => (
            <div key={`card-skeleton-${i}`} className="rounded-xl border bg-card p-4 space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-4 w-8 bg-muted rounded" />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            </div>
          ))
        ) : table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const cells = row.getVisibleCells()
            const selectCell = cells.find((c) => c.column.id === "select")
            const actionCell = cells.find((c) => c.column.id === "actions")
            const contentCells = cells.filter((c) => c.column.id !== "select" && c.column.id !== "actions")
            const primaryCell = contentCells[0]
            const detailCells = contentCells.slice(1)

            return (
              <div
                key={`mobile-card-${row.id}`}
                data-state={row.getIsSelected() && "selected"}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "button" : undefined}
                className={cn(
                  "rounded-xl border bg-card p-3.5 transition-all space-y-3 shadow-2xs hover:shadow-xs",
                  row.getIsSelected()
                    ? "border-primary/60 bg-primary/[0.03] ring-1 ring-primary/20"
                    : "border-border/80 hover:border-primary/40",
                  onRowClick ? "cursor-pointer active:scale-[0.99]" : ""
                )}
                onClick={
                  onRowClick
                    ? (event) => {
                        if (!isInteractiveTableClick(event.target, event.currentTarget)) {
                          onRowClick(row.original)
                        }
                      }
                    : undefined
                }
              >
                {/* Header Row: Checkbox + Row # + Primary Info + Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {selectCell && (
                      <div className="shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                        {flexRender(selectCell.column.columnDef.cell, selectCell.getContext())}
                      </div>
                    )}
                    {showRowNumbers && (
                      <span className="shrink-0 text-[10.5px] font-mono font-bold text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60">
                        #{rowNumberOffset + row.index + 1}
                      </span>
                    )}
                    {primaryCell && (
                      <div className="min-w-0 flex-1 text-xs font-bold text-foreground">
                        {flexRender(primaryCell.column.columnDef.cell, primaryCell.getContext())}
                      </div>
                    )}
                  </div>

                  {actionCell && (
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {flexRender(actionCell.column.columnDef.cell, actionCell.getContext())}
                    </div>
                  )}
                </div>

                {/* Detail Grid */}
                {detailCells.length > 0 && (
                  <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-border/50 text-xs">
                    {detailCells.map((cell) => {
                      const headerTitle = getColumnMenuLabel(cell.column as any)
                      const isLongContent =
                        cell.column.id === "notes" ||
                        cell.column.id === "description" ||
                        cell.column.id === "remarks" ||
                        cell.column.id === "address" ||
                        cell.column.id === "preferred_program"

                      return (
                        <div
                          key={cell.id}
                          className={cn("space-y-0.5 min-w-0", isLongContent ? "col-span-2" : "col-span-1")}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
                            {headerTitle}
                          </span>
                          <div className="text-xs font-semibold text-foreground break-words">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-center text-xs text-muted-foreground">
            {emptyText}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. DESKTOP / TABLE VIEW (md:block or table mode)           */}
      {/* ========================================================= */}
      <div className={cn("rounded-lg border bg-card overflow-hidden", viewMode === "cards" ? "hidden" : "hidden md:block")}>
        <div className="overflow-x-auto w-full table-scrollbar">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <React.Fragment key={header.id}>
                      <TableHead>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                      {showRowNumbers && hasSelectionColumn && index === 0 && (
                        <TableHead>{rowNumberHeader}</TableHead>
                      )}
                    </React.Fragment>
                  ))}
                  {showRowNumbers && !hasSelectionColumn && <TableHead>{rowNumberHeader}</TableHead>}
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
                          <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {rowNumberOffset + row.index + 1}
                          </TableCell>
                        )}
                      </React.Fragment>
                    ))}
                    {showRowNumbers && !hasSelectionColumn && (
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
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

      {/* Footer / Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground font-medium">
          <span>
            Showing <strong className="text-foreground">{rangeStart}-{rangeEnd}</strong> of <strong className="text-foreground">{totalRecordCount}</strong> records
          </span>
          {selectedRowIds.length > 0 && (
            <>
              <span aria-hidden="true">•</span>
              <span className="text-primary font-bold">
                {selectedRowIds.length} selected
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="text-xs h-8 px-3"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="text-xs h-8 px-3"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

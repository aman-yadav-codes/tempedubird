"use client";

import { Grid2X2, List } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  courseOptions,
  locationOptions,
  sortOptions,
  typeOptions,
} from "./institute-data";
import { InstituteMoreFilters } from "./institute-more-filters";

export type InstituteFilters = {
  search: string;
  location: string;
  type: string;
  course: string;
  minRating: string;
  sort: string;
  verifiedOnly: boolean;
};

type InstituteSearchToolbarProps = {
  filters: InstituteFilters;
  viewMode: "grid" | "list";
  onFilterChange: <K extends keyof InstituteFilters>(key: K, value: InstituteFilters[K]) => void;
  onResetFilters: () => void;
  onViewModeChange: (viewMode: "grid" | "list") => void;
};

function FilterSelect({
  value,
  options,
  onValueChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onValueChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-10 w-[150px] bg-background font-medium text-foreground">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function InstituteSearchToolbar({
  filters,
  viewMode,
  onFilterChange,
  onResetFilters,
  onViewModeChange,
}: InstituteSearchToolbarProps) {
  const hasActiveFilters =
    filters.location !== "all" ||
    filters.type !== "all" ||
    filters.course !== "all" ||
    filters.minRating !== "0" ||
    filters.verifiedOnly;

  return (
    <>
      <div className="sticky top-16 z-30 mb-6 rounded-lg border border-border bg-background/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <FilterSelect
              value={filters.location}
              options={locationOptions}
              onValueChange={(location) => onFilterChange("location", location)}
            />
            <FilterSelect
              value={filters.type}
              options={typeOptions}
              onValueChange={(type) => onFilterChange("type", type)}
            />
            <FilterSelect
              value={filters.course}
              options={courseOptions}
              onValueChange={(course) => onFilterChange("course", course)}
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="h-10 rounded-md border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <InstituteMoreFilters
              filters={filters}
              onFilterChange={onFilterChange}
              onResetFilters={onResetFilters}
            />

            <Select value={filters.sort} onValueChange={(sort) => onFilterChange("sort", sort)}>
              <SelectTrigger className="h-10 w-[190px] bg-background text-muted-foreground">
                <span className="mr-2 shrink-0">Sort:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
            <button
              aria-label="Grid view"
              onClick={() => onViewModeChange("grid")}
              className={`flex h-10 w-10 items-center justify-center rounded-md border ${
                viewMode === "grid" ? "border-primary text-primary" : "border-border text-muted-foreground"
              }`}
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button
              aria-label="List view"
              onClick={() => onViewModeChange("list")}
              className={`flex h-10 w-10 items-center justify-center rounded-md border ${
                viewMode === "list" ? "border-primary text-primary" : "border-border text-muted-foreground"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { ChevronDown, X } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  courseOptions,
  locationOptions,
  ratingOptions,
  typeOptions,
  type FilterOption,
} from "./institute-data";
import type { InstituteFilters } from "./institute-search-toolbar";

type InstituteFilterPanelProps = {
  filters: InstituteFilters;
  onFilterChange: <K extends keyof InstituteFilters>(key: K, value: InstituteFilters[K]) => void;
  onResetFilters: () => void;
};

type SingleFilterKey = "location" | "type" | "course" | "minRating";

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-foreground">
        {title}
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function SingleChoiceGroup({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={value === option.value}
            onCheckedChange={() => onChange(option.value)}
            aria-label={option.label}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

function getOptionLabel(options: FilterOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function ActiveFilterChips({
  filters,
  onFilterChange,
}: {
  filters: InstituteFilters;
  onFilterChange: <K extends keyof InstituteFilters>(key: K, value: InstituteFilters[K]) => void;
}) {
  const chips = [
    filters.location !== "all"
      ? {
          key: "location" as const,
          label: getOptionLabel(locationOptions, filters.location),
          resetValue: "all",
        }
      : null,
    filters.type !== "all"
      ? {
          key: "type" as const,
          label: getOptionLabel(typeOptions, filters.type),
          resetValue: "all",
        }
      : null,
    filters.course !== "all"
      ? {
          key: "course" as const,
          label: getOptionLabel(courseOptions, filters.course),
          resetValue: "all",
        }
      : null,
    filters.minRating !== "0"
      ? {
          key: "minRating" as const,
          label: getOptionLabel(ratingOptions, filters.minRating),
          resetValue: "0",
        }
      : null,
  ].filter((chip): chip is NonNullable<typeof chip> => chip !== null);

  return (
    <div className="mb-4 min-h-8">
      {chips.length === 0 && !filters.verifiedOnly ? (
        <p className="text-xs text-muted-foreground">No filters selected</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onFilterChange(chip.key, chip.resetValue)}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition hover:bg-primary/15"
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          {filters.verifiedOnly && (
            <button
              type="button"
              onClick={() => onFilterChange("verifiedOnly", false)}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition hover:bg-primary/15"
            >
              Verified Only
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function InstituteFilterPanel({
  filters,
  onFilterChange,
  onResetFilters,
}: InstituteFilterPanelProps) {
  const updateSingle = (key: SingleFilterKey) => (value: string) => onFilterChange(key, value);

  return (
    <div className="rounded-lg border border-border bg-card/90 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Filters</h2>
        <button className="text-xs font-medium text-primary" onClick={onResetFilters}>
          Clear All
        </button>
      </div>

      <div className="mt-4">
        <ActiveFilterChips filters={filters} onFilterChange={onFilterChange} />
      </div>

      <div className="mt-4">
        <FilterSection title="Location">
          <SingleChoiceGroup value={filters.location} options={locationOptions} onChange={updateSingle("location")} />
        </FilterSection>
        <Separator />
        <FilterSection title="Institute Type">
          <SingleChoiceGroup value={filters.type} options={typeOptions} onChange={updateSingle("type")} />
        </FilterSection>
        <Separator />
        <FilterSection title="Courses">
          <SingleChoiceGroup value={filters.course} options={courseOptions} onChange={updateSingle("course")} />
        </FilterSection>
        <Separator />
        <FilterSection title="Rating">
          <SingleChoiceGroup value={filters.minRating} options={ratingOptions} onChange={updateSingle("minRating")} />
        </FilterSection>
        <Separator />
        <div className="pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
            <Checkbox
              checked={filters.verifiedOnly}
              onCheckedChange={(checked) => onFilterChange("verifiedOnly", checked === true)}
              aria-label="Verified only"
            />
            <span>Verified Only</span>
          </label>
        </div>
      </div>
    </div>
  );
}

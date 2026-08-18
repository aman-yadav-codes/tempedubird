"use client";

import { InstituteFilterPanel } from "./institute-filter-panel";
import type { InstituteFilters } from "./institute-search-toolbar";

type InstituteFilterSidebarProps = {
  filters: InstituteFilters;
  onFilterChange: <K extends keyof InstituteFilters>(key: K, value: InstituteFilters[K]) => void;
  onResetFilters: () => void;
};

export function InstituteFilterSidebar({
  filters,
  onFilterChange,
  onResetFilters,
}: InstituteFilterSidebarProps) {
  return (
    <aside className="sticky top-24 hidden w-[280px] shrink-0 lg:block">
      <InstituteFilterPanel
        filters={filters}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
      />
    </aside>
  );
}

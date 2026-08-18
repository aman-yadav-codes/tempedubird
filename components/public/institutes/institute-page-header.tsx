"use client";

import { Search } from "lucide-react";

import { DebouncedSearchInput } from "@/components/shared/debounced-search-input";

type InstitutePageHeaderProps = {
  search: string;
  onSearchChange: (search: string) => void;
};

export function InstitutePageHeader({ search, onSearchChange }: InstitutePageHeaderProps) {
  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-end">
      <div>
        <h1 className="text-3xl font-bold tracking-normal text-foreground sm:text-4xl">
          Partner <span className="text-primary">Institutes</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Verified educational institutions trusted by thousands of learners
        </p>
      </div>

      <div className="flex min-h-11 overflow-hidden rounded-md border border-border bg-background">
        <DebouncedSearchInput
          value={search}
          onValueChange={onSearchChange}
          debounceMs={350}
          placeholder="Search institutes, city or course..."
          className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-4 text-sm shadow-none focus-visible:ring-0"
        />
        <button
          aria-label="Search institutes"
          className="m-1 flex w-12 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

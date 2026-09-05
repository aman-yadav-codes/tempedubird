"use client";

import { useState } from "react";
import { ChevronDown, Loader2, RotateCcw, SlidersHorizontal, X, Award, Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const PRICE_RANGES = [
  { label: "Any Price", value: "any", range: null },
  { label: "Under Rs. 35,000", value: "under-35000", range: { min: 0, max: 35000 } },
  { label: "Rs. 35,000 - Rs. 55,000", value: "35000-55000", range: { min: 35000, max: 55000 } },
  { label: "Rs. 55,000 - Rs. 75,000", value: "55000-75000", range: { min: 55000, max: 75000 } },
  { label: "Above Rs. 75,000", value: "above-75000", range: { min: 75000, max: Infinity } },
];

const RATING_OPTIONS = [
  { label: "Any rating", value: 0 },
  { label: "4.7 & above", value: 4.7 },
  { label: "4.8 & above", value: 4.8 },
  { label: "4.9 & above", value: 4.9 },
];

export const AFFILIATION_OPTIONS = [
  { label: "All Programs", value: "all" },
  { label: "Board Wise (CBSE / State Boards)", value: "board" },
  { label: "University Wise (Degrees & Higher Ed)", value: "university" },
  { label: "Certification Wise (Industry Certificates)", value: "certification" },
] as const;

export const MEDIUM_OPTIONS = [
  { label: "All Mediums", value: "all" },
  { label: "English Medium", value: "English Medium" },
  { label: "Hindi Medium", value: "Hindi Medium" },
  { label: "Bilingual / Others", value: "Bilingual" },
] as const;

const SORT_OPTIONS = [
  { label: "Default", value: "default" },
  { label: "Rating: High to Low", value: "rating-desc" },
  { label: "Rating: Low to High", value: "rating-asc" },
  { label: "Reviews: High to Low", value: "reviews-desc" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];
export type AffiliationFilter = "all" | "board" | "university" | "certification";

export interface FilterState {
  priceRange: { min: number; max: number } | null;
  minRating: number;
  tags: string[];
  sort: SortValue;
  affiliationType?: AffiliationFilter;
  medium?: string;
}

export const DEFAULT_FILTERS: FilterState = {
  priceRange: null,
  minRating: 0,
  tags: [],
  sort: "default",
  affiliationType: "all",
  medium: "all",
};

interface Props {
  filters: FilterState;
  onApply: (f: FilterState) => void;
  activeCount: number;
  categories?: CourseCategoryOption[];
  isCategoriesLoading?: boolean;
}

export type CourseCategoryOption = {
  id: number;
  name: string;
  slug: string;
};

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
      <CollapsibleContent className="pb-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function priceValue(filter: FilterState["priceRange"]) {
  if (!filter) return "any";
  return PRICE_RANGES.find((item) => item.range?.min === filter.min && item.range?.max === filter.max)?.value ?? "any";
}

function priceLabel(filter: FilterState["priceRange"]) {
  return PRICE_RANGES.find((item) => item.value === priceValue(filter))?.label ?? "Any Price";
}

function ActiveChips({
  draft,
  setDraft,
}: {
  draft: FilterState;
  setDraft: React.Dispatch<React.SetStateAction<FilterState>>;
}) {
  const chips = [
    draft.sort !== "default" ? { label: SORT_OPTIONS.find((item) => item.value === draft.sort)?.label ?? draft.sort, clear: () => setDraft((current) => ({ ...current, sort: "default" })) } : null,
    draft.affiliationType && draft.affiliationType !== "all" ? { label: AFFILIATION_OPTIONS.find((item) => item.value === draft.affiliationType)?.label ?? draft.affiliationType, clear: () => setDraft((current) => ({ ...current, affiliationType: "all" })) } : null,
    draft.medium && draft.medium !== "all" ? { label: draft.medium, clear: () => setDraft((current) => ({ ...current, medium: "all" })) } : null,
    draft.priceRange ? { label: priceLabel(draft.priceRange), clear: () => setDraft((current) => ({ ...current, priceRange: null })) } : null,
    draft.minRating > 0 ? { label: `${draft.minRating}+ rating`, clear: () => setDraft((current) => ({ ...current, minRating: 0 })) } : null,
  ].filter((chip): chip is { label: string; clear: () => void } => chip !== null);

  return (
    <div className="mb-5 min-h-8">
      {chips.length === 0 && draft.tags.length === 0 ? (
        <p className="text-xs text-muted-foreground">No filters selected</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.clear}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition hover:bg-primary/15"
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          {draft.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setDraft((current) => ({ ...current, tags: current.tags.filter((item) => item !== tag) }))}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition hover:bg-primary/15"
            >
              {tag}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CourseFilterSheet({
  filters,
  onApply,
  activeCount,
  categories = [],
  isCategoriesLoading = false,
}: Props) {
  const [draft, setDraft] = useState<FilterState>(filters);

  const toggleTag = (tag: string) => {
    setDraft((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((item) => item !== tag)
        : [...prev.tags, tag],
    }));
  };

  const resetDraft = () => setDraft(DEFAULT_FILTERS);

  return (
    <Sheet onOpenChange={(open) => open && setDraft(filters)}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative h-10 gap-2 bg-background px-4 font-semibold">
          <SlidersHorizontal className="h-4 w-4" />
          More Filters
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" defaultSize={460} minSize={360} className="gap-0 overflow-hidden px-0">
        <SheetHeader className="px-6 py-5">
          <SheetTitle>Course Filters</SheetTitle>
          <SheetDescription>Filter by Board / University / Certification, Medium, Price & Category.</SheetDescription>
        </SheetHeader>
        <Separator />

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="rounded-lg border border-border bg-card/90 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Filters</h2>
              <button className="text-xs font-medium text-primary cursor-pointer hover:underline" onClick={resetDraft}>
                Clear All
              </button>
            </div>

            <div className="mt-4">
              <ActiveChips draft={draft} setDraft={setDraft} />
            </div>

            {/* Affiliation Type Filter (Board / University / Certification) */}
            <FilterSection title="Affiliation & Authority">
              <div className="space-y-2.5">
                {AFFILIATION_OPTIONS.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
                    <input
                      type="radio"
                      name="affiliationTypeFilter"
                      checked={(draft.affiliationType || "all") === option.value}
                      onChange={() => setDraft((current) => ({ ...current, affiliationType: option.value }))}
                      className="accent-primary h-4 w-4"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </FilterSection>
            <Separator />

            {/* Medium of Instruction Filter */}
            <FilterSection title="Medium of Instruction">
              <div className="space-y-2.5">
                {MEDIUM_OPTIONS.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
                    <input
                      type="radio"
                      name="mediumFilter"
                      checked={(draft.medium || "all") === option.value}
                      onChange={() => setDraft((current) => ({ ...current, medium: option.value }))}
                      className="accent-primary h-4 w-4"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </FilterSection>
            <Separator />

            <FilterSection title="Sort By">
              <div className="space-y-3">
                {SORT_OPTIONS.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      checked={draft.sort === option.value}
                      onCheckedChange={() => setDraft((current) => ({ ...current, sort: option.value }))}
                      aria-label={option.label}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </FilterSection>
            <Separator />

            <FilterSection title="Price Range">
              <div className="space-y-3">
                {PRICE_RANGES.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      checked={priceValue(draft.priceRange) === option.value}
                      onCheckedChange={() => setDraft((current) => ({ ...current, priceRange: option.range }))}
                      aria-label={option.label}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </FilterSection>
            <Separator />

            <FilterSection title="Minimum Rating">
              <div className="space-y-3">
                {RATING_OPTIONS.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      checked={draft.minRating === option.value}
                      onCheckedChange={() => setDraft((current) => ({ ...current, minRating: option.value }))}
                      aria-label={option.label}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </FilterSection>
            <Separator />

            <FilterSection title="Main Categories">
              {isCategoriesLoading ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading categories...
                </div>
              ) : categories.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {categories.map((category) => (
                    <label key={category.id} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                      <Checkbox
                        checked={draft.tags.includes(category.name)}
                        onCheckedChange={() => toggleTag(category.name)}
                        aria-label={category.name}
                      />
                      <span>{category.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                  No categories found.
                </p>
              )}
            </FilterSection>
          </div>
        </div>

        <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row">
          <Button variant="outline" className="flex-1 gap-2" onClick={resetDraft}>
            <RotateCcw className="h-4 w-4" />
            Reset All
          </Button>
          <SheetClose asChild>
            <Button className="flex-1" onClick={() => onApply(draft)}>
              Apply Filters
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

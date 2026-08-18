"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { InstituteFilterPanel } from "./institute-filter-panel";
import type { InstituteFilters } from "./institute-search-toolbar";

type InstituteMoreFiltersProps = {
  filters: InstituteFilters;
  onFilterChange: <K extends keyof InstituteFilters>(key: K, value: InstituteFilters[K]) => void;
  onResetFilters: () => void;
};

function FiltersTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 justify-center gap-2 bg-background px-4 font-semibold"
      onClick={onOpen}
    >
      <SlidersHorizontal className="h-4 w-4" />
      More Filters
    </Button>
  );
}

export function InstituteMoreFilters({
  filters,
  onFilterChange,
  onResetFilters,
}: InstituteMoreFiltersProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <Drawer direction="bottom" open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <FiltersTrigger onOpen={() => setOpen(true)} />
        </DrawerTrigger>
        <DrawerContent className="h-[88dvh] w-full max-w-none overflow-hidden border-x-0">
          <DrawerHeader className="px-5 text-left">
            <DrawerTitle>Filters</DrawerTitle>
            <DrawerDescription>Refine institutes by city, type, course, rating, and verification.</DrawerDescription>
          </DrawerHeader>
          <Separator />
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <InstituteFilterPanel
              filters={filters}
              onFilterChange={onFilterChange}
              onResetFilters={onResetFilters}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <FiltersTrigger onOpen={() => setOpen(true)} />
      </SheetTrigger>
      <SheetContent side="right" defaultSize={420} minSize={340} className="gap-0 overflow-hidden px-0">
        <SheetHeader className="px-6 py-5">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Refine institutes by city, type, course, rating, and verification.</SheetDescription>
        </SheetHeader>
        <Separator />
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <InstituteFilterPanel
            filters={filters}
            onFilterChange={onFilterChange}
            onResetFilters={onResetFilters}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useMemo, useState } from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type MonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  fromYear?: number;
  toYear?: number;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function parseMonthValue(value: string) {
  if (!value) return undefined;
  const date = parse(value, "yyyy-MM", new Date());
  return isValid(date) ? date : undefined;
}

function toMonthValue(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function MonthPicker({
  value,
  onChange,
  placeholder = "Pick a month",
  disabled = false,
  className,
  fromYear = 1950,
  toYear = 2100,
}: MonthPickerProps) {
  const selected = parseMonthValue(value);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(selected?.getFullYear() ?? new Date().getFullYear());

  const years = useMemo(
    () => Array.from({ length: toYear - fromYear + 1 }, (_, index) => fromYear + index),
    [fromYear, toYear]
  );

  const selectedMonth = selected?.getMonth();
  const selectedYear = selected?.getFullYear();

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen && selectedYear) setYear(selectedYear);
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-start text-left font-normal", !selected && "text-muted-foreground", className)}
        >
          <CalendarIcon className="size-4" />
          {selected ? format(selected, "MMMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} collisionPadding={16} className="w-72 p-3">
        <div className="mb-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            disabled={year <= fromYear}
            onClick={() => setYear((current) => Math.max(fromYear, current - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Select value={String(year)} onValueChange={(nextYear) => setYear(Number(nextYear))}>
            <SelectTrigger className="h-8 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((yearOption) => (
                <SelectItem key={yearOption} value={String(yearOption)}>
                  {yearOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            disabled={year >= toYear}
            onClick={() => setYear((current) => Math.min(toYear, current + 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((monthLabel, monthIndex) => {
            const active = selectedYear === year && selectedMonth === monthIndex;
            return (
              <Button
                key={monthLabel}
                type="button"
                variant={active ? "destructive" : "ghost"}
                className="justify-center"
                onClick={() => {
                  onChange(toMonthValue(year, monthIndex));
                  setOpen(false);
                }}
              >
                {monthLabel}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

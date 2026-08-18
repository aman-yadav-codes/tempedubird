"use client";

import { useState } from "react";
import { format, isSameDay, isValid, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DateRangePickerProps = {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  fromYear?: number;
  toYear?: number;
};

function toDate(value: string) {
  if (!value) return undefined;
  const date = parseISO(value);
  return isValid(date) ? date : undefined;
}

function toValue(date: Date | undefined) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

function formatLabel(range: DateRange | undefined, placeholder: string) {
  if (!range?.from) return placeholder;
  if (!range.to) return `${format(range.from, "dd MMM yyyy")} - Pick end date`;
  return `${format(range.from, "dd MMM yyyy")} - ${format(range.to, "dd MMM yyyy")}`;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = "Pick a date range",
  disabled = false,
  className,
  fromYear = 1950,
  toYear = 2100,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedFromProps: DateRange | undefined = {
    from: toDate(from),
    to: toDate(to),
  };
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(selectedFromProps);
  const selected = open ? draftRange : selectedFromProps;
  const hasValue = Boolean(selected.from || selected.to);

  return (
    <div className="min-w-0">
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setDraftRange(selectedFromProps);
            setOpen(true);
            return;
          }

          if (draftRange?.from && !draftRange.to) return;
          setOpen(false);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn("w-full justify-start text-left font-normal", !hasValue && "text-muted-foreground", className)}
          >
            <CalendarIcon className="size-4" />
            {formatLabel(selected, placeholder)}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={16}
          className="w-[min(calc(100vw-24px),38rem)] max-h-[min(560px,calc(100dvh-32px))] overflow-y-auto p-0"
        >
          <Calendar
            mode="range"
            selected={selected}
            onSelect={(range) => {
              const shouldStartFresh =
                Boolean(draftRange?.from && draftRange.to && range?.from && range.to) &&
                draftRange?.from &&
                range?.from &&
                isSameDay(draftRange.from, range.from);
              const nextRange = shouldStartFresh
                ? { from: range?.to, to: undefined }
                : range;

              setDraftRange(nextRange);
              onChange({
                from: toValue(nextRange?.from),
                to: toValue(nextRange?.to),
              });
              if (nextRange?.from && nextRange.to) setOpen(false);
            }}
            defaultMonth={selected.from}
            numberOfMonths={2}
            startMonth={new Date(fromYear, 0)}
            endMonth={new Date(toYear, 11)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

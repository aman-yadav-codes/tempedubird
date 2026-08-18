"use client";

import { useMemo, useState, type ComponentProps } from "react";
import { format, isValid, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledDates?: ComponentProps<typeof Calendar>["disabled"];
  markedDates?: Array<string | { date: string; label?: string }>;
  rangeStart?: string;
  rangeEnd?: string;
  resultDate?: string | null;
  clearable?: boolean;
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

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  disabledDates,
  markedDates = [],
  rangeStart,
  rangeEnd,
  resultDate,
  className,
  fromYear = 1950,
  toYear = 2100,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const markedDateLabels = useMemo(() => {
    const labels = new Map<string, string[]>();
    markedDates.forEach((item) => {
      const date = typeof item === "string" ? item : item.date;
      const label = typeof item === "string" ? undefined : item.label;
      if (!date) return;
      labels.set(date, [...(labels.get(date) ?? []), ...(label ? [label] : [])]);
    });
    return labels;
  }, [markedDates]);
  const calendarMarkers = useMemo(() => {
    const marked = Array.from(markedDateLabels.keys()).map(toDate).filter(Boolean) as Date[];
    const from = toDate(rangeStart ?? "");
    const to = toDate(rangeEnd ?? "");
    const result = toDate(resultDate ?? "");
    return {
      modifiers: {
        examDate: marked,
        examRange: from && to ? { from, to } : [],
        resultDate: result ? [result] : [],
      },
      modifiersClassNames: {
        examRange: "bg-primary/10 [&>button]:hover:bg-primary/20",
        examDate: "",
        resultDate: "",
      },
    };
  }, [markedDateLabels, rangeEnd, rangeStart, resultDate]);

  return (
    <div className="min-w-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn("w-full justify-start text-left font-normal", !selected && "text-muted-foreground", className)}
          >
            <CalendarIcon className="size-4" />
            {selected ? format(selected, "dd MMM yyyy") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={16}
          className="w-[min(calc(100vw-24px),18rem)] max-h-[min(420px,calc(100dvh-32px))] overflow-y-auto p-0"
        >
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              onChange(toValue(date));
              if (date) setOpen(false);
            }}
            defaultMonth={selected}
            startMonth={new Date(fromYear, 0)}
            endMonth={new Date(toYear, 11)}
            disabled={disabledDates}
            modifiers={calendarMarkers.modifiers}
            modifiersClassNames={calendarMarkers.modifiersClassNames}
            components={{
              DayButton: ({ day, modifiers, className: dayClassName, ...buttonProps }) => {
                const dayValue = format(day.date, "yyyy-MM-dd");
                const labels = markedDateLabels.get(dayValue) ?? [];
                const hasExam = modifiers.examDate;
                const hasResult = modifiers.resultDate;
                const tooltipLabels = [
                  ...labels,
                  ...(hasResult ? ["Result declaration"] : []),
                ];
                const button = (
                  <button
                    {...buttonProps}
                    type="button"
                    className={cn(dayClassName, "relative flex flex-col items-center justify-center gap-0.5 leading-none")}
                    title={tooltipLabels.length > 0 ? tooltipLabels.join(", ") : undefined}
                  >
                    <span>{format(day.date, "d")}</span>
                    {(hasExam || hasResult) && (
                      <span className="absolute bottom-1 flex items-center justify-center gap-0.5">
                        {hasExam && <span className="size-1 rounded-full bg-amber-400" />}
                        {hasResult && <span className="size-1.5 rounded-full bg-emerald-500" />}
                      </span>
                    )}
                  </button>
                );
                if (tooltipLabels.length === 0) return button;
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-48 space-y-1">
                        {tooltipLabels.map((label) => (
                          <p key={label}>{label}</p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              },
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  conflicts?: Array<{ time: string; label?: string }>;
};

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

function parseTime(value: string) {
  const [rawHour = "", rawMinute = ""] = value.split(":");
  const hour24 = Number(rawHour);
  const minute = Number(rawMinute);
  const valid =
    /^\d{2}:\d{2}$/.test(value) &&
    hour24 >= 0 &&
    hour24 <= 23 &&
    minute >= 0 &&
    minute <= 59;

  if (!valid) return { hour: "09", minute: "00", period: "AM" as const };
  return {
    hour: String(hour24 % 12 || 12).padStart(2, "0"),
    minute: rawMinute,
    period: (hour24 >= 12 ? "PM" : "AM") as "AM" | "PM",
  };
}

function toTimeValue(hour: string, minute: string, period: "AM" | "PM") {
  const hour12 = Number(hour);
  const hour24 = period === "PM" ? (hour12 % 12) + 12 : hour12 % 12;
  return `${String(hour24).padStart(2, "0")}:${minute}`;
}

function formatTimeLabel(value: string) {
  const parsed = parseTime(value);
  return `${parsed.hour}:${parsed.minute} ${parsed.period}`;
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  disabled = false,
  className,
  conflicts = [],
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parseTime(value), [value]);
  const uniqueConflicts = useMemo(
    () =>
      conflicts.filter(
        (conflict, index, list) =>
          conflict.time && list.findIndex((item) => item.time === conflict.time && item.label === conflict.label) === index
      ),
    [conflicts]
  );

  const update = (next: Partial<typeof parsed>) => {
    const time = { ...parsed, ...next };
    onChange(toTimeValue(time.hour, time.minute, time.period));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="size-4" />
          {value ? `${parsed.hour}:${parsed.minute} ${parsed.period}` : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(calc(100vw-24px),20rem)] p-3">
        {uniqueConflicts.length > 0 && (
          <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            <p className="font-semibold text-amber-900 dark:text-amber-100">Already scheduled on this date</p>
            <div className="mt-1 space-y-1">
              {uniqueConflicts.map((conflict) => (
                <p key={`${conflict.time}-${conflict.label ?? ""}`}>
                  {formatTimeLabel(conflict.time)}
                  {conflict.label ? ` - ${conflict.label}` : ""}
                </p>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-[1fr_1fr_0.9fr] gap-2">
          <Select value={parsed.hour} onValueChange={(hour) => update({ hour })}>
            <SelectTrigger className="w-full" aria-label="Hour">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((hour) => <SelectItem key={hour} value={hour}>{hour}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={parsed.minute} onValueChange={(minute) => update({ minute })}>
            <SelectTrigger className="w-full" aria-label="Minute">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {MINUTES.map((minute) => <SelectItem key={minute} value={minute}>{minute}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select
            value={parsed.period}
            onValueChange={(period) => update({ period: period as "AM" | "PM" })}
          >
            <SelectTrigger className="w-full" aria-label="AM or PM">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          className="mt-3 w-full"
          onClick={() => {
            if (!value) {
              onChange(toTimeValue(parsed.hour, parsed.minute, parsed.period));
            }
            setOpen(false);
          }}
        >
          Done
        </Button>
      </PopoverContent>
    </Popover>
  );
}

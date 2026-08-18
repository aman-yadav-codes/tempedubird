"use client";

import { useMemo } from "react";

import { DatePicker } from "@/components/shared/date-picker";
import { TimePicker } from "@/components/shared/time-picker";

type CronScheduleFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minDate?: string;
};

function splitDateTime(value: string) {
  if (!value) return { date: "", time: "" };

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    return {
      date: value.slice(0, 10),
      time: value.slice(11, 16),
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };

  return {
    date: [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-"),
    time: [
      String(date.getHours()).padStart(2, "0"),
      String(date.getMinutes()).padStart(2, "0"),
    ].join(":"),
  };
}

function combineDateTime(date: string, time: string) {
  if (!date) return "";
  return `${date}T${time || "09:00"}`;
}

export function CronScheduleField({
  value,
  onChange,
  disabled = false,
  minDate,
}: CronScheduleFieldProps) {
  const parts = useMemo(() => splitDateTime(value), [value]);

  return (
    <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
      <DatePicker
        value={parts.date}
        onChange={(date) => onChange(combineDateTime(date, parts.time))}
        placeholder="Select publish date"
        disabled={disabled}
        fromYear={new Date().getFullYear()}
        toYear={new Date().getFullYear() + 5}
        disabledDates={(date) => {
          if (!minDate) return false;
          const min = new Date(`${minDate}T00:00:00`);
          return date < min;
        }}
      />
      <TimePicker
        value={parts.time}
        onChange={(time) => onChange(combineDateTime(parts.date, time))}
        placeholder="Select time"
        disabled={disabled || !parts.date}
      />
    </div>
  );
}

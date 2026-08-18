"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DropdownProps } from "react-day-picker";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CalendarDropdown({ options, className, ...props }: DropdownProps) {
  return (
    <div className="relative min-w-0">
      <select
        {...props}
        className={cn(
          "h-8 w-full appearance-none rounded-md border border-input bg-background px-2.5 pr-7 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        {options?.map(({ value, label, disabled }) => (
          <option key={value} value={value} disabled={disabled}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function Calendar({
  className,
  classNames,
  components,
  showOutsideDays = true,
  captionLayout = "dropdown",
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      className={cn("p-2", className)}
      classNames={{
        root: cn("w-full max-w-full", classNames?.root),
        months: cn("relative flex flex-col gap-3 sm:flex-row", classNames?.months),
        month: cn("w-full space-y-3", classNames?.month),
        month_caption: cn("px-8 pt-1", classNames?.month_caption),
        dropdowns: cn("grid w-full grid-cols-[minmax(5.5rem,7rem)_5.25rem] items-center justify-center gap-2", classNames?.dropdowns),
        dropdown_root: cn("relative min-w-0", classNames?.dropdown_root),
        dropdown: cn("min-w-0", classNames?.dropdown),
        caption_label: cn("hidden", classNames?.caption_label),
        chevron: cn("size-4", classNames?.chevron),
        nav: cn("flex items-center justify-between", classNames?.nav),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "absolute left-1 top-1 size-7 bg-transparent p-0 opacity-70 hover:opacity-100",
          classNames?.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "absolute right-1 top-1 size-7 bg-transparent p-0 opacity-70 hover:opacity-100",
          classNames?.button_next
        ),
        month_grid: cn("w-full border-collapse space-y-1", classNames?.month_grid),
        weekdays: cn("flex", classNames?.weekdays),
        weekday: cn("w-8 rounded-md text-xs font-normal text-muted-foreground", classNames?.weekday),
        week: cn("mt-1.5 flex w-full", classNames?.week),
        day: cn("size-8 p-0 text-center text-sm", classNames?.day),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal aria-selected:opacity-100",
          classNames?.day_button
        ),
        selected: cn(
          "rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          classNames?.selected
        ),
        today: cn("rounded-md bg-accent text-accent-foreground", classNames?.today),
        outside: cn("text-muted-foreground opacity-50", classNames?.outside),
        disabled: cn("text-muted-foreground opacity-50", classNames?.disabled),
        hidden: cn("invisible", classNames?.hidden),
        ...classNames,
      }}
      components={{
        Dropdown: CalendarDropdown,
        Chevron: ({ orientation, ...chevronProps }) => {
          if (orientation === "left") return <ChevronLeft {...chevronProps} className="size-4" />;
          if (orientation === "right") return <ChevronRight {...chevronProps} className="size-4" />;
          return <ChevronDown {...chevronProps} className="size-4" />;
        },
        ...components,
      }}
      {...props}
    />
  );
}

export { Calendar };

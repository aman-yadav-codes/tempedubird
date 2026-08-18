import { Checkbox } from "@/components/ui/checkbox";

import type { FilterSection } from "./institute-data";

type FilterOptionGroupProps = FilterSection & {
  selectedValues: string[];
  onToggle: (value: string) => void;
};

export function FilterOptionGroup({
  title,
  options,
  selectedValues,
  onToggle,
}: FilterOptionGroupProps) {
  return (
    <section className="rounded-lg border border-border bg-card/70 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={selectedValues.includes(option.value)}
              onCheckedChange={() => onToggle(option.value)}
              aria-label={option.label}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

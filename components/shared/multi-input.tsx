"use client";

import { KeyboardEvent, useState } from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MultiInputProps = {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  className?: string;
  inputMode?: "text" | "email" | "tel" | "url";
  error?: string;
  validateItem?: (value: string) => string | null;
  onDraftChange?: (value: string) => void;
};

export function MultiInput({
  values,
  onChange,
  placeholder = "Add value...",
  addLabel = "Add",
  className,
  inputMode = "text",
  error,
  validateItem,
  onDraftChange,
}: MultiInputProps) {
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);

  function addDraft() {
    const next = draft.trim();
    if (!next) return;
    const validationError = validateItem?.(next) ?? null;
    if (validationError) {
      setDraftError(validationError);
      return;
    }
    const existing = new Set(values.map((value) => value.trim().toLowerCase()));
    if (!existing.has(next.toLowerCase())) {
      onChange([...values, next]);
    }
    setDraft("");
    setDraftError(null);
    onDraftChange?.("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    addDraft();
  }

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "rounded-md border bg-background p-2",
          (error || draftError) && "border-destructive ring-1 ring-destructive/30",
          className
        )}
      >
      <div className="flex min-h-7 flex-wrap gap-1.5">
        {values.map((value) => (
          <Badge key={value} variant="secondary" className="max-w-full gap-1 rounded-md">
            <span className="max-w-[min(14rem,calc(100vw-7rem))] truncate">{value}</span>
            <button
              type="button"
              className="rounded-sm opacity-70 hover:opacity-100"
              onClick={() => onChange(values.filter((item) => item !== value))}
            >
              <X className="size-3" />
              <span className="sr-only">Remove {value}</span>
            </button>
          </Badge>
        ))}
      </div>
      <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row">
        <Input
          value={draft}
          onChange={(event) => {
            const nextDraft = event.target.value;
            setDraft(nextDraft);
            setDraftError(null);
            onDraftChange?.(nextDraft);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          inputMode={inputMode}
          className="h-9 min-w-0"
        />
        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={addDraft}>
          <Plus className="size-4" />
          {addLabel}
        </Button>
      </div>
    </div>
      {(draftError || error) && (
        <p className="text-xs font-medium text-destructive">{draftError || error}</p>
      )}
    </div>
  );
}

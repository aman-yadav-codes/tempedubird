"use client";

import { CheckCircle2, Cloud, Loader2, AlertCircle } from "lucide-react";
import type { SaveStatus } from "@/hooks/use-progressive-save";
import { cn } from "@/lib/utils";

type ProgressiveSaveIndicatorProps = {
  status: SaveStatus;
  className?: string;
  onClearDraft?: () => void;
};

export function ProgressiveSaveIndicator({
  status,
  className,
  onClearDraft,
}: ProgressiveSaveIndicatorProps) {
  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium transition-all duration-300",
        status === "saving" && "text-amber-600 dark:text-amber-400",
        status === "saved" && "text-emerald-600 dark:text-emerald-400",
        status === "error" && "text-rose-600 dark:text-rose-400",
        className
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
          <span>Auto-saving draft...</span>
        </>
      )}

      {status === "saved" && (
        <>
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span>Draft saved automatically</span>
          {onClearDraft && (
            <button
              type="button"
              onClick={onClearDraft}
              className="ml-1 text-[10px] text-muted-foreground hover:text-destructive underline cursor-pointer"
            >
              (Clear draft)
            </button>
          )}
        </>
      )}

      {status === "error" && (
        <>
          <AlertCircle className="h-3 w-3 text-rose-500" />
          <span>Save failed</span>
        </>
      )}
    </div>
  );
}

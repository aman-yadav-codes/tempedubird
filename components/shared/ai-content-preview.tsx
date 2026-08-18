"use client";

import { cn } from "@/lib/utils";

interface AiContentPreviewProps {
    data: Record<string, any> | null;
    className?: string;
}

function renderPlainList(items: string[] | undefined, variant: "bullet" | "numbered" = "bullet") {
    if (!items?.length) return null;
    return (
        <div>
            {variant === "bullet" ? (
                <ul className="list-disc pl-5 space-y-1 text-sm leading-6 text-foreground">
                    {items.map((it, i) => (
                        <li key={`${it}-${i}`} className="wrap-break-word whitespace-normal">{it}</li>
                    ))}
                </ul>
            ) : (
                <ol className="list-decimal pl-5 space-y-1 text-sm leading-6 text-foreground">
                    {items.map((it, i) => (
                        <li key={`${it}-${i}`} className="wrap-break-word whitespace-normal">{it}</li>
                    ))}
                </ol>
            )}
        </div>
    );
}

export function AiContentPreview({ data, className }: AiContentPreviewProps) {
    if (!data) {
        return (
            <div className={cn("rounded-lg border border-dashed bg-muted/10 py-10 text-center text-sm text-muted-foreground", className)}>
                Generated content will appear here.
            </div>
        );
    }

    const description = typeof data.description === "string" ? data.description : null;

    return (
        <div className={cn("prose prose-sm max-w-none text-foreground", className)}>
            <div className="mb-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Structured preview</div>
                <div className="text-sm font-semibold">AI-generated scholarship content</div>
            </div>

            {description ? (
                <div className="mb-4">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Description</div>
                    <p className="text-sm leading-7 text-foreground/95">{description}</p>
                </div>
            ) : null}

            {Object.entries(data)
                .filter(([k, v]) => k !== "description" && v != null)
                .map(([key, value]) => (
                    <div key={key} className="mb-4">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">{key.replace(/_/g, " ")}</div>
                        {Array.isArray(value)
                            ? renderPlainList(value as string[], key === "application_process" ? "numbered" : "bullet")
                            : <p className="text-sm leading-7 text-foreground wrap-break-word whitespace-pre-wrap">{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</p>
                        }
                    </div>
                ))}
        </div>
    );
}

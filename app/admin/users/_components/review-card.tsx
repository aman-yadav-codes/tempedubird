import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ReviewCardProps = {
    title: string;
    children: ReactNode;
    className?: string;
};

export function ReviewCard({ title, children, className }: ReviewCardProps) {
    return (
        <div className={cn("rounded-lg border p-4", className)}>
            <h3 className="mb-3 font-semibold">{title}</h3>
            {children}
        </div>
    );
}

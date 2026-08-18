import type { ComponentType } from "react";
import { Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type StaffComingSoonProps = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  items: string[];
};

export function StaffComingSoon({
  title,
  description,
  icon: Icon,
  items,
}: StaffComingSoonProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline" className="w-fit gap-2 rounded-md px-3 py-1">
          <Clock className="size-3.5" />
          Coming soon
        </Badge>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border bg-background text-destructive">
            <Icon className="size-7" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{title} module is coming soon</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              This institution-only staff workflow is reserved in navigation and permissions. The page can be connected
              to attendance, payroll, letter, and salary slip data when the module is built.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <div key={item} className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

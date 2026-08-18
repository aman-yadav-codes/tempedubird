import type { ComponentType } from "react";
import { Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type StudentComingSoonProps = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

export function StudentComingSoon({
  title,
  description,
  icon: Icon,
}: StudentComingSoonProps) {
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

      <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-lg border bg-background text-destructive">
          <Icon className="size-7" />
        </div>
        <h2 className="mt-5 text-lg font-semibold">{title} module is coming soon</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          This section is reserved for student management workflows. The page is ready in the admin
          navigation and can be connected to real data when the module is built.
        </p>
      </div>
    </div>
  );
}

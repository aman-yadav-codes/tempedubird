import type { ComponentType } from "react";
import { Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type ClassroomComingSoonProps = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

export function ClassroomComingSoon({
  title,
  description,
  icon: Icon,
}: ClassroomComingSoonProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline" className="w-fit gap-2 rounded-md px-3 py-1">
          <Clock className="size-3.5" />
          Upcoming
        </Badge>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-lg border bg-background text-destructive">
          <Icon className="size-7" />
        </div>
        <h2 className="mt-5 text-lg font-semibold">{title} is coming soon</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          This classroom page is ready in the student navigation. Institution admins can control
          student access through institution-scoped classroom permissions.
        </p>
      </div>
    </div>
  );
}

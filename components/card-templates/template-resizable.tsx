"use client";

import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

export function TemplateResizablePanelGroup({
  className,
  direction,
  id,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Group> & {
  direction: "horizontal" | "vertical";
}) {
  return (
    <ResizablePrimitive.Group
      key={direction}
      id={id ?? `card-template-generator-${direction}`}
      orientation={direction}
      className={cn(
        "flex h-full w-full aria-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    />
  );
}

export function TemplateResizablePanel(
  props: React.ComponentProps<typeof ResizablePrimitive.Panel>
) {
  return <ResizablePrimitive.Panel {...props} />;
}

export function TemplateResizableHandle({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator>) {
  return (
    <ResizablePrimitive.Separator
      data-template-resize-handle
      className={cn(
        "group relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2 aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:inset-x-0 aria-[orientation=horizontal]:after:inset-y-auto aria-[orientation=horizontal]:after:top-1/2 aria-[orientation=horizontal]:after:h-2 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2",
        className
      )}
      {...props}
    >
      <div className="z-10 flex h-7 w-2 items-center justify-center rounded-full border bg-background shadow-sm group-aria-[orientation=horizontal]:h-2 group-aria-[orientation=horizontal]:w-7">
        <span className="h-4 w-0.5 rounded-full bg-muted-foreground/60 group-aria-[orientation=horizontal]:h-0.5 group-aria-[orientation=horizontal]:w-4" />
      </div>
    </ResizablePrimitive.Separator>
  );
}

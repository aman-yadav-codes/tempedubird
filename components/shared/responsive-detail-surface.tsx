"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type ResponsiveDetailSurfaceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  mobileBreakpoint?: number;
  sheetClassName?: string;
  drawerClassName?: string;
  bodyClassName?: string;
  closeLabel?: string;
};

function useIsMobileSurface(breakpoint: number) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(query.matches);

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

export function ResponsiveDetailSurface({
  open,
  onOpenChange,
  title,
  description,
  children,
  mobileBreakpoint = 767,
  sheetClassName,
  drawerClassName,
  bodyClassName,
  closeLabel = "Close details",
}: ResponsiveDetailSurfaceProps) {
  const isMobile = useIsMobileSurface(mobileBreakpoint);

  if (isMobile) {
    return (
      <Drawer
        direction="bottom"
        open={open}
        onOpenChange={onOpenChange}
      >
        <DrawerContent
          className={cn(
            "h-[90dvh] max-h-[90dvh] w-full max-w-none overflow-hidden border-x-0 bg-background p-0",
            drawerClassName,
          )}
        >
          <div
            className="flex h-full flex-col overflow-hidden"
          >
            <DrawerHeader className="sr-only">
              <DrawerTitle>{title}</DrawerTitle>
              {description ? <DrawerDescription>{description}</DrawerDescription> : null}
            </DrawerHeader>
            <div className="shrink-0 border-b px-4 pb-3 pt-6 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">{title}</h2>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                  <X className="size-4" />
                  <span className="sr-only">{closeLabel}</span>
                </Button>
              </div>
            </div>
            <div
              className={cn("min-h-0 flex-1 overflow-y-auto py-3", bodyClassName)}
            >
              {children}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          "flex h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl",
          sheetClassName,
        )}
      >
        <SheetHeader className="shrink-0 border-b px-6 py-5 text-left">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className={cn("min-h-0 flex-1 overflow-y-auto py-4", bodyClassName)}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

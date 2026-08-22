"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-3 data-[orientation=horizontal]:flex-col data-[orientation=vertical]:flex-row w-full",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex items-center justify-start rounded-xl p-1 text-muted-foreground bg-muted/60 border border-border/50 gap-1 overflow-x-auto max-w-full min-h-10 data-[variant=line]:rounded-none data-[variant=line]:bg-transparent data-[variant=line]:border-none data-[variant=line]:p-0",
  {
    variants: {
      variant: {
        default: "",
        line: "gap-2 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold text-muted-foreground transition-all shrink-0 cursor-pointer outline-none select-none",
        "hover:text-foreground hover:bg-background/60",
        "focus-visible:ring-2 focus-visible:ring-primary/40",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:font-extrabold",
        "group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:text-primary group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-b-2 group-data-[variant=line]/tabs-list:border-primary group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none focus-visible:outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }

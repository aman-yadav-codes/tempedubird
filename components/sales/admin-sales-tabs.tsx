"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, CalendarCheck2, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSalesTabsProps {
  className?: string;
  scope?: "admin" | "workspace";
}

export function AdminSalesTabs({ className, scope = "admin" }: AdminSalesTabsProps) {
  const pathname = usePathname();
  const isWorkspace = scope === "workspace" || pathname?.startsWith("/workspace");
  const base = isWorkspace ? "/workspace/sales" : "/admin/sales";

  const tabs = [
    {
      title: "Enquiries",
      href: `${base}/enquiries`,
      icon: Mail,
      isActive: pathname?.includes("/sales/enquiries"),
    },
    {
      title: "Bookings",
      href: `${base}/bookings`,
      icon: CalendarCheck2,
      isActive: pathname?.includes("/sales/bookings"),
    },
    {
      title: "Orders",
      href: `${base}/orders`,
      icon: ShoppingCart,
      isActive: pathname?.includes("/sales/orders"),
    },
  ];

  return (
    <div className={cn("flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 w-fit overflow-x-auto", className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.title}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
              tab.isActive
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/80"
            )}
          >
            <Icon className="size-3.5" />
            <span>{tab.title}</span>
          </Link>
        );
      })}
    </div>
  );
}

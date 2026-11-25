"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, CalendarCheck2, ShoppingCart, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerSalesTabsProps {
  className?: string;
}

export function CustomerSalesTabs({ className }: CustomerSalesTabsProps) {
  const pathname = usePathname();

  const tabs = [
    {
      title: "Enquiries",
      href: "/customer/enquiries",
      icon: Mail,
      isActive: pathname?.startsWith("/customer/enquiries") || pathname?.startsWith("/admin/enquiries"),
    },
    {
      title: "Bookings",
      href: "/customer/bookings",
      icon: CalendarCheck2,
      isActive: pathname?.startsWith("/customer/bookings") || pathname?.startsWith("/admin/bookings"),
    },
    {
      title: "Orders",
      href: "/customer/orders",
      icon: ShoppingCart,
      isActive: pathname?.startsWith("/customer/orders") || pathname?.startsWith("/admin/orders"),
    },
    {
      title: "Favorites",
      href: "/customer/favorites",
      icon: Heart,
      isActive: pathname?.startsWith("/customer/favorites") || pathname?.startsWith("/admin/favorites"),
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

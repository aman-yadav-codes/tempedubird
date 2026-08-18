"use client";

import { BarChart3, TrendingUp, Users, CreditCard, ArrowUpRight, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BusinessAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Business Analytics & Marketing ROI
        </h1>
        <p className="text-sm text-muted-foreground">
          Track package subscriptions, lead conversion rates, revenue growth, and campaign performance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Monthly Package Revenue", value: "₹4,85,000", change: "+18.4%", icon: DollarSign },
          { title: "Active Paid Subscriptions", value: "142 Institutes", change: "+12.1%", icon: CreditCard },
          { title: "Total Student Leads", value: "8,940", change: "+24.8%", icon: Users },
          { title: "Lead to Admission Conversion", value: "14.2%", change: "+3.2%", icon: TrendingUp },
        ].map((stat, idx) => (
          <div key={idx} className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">{stat.title}</span>
              <stat.icon className="h-4 w-4 text-primary" />
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl font-extrabold text-foreground">{stat.value}</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                {stat.change} <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

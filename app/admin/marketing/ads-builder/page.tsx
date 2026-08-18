"use client";

import { Megaphone, Plus, Eye, BarChart2, Target, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdsBuilderPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Portal & Banner Ads Builder
          </h1>
          <p className="text-sm text-muted-foreground">
            Create featured banner ads, sponsored institute listings, and Google/Meta ad campaigns.
          </p>
        </div>

        <Button className="gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          <span>Create New Ad Campaign</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {[
          { title: "Homepage Top Featured Banner", type: "Portal Banner", status: "Active", impressions: "142,500", clicks: "4,820", ctr: "3.38%" },
          { title: "Courses Search Sponsored Placement", type: "Search Ads", status: "Active", impressions: "98,200", clicks: "3,110", ctr: "3.16%" },
        ].map((ad, idx) => (
          <div key={idx} className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-base text-foreground">{ad.title}</span>
              <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {ad.status}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Impressions</p>
                <p className="font-extrabold text-foreground text-sm">{ad.impressions}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Clicks</p>
                <p className="font-extrabold text-foreground text-sm">{ad.clicks}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">CTR</p>
                <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{ad.ctr}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

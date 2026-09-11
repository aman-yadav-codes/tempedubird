"use client";

import { AffiliatesView } from "../_components/affiliates-view";
import Link from "next/link";
import { Users as UsersIcon, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";
import { toRoleRoutePath } from "@/lib/auth/role-routes";

export default function AdminAffiliatesRecordsPage() {
  const { user } = useAuthStore();
  const allUsersUrl = toRoleRoutePath("/admin/users", user);

  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Affiliate Records & Commissions</h1>
          <p className="text-muted-foreground text-xs md:text-sm">
            Comprehensive oversight of all platform affiliates, referral networks, commission earnings, and payouts across all users.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-lg text-xs font-bold gap-1.5 cursor-pointer h-8 px-3 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
            >
              <Link href={allUsersUrl}>
                <UsersIcon className="h-3.5 w-3.5" />
                All Users
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-lg text-xs font-bold gap-1.5 cursor-pointer h-8 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs hover:bg-white dark:hover:bg-slate-900"
            >
              <Share2 className="h-3.5 w-3.5 text-[#D91B1B]" />
              Affiliate Records
            </Button>
          </div>
        </div>
      </div>

      <AffiliatesView />
    </div>
  );
}

"use client";

import { ReactNode } from "react";
import { PlatformAdminHeader } from "@/components/platform-admin/platform-admin-header";
import { PlatformAdminFooter } from "@/components/platform-admin/platform-admin-footer";

export function PlatformAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      <PlatformAdminHeader />
      <main className="flex-1 flex flex-col">{children}</main>
      <PlatformAdminFooter />
    </div>
  );
}

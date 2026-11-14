"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { CustomerFinanceView } from "@/components/customer/customer-finance-view";

export default function FinancePage() {
  const router = useRouter();
  const { isReady } = useAdminGuard();
  const { user } = useAuthStore();

  const isPlatformAdmin = Boolean(user?.is_super_admin || user?.role_codes?.includes("platform_admin"));
  const isCustomer = Boolean(
    user?.is_customer ||
    (!isPlatformAdmin && !user?.has_business_profile && !user?.has_professional_profile &&
      (user?.role_codes?.includes("customer") || !user?.role_codes?.some((r) => ["institution_admin", "teacher", "student", "parent"].includes(r))))
  );

  useEffect(() => {
    if (isReady && !isCustomer) {
      router.replace("/admin/finance/transactions");
    }
  }, [isReady, isCustomer, router]);

  if (!isReady) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading finance records...</div>;
  }

  if (isCustomer) {
    return <CustomerFinanceView />;
  }

  return <div className="p-8 text-center text-xs text-muted-foreground">Loading finance...</div>;
}

"use client";

import { ReactNode, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/auth-provider";
import { HelpCommandDialog } from "@/components/help/help-command-dialog";
import { AnalyticsTracker } from "@/components/shared/analytics-tracker";

interface RootProvidersProps {
    children: ReactNode;
}

export function RootProviders({ children }: RootProvidersProps) {
    return (
        <TooltipProvider>
            <AuthProvider>
                {children}
                <Suspense fallback={null}>
                    <AnalyticsTracker />
                </Suspense>
                <HelpCommandDialog />
                <Toaster />
            </AuthProvider>
        </TooltipProvider>
    );
}

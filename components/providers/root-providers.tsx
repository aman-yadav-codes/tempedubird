"use client";

import { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/auth-provider";
import { HelpCommandDialog } from "@/components/help/help-command-dialog";

interface RootProvidersProps {
    children: ReactNode;
}

export function RootProviders({ children }: RootProvidersProps) {
    return (
        <TooltipProvider>
            <AuthProvider>
                {children}
                <HelpCommandDialog />
                <Toaster />
            </AuthProvider>
        </TooltipProvider>
    );
}

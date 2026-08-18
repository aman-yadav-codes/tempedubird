import type { ReactNode } from "react";
import { Info } from "lucide-react";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

type HelpPopoverProps = {
    title: string;
    children: ReactNode;
};

export function HelpPopover({ title, children }: HelpPopoverProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="inline-grid size-4 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={title}
                >
                    <Info className="size-3.5" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="center"
                collisionPadding={16}
                sideOffset={8}
                className="w-[min(18rem,calc(100vw-2rem))]"
            >
                <div className="space-y-1">
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-muted-foreground">{children}</p>
                </div>
            </PopoverContent>
        </Popover>
    );
}

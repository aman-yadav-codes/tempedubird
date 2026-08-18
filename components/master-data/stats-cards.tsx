import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface Stats {
    total: number;

    // old reusable fields
    active?: number;
    disabled?: number;

    // organizations specific
    pending?: number;
    approved?: number;
    rejected?: number;

    // shared
    deleted: number;
}

interface SplitCard {
    index: number;

    left: {
        label: string;
        value: number;
        color: string;
    };

    right: {
        label: string;
        value: number;
        color: string;
    };
}

interface StatsCardsProps {
    stats: Stats | null;
    loading: boolean;
    title: string;

    // optional reusable split card
    splitCard?: SplitCard;
}

export function StatsCards({
    stats,
    loading,
    title,
    splitCard,
}: StatsCardsProps) {
    const [open, setOpen] = useState(false);

    if (loading || !stats) {
        return (
            <div
                className={`grid grid-cols-2 gap-2 sm:gap-3 ${title === "Organizations"
                    ? "sm:grid-cols-4"
                    : "sm:grid-cols-4"
                    }`}
            >
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 sm:h-24 bg-muted rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    const isOrganizations = title === "Organizations";

    const statItems = [
        {
            label: "Total",
            value: stats.total,
           color: "border bg-card"
        },
        {
            label: "Active",
            value: stats.active,
           color: "border bg-card"
        },
        {
            label: "Disabled",
            value: stats.disabled,
           color: "border bg-card"
        },
        {
            label: "Deleted",
            value: stats.deleted,
           color: "border bg-card"
        },
    ];

    return (
        <>
            {/* Mobile View - Trigger Button */}
            <div className="sm:hidden">
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            View Stats
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{title} Statistics</DialogTitle>
                            <DialogDescription>Overview of {title.toLowerCase()} in the system</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-3">
                            {statItems.map((item, index) => {
                                const isSplit = splitCard?.index === index;

                                if (isSplit && splitCard) {
                                    return (
                                        <div
                                            key={`split-${index}`}
                                            className="overflow-hidden rounded-xl border bg-card"
                                        >
                                            {/* Pending */}
                                            <div className="flex items-center justify-between px-4 py-3">
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    {splitCard.left.label}
                                                </span>

                                                <span className="text-2xl font-bold">
                                                    {splitCard.left.value}
                                                </span>
                                            </div>

                                            <div className="border-t" />

                                            {/* Approved */}
                                            <div className="flex items-center justify-between px-4 py-3">
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    {splitCard.right.label}
                                                </span>

                                                <span className="text-2xl font-bold">
                                                    {splitCard.right.value}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={item.label}
                                        className="rounded-2xl border bg-card p-5 transition-all hover:border-primary/30"
                                    >
                                        <div className="text-xs sm:text-sm font-medium opacity-75">
                                            {item.label}
                                        </div>

                                        <div className="mt-3 text-4xl font-bold">
                                            {item.value}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Desktop View - Grid Cards */}
            <div
                className={`hidden sm:grid gap-3 ${title === "Organizations"
                        ? "sm:grid-cols-4"
                        : "sm:grid-cols-4"
                    }`}
            >
                {statItems.map((item, index) => {
                    const isSplit = splitCard?.index === index;

                    if (isSplit && splitCard) {
                        return (
                            <div
                                key={`split-${index}`}
                                className="grid grid-cols-2 overflow-hidden rounded-2xl border bg-card"
                            >
                                {/* Pending */}
                                <div className="p-5 border-r">
                                    <div className="text-sm text-muted-foreground">
                                        {splitCard.left.label}
                                    </div>

                                    <div className="mt-3 text-4xl font-bold">
                                        {splitCard.left.value}
                                    </div>
                                </div>

                                {/* Approved */}
                                <div className="p-5">
                                    <div className="text-sm text-muted-foreground">
                                        {splitCard.right.label}
                                    </div>

                                    <div className="mt-3 text-4xl font-bold">
                                        {splitCard.right.value}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={item.label}
                            className={`rounded-lg p-4 sm:p-6 ${item.color} transition-transform hover:scale-105`}
                        >
                            <div className="text-sm text-muted-foreground">
                                {item.label}
                            </div>

                            <div className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">
                                {item.value}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

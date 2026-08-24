"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface AsyncSearchPopoverProps<T> {
    value: string;
    onChange: (value: string) => void;

    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    selectedLabel?: string;
    onSelectItem?: (item: T) => void;
    items?: T[];
    localFilter?: boolean;
    loading?: boolean;

    fetcher?: (
        search: string,
        page: number
    ) => Promise<{
        data: T[];
        hasMore: boolean;
    }>;

    getValue: (item: T) => string;
    getLabel: (item: T) => string;

    renderItem?: (item: T) => React.ReactNode;
    defaultOptionLabel?: string;
    defaultOptionValue?: string;
    showDefaultOption?: boolean;
    hideDefaultOptionOnSearch?: boolean;
    allowCustomValue?: boolean;
    customValueLabel?: (value: string) => string;
    onCreateCustomValue?: (value: string) => void;
    popoverClassName?: string;
    commandClassName?: string;
    commandGroupClassName?: string;
    itemClassName?: string;
    side?: ComponentProps<typeof PopoverContent>["side"];
    avoidCollisions?: boolean;
    collisionPadding?: ComponentProps<typeof PopoverContent>["collisionPadding"];
}

export function AsyncSearchPopover<T>({
    value,
    onChange,
    placeholder = "Select item",
    searchPlaceholder = "Search...",
    emptyText = "No results found",
    disabled = false,
    selectedLabel,
    onSelectItem,
    items: localItems = [],
    localFilter = false,
    loading: externalLoading = false,


    fetcher,
    getValue,
    getLabel,
    renderItem,
    defaultOptionLabel = "None",
    defaultOptionValue = "",
    showDefaultOption = false,
    hideDefaultOptionOnSearch = false,
    allowCustomValue = false,
    customValueLabel = (value) => `Use "${value}"`,
    onCreateCustomValue,
    popoverClassName,
    commandClassName,
    commandGroupClassName,
    itemClassName,
    side,
    avoidCollisions = true,
    collisionPadding = 24,

}: AsyncSearchPopoverProps<T>) {
    const [open, setOpen] = useState(false);


    const [search, setSearch] = useState("");

    const [asyncItems, setAsyncItems] = useState<T[]>([]);

    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(false);

    const [loadingMore, setLoadingMore] = useState(false);

    const [hasMore, setHasMore] = useState(true);

    const loadingRef = useRef(false);
    const lastScrollTopRef = useRef(0);
    const requestIdRef = useRef(0);
    const fetcherRef = useRef(fetcher);
    const getValueRef = useRef(getValue);

    useEffect(() => {
        fetcherRef.current = fetcher;
        getValueRef.current = getValue;
    }, [fetcher, getValue]);

    const [internalLabel, setInternalLabel] = useState("");

    const loadData = useCallback(async (
        searchValue: string,
        pageValue: number
    ) => {
        const requestId = ++requestIdRef.current;
        try {
            if (pageValue === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const currentFetcher = fetcherRef.current;
            if (!currentFetcher) return;

            const res = await currentFetcher(searchValue, pageValue);
            if (requestId !== requestIdRef.current) return;

            setAsyncItems((prev) => {
                const merged =
                    pageValue === 1
                        ? res.data
                        : [...prev, ...res.data];

                const uniqueMap = new Map();

                merged.forEach((item) => {
                    uniqueMap.set(getValueRef.current(item), item);
                });

                return Array.from(uniqueMap.values());
            });

            setHasMore(res.hasMore);
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
                setLoadingMore(false);
            }

            requestAnimationFrame(() => {
                loadingRef.current = false;
            });
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        if (localFilter) return;

        const timeout = setTimeout(() => {
            loadData(search, page);
        }, 300);

        return () => clearTimeout(timeout);
    }, [search, page, open, localFilter, loadData]);


    const displayedItems = localFilter
        ? localItems.filter((item) =>
            getLabel(item)
                .toLowerCase()
                .includes(search.trim().toLowerCase())
        )
        : asyncItems;

    const matchedDisplayItem = value
        ? displayedItems.find((item) => getValue(item) === value)
        : undefined;
    const displayLabel = value
        ? selectedLabel || (matchedDisplayItem ? getLabel(matchedDisplayItem) : internalLabel)
        : "";
    const isSearching = externalLoading || loading;


    return (
        <Popover
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                setPage(1);
                if (nextOpen && !localFilter) {
                    requestIdRef.current += 1;
                    setAsyncItems([]);
                    setHasMore(true);
                    setLoading(Boolean(fetcherRef.current));
                }
                if (!nextOpen) {
                    setSearch("");
                    setLoading(false);
                }
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    disabled={disabled}
                    variant="outline"
                    role="combobox"
                    className="w-full min-w-0 max-w-full justify-between gap-2 overflow-hidden"
                >
                    <span className="w-0 min-w-0 flex-1 truncate text-left">
                        {displayLabel || placeholder}
                    </span>

                    {externalLoading ? (
                        <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-70" />
                    ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="start"
                side={side}
                sideOffset={6}
                collisionPadding={collisionPadding}
                avoidCollisions={avoidCollisions}
                className={cn(
                    "z-50 w-[min(calc(100vw-24px),360px)] max-w-[calc(100vw-24px)] overflow-hidden p-0 sm:w-[min(var(--radix-popover-trigger-width),calc(100vw-24px))]",
                    popoverClassName
                )}
            >
                <Command
                    shouldFilter={false}
                    className={cn(
                        "flex h-auto max-h-[min(280px,calc(100dvh-120px))] flex-col overflow-hidden",
                        commandClassName
                    )}
                >
                    <CommandInput
                        placeholder={searchPlaceholder}
                        value={search}
                        onValueChange={(nextSearch) => {
                            if (!localFilter && fetcherRef.current) {
                                requestIdRef.current += 1;
                                setLoading(true);
                                setLoadingMore(false);
                            }
                            setSearch(nextSearch);
                            setPage(1);
                        }}
                        className="shrink-0"
                    />

                    <div
                        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
                        style={{ WebkitOverflowScrolling: "touch" }}
                        onWheelCapture={(e) => e.stopPropagation()}
                        onTouchMoveCapture={(e) => e.stopPropagation()}
                        onScroll={(e) => {
                            const target = e.currentTarget;
                            const isScrollingDown = target.scrollTop > lastScrollTopRef.current;
                            lastScrollTopRef.current = target.scrollTop;

                            const reachedBottom =
                                target.scrollTop +
                                target.clientHeight >=
                                target.scrollHeight - 20;

                            if (
                                !localFilter &&
                                isScrollingDown &&
                                reachedBottom &&
                                hasMore &&
                                !loading &&
                                !loadingRef.current
                            ) {
                                loadingRef.current = true;

                                setPage((prev) => prev + 1);
                            }
                        }}
                    >
                        <CommandList className="overflow-visible">
                            {isSearching ? (
                                <div
                                    role="status"
                                    aria-live="polite"
                                    className="flex min-h-24 flex-col items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground"
                                >
                                    <Loader2 className="size-5 animate-spin text-primary" />
                                    <span>
                                        {search.trim() ? "Searching..." : "Loading options..."}
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <CommandGroup className={commandGroupClassName}>
                                        {showDefaultOption &&
                                            (!hideDefaultOptionOnSearch || !search.trim()) && (
                                                <CommandItem
                                                    className={itemClassName}
                                                    value="__default__"
                                                    onSelect={() => {
                                                        onChange(defaultOptionValue);
                                                        setInternalLabel(defaultOptionLabel);
                                                        setOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={`mr-2 h-4 w-4 ${value === defaultOptionValue ? "opacity-100" : "opacity-0"
                                                            }`}
                                                    />
                                                    <div className="min-w-0 flex-1 overflow-hidden">
                                                        <div className="truncate">{defaultOptionLabel}</div>
                                                    </div>
                                                </CommandItem>
                                            )}

                                        {allowCustomValue && search.trim() && !displayedItems.some((item) => {
                                            const label = getLabel(item).trim().toLowerCase();
                                            return label === search.trim().toLowerCase();
                                        }) && (
                                            <CommandItem
                                                className={cn("border-b font-medium text-primary cursor-pointer", itemClassName)}
                                                value={`__custom__${search.trim()}`}
                                                onSelect={() => {
                                                    const val = search.trim();
                                                    onChange(val);
                                                    onCreateCustomValue?.(val);
                                                    setInternalLabel(val);
                                                    setOpen(false);
                                                }}
                                            >
                                                <Plus className="mr-2 h-4 w-4 text-primary shrink-0" />
                                                <span className="truncate">{customValueLabel(search.trim())}</span>
                                            </CommandItem>
                                        )}

                                        {displayedItems.map((item) => {
                                            const itemValue = getValue(item);

                                            return (
                                                <CommandItem
                                                    className={itemClassName}
                                                    key={itemValue}
                                                    value={getLabel(item)}
                                                    onSelect={() => {
                                                        onChange(itemValue);
                                                        onSelectItem?.(item);
                                                        setInternalLabel(getLabel(item));
                                                        setOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={`mr-2 h-4 w-4 ${value === itemValue
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                            }`}
                                                    />

                                                    <div className="min-w-0 flex-1 overflow-hidden">
                                                        {renderItem
                                                            ? renderItem(item)
                                                            : (
                                                                <div className="truncate">
                                                                    {getLabel(item)}
                                                                </div>
                                                            )}
                                                    </div>
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandGroup>
                                    {(!allowCustomValue || !search.trim()) && <CommandEmpty>{emptyText}</CommandEmpty>}
                                </>
                            )}

                            {loadingMore && !isSearching && (
                                <div className="flex items-center justify-center py-3">
                                    <Loader2 className="size-4 animate-spin" />
                                    <span className="ml-2 text-xs text-muted-foreground">
                                        Loading more...
                                    </span>
                                </div>
                            )}
                        </CommandList>
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

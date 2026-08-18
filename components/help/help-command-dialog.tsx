"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Home, Loader2 } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { helpIcons } from "@/components/help/help-content";
import { useAuthStore } from "@/store";
import { readJsonResponse } from "@/lib/api/read-json-response";

type SearchResult = {
  type: "article" | "category" | "faq";
  title: string;
  description: string;
  href: string;
  icon?: string;
  iconName?: string;
};

const groups = [
  { type: "category", label: "Categories" },
  { type: "article", label: "Articles" },
  { type: "faq", label: "FAQs" },
] as const;

export function HelpCommandDialog() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/help/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });
        const json = await readJsonResponse<{ data?: SearchResult[] }>(res);
        setResults(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [accessToken, open, query]);

  function goToPage(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search help"
      description="Search help pages, FAQs, videos, and release notes."
      className="overflow-hidden border bg-popover text-popover-foreground shadow-2xl sm:max-w-2xl"
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search articles, guides, modules and FAQs..."
        />
        <CommandList className="max-h-[460px]">
          <CommandGroup heading="Help Center">
            <CommandItem
              value="go to help center home documentation"
              onSelect={() => goToPage("/help")}
              className="py-3"
            >
              <Home className="size-4 text-red-500" />
              <div className="min-w-0">
                <div className="font-medium">Go to Help Center</div>
                <div className="truncate text-xs text-muted-foreground">Open the Help Center home page.</div>
              </div>
              <CommandShortcut>
                <ArrowRight className="size-3.5" />
              </CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching help...
            </div>
          ) : null}
          {!loading ? <CommandEmpty>No help page found.</CommandEmpty> : null}
          {groups.map((group, index) => {
            const groupEntries = results.filter((entry) => entry.type === group.type);
            if (!groupEntries.length) return null;
            return (
              <div key={group.type}>
                {index > 0 ? <CommandSeparator /> : null}
                <CommandGroup heading={group.label}>
                  {groupEntries.map((entry) => {
                    const Icon = helpIcons[entry.icon as keyof typeof helpIcons] ?? helpIcons.docs;
                    return (
                      <CommandItem
                        key={`${entry.type}-${entry.href}-${entry.title}`}
                        value={`${entry.title} ${entry.description}`}
                        onSelect={() => goToPage(entry.href)}
                        className="py-3"
                      >
                        <Icon className="size-4 text-red-500" />
                        <div className="min-w-0">
                          <div className="font-medium">{entry.title}</div>
                          <div className="truncate text-xs text-muted-foreground">{entry.description}</div>
                        </div>
                        <CommandShortcut>
                          <ArrowRight className="size-3.5" />
                        </CommandShortcut>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </div>
            );
          })}
        </CommandList>
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          Press Enter to open the selected page.
        </div>
      </Command>
    </CommandDialog>
  );
}

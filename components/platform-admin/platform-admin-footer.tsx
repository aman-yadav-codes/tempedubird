"use client";

import Link from "next/link";

export function PlatformAdminFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/40 bg-muted/20 py-4 px-4 sm:px-6 lg:px-8 text-xs text-muted-foreground">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span>&copy; {year} EduBird Platform Administration</span>
          <span className="inline-block size-1 rounded-full bg-border" />
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            System Online
          </span>
        </div>

        <nav className="flex items-center gap-4 text-[11px]">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link href="/help" className="hover:text-foreground transition-colors">
            Help Center
          </Link>
        </nav>
      </div>
    </footer>
  );
}

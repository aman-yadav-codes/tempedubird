"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store";

const ANON_STORAGE_KEY = "edubird_anon_id";

export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "anon_ssr";
  try {
    let id = localStorage.getItem(ANON_STORAGE_KEY);
    if (!id) {
      id = `anon_usr_${Math.random().toString(36).substring(2, 9)}${Date.now().toString(36)}`;
      localStorage.setItem(ANON_STORAGE_KEY, id);
      document.cookie = `${ANON_STORAGE_KEY}=${id}; path=/; max-age=31536000; SameSite=Lax`;
    }
    return id;
  } catch {
    return "anon_fallback";
  }
}

export async function sendAnalyticsEvent(data: {
  event_type: "click" | "view" | "impression" | "search";
  page_url?: string;
  page_name?: string;
  button_name?: string;
  keywords?: string;
  institution_id?: number;
  metadata?: Record<string, unknown>;
}) {
  if (typeof window === "undefined") return;

  try {
    const anonymous_id = getOrCreateAnonymousId();
    const user = useAuthStore.getState().user;
    const page_url = data.page_url || window.location.href;
    const referrer = document.referrer || "";

    // Extract potential search keywords from URL or referrer if not directly provided
    let keywords = data.keywords;
    if (!keywords) {
      try {
        const urlObj = new URL(page_url);
        keywords = urlObj.searchParams.get("search") || 
                   urlObj.searchParams.get("q") || 
                   urlObj.searchParams.get("query") || 
                   urlObj.searchParams.get("category") || 
                   undefined;
        if (!keywords && referrer) {
          const refUrl = new URL(referrer);
          keywords = refUrl.searchParams.get("q") || refUrl.searchParams.get("query") || undefined;
        }
      } catch {}
    }

    const payload = {
      anonymous_id,
      user_id: user?.id || null,
      user_name: user?.full_name || (user?.email ? user.email.split("@")[0] : null),
      institution_id: data.institution_id || null,
      event_type: data.event_type,
      page_url,
      page_name: data.page_name || document.title || "Page View",
      button_name: data.button_name || null,
      keywords: keywords || null,
      referrer: referrer || null,
      device_type: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
      metadata: data.metadata || {},
    };

    // Use sendBeacon if available for non-blocking analytics delivery, else fetch
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon("/api/public/analytics/track", blob);
    } else {
      fetch("/api/public/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch (err) {
    // Non-critical background telemetry
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const lastTrackedUrlRef = useRef<string>("");

  // 1. Track Page View & URL-based Searches on navigation
  useEffect(() => {
    if (typeof window === "undefined") return;

    const fullUrl = window.location.href;
    if (lastTrackedUrlRef.current === fullUrl) return;
    lastTrackedUrlRef.current = fullUrl;

    const queryTerm = searchParams?.get("search") || searchParams?.get("q") || searchParams?.get("query");

    // Track View
    sendAnalyticsEvent({
      event_type: "view",
      page_url: fullUrl,
      page_name: document.title || pathname || "EduBird Portal",
      keywords: queryTerm || undefined,
    });

    // If query parameters are present, also track search event
    if (queryTerm && queryTerm.trim()) {
      sendAnalyticsEvent({
        event_type: "search",
        page_url: fullUrl,
        page_name: document.title || "Search Results",
        keywords: queryTerm.trim(),
      });
    }
  }, [pathname, searchParams]);

  // 2. Global Smart Click Tracking (Buttons, Tabs, Interactive CTAs)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleDocumentClick = (e: MouseEvent) => {
      try {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        // Find nearest button, link with action, or element with data-track
        const button = target.closest<HTMLElement>("button, a[role='button'], [data-track-click]");
        if (!button) return;

        // Skip non-meaningful clicks like dropdown triggers without text or close buttons
        const rawText = button.innerText || button.getAttribute("aria-label") || button.getAttribute("title") || "";
        const buttonName = rawText.trim().replace(/\s+/g, " ").substring(0, 80);

        if (!buttonName) return;

        // Throttle rapid clicks
        sendAnalyticsEvent({
          event_type: "click",
          button_name: buttonName,
          page_url: window.location.href,
          page_name: document.title || "Page View",
        });
      } catch {}
    };

    document.addEventListener("click", handleDocumentClick, { passive: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  return null;
}

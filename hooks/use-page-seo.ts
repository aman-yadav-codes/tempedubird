"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function usePageSeo(customPath?: string) {
  const pathname = usePathname();
  const targetPath = customPath || pathname || "/";

  useEffect(() => {
    let isMounted = true;

    async function applySeo() {
      try {
        const res = await fetch(`/api/public/seo?path=${encodeURIComponent(targetPath)}`);
        if (!res.ok) return;
        const json = await res.json();
        const seo = json.data;
        if (!seo || !isMounted) return;

        // 1. Set Title
        if (seo.meta_title) {
          document.title = seo.meta_title;
        }

        // 2. Helper to set/update meta tag
        const setMeta = (name: string, content: string | null | undefined, isProperty = false) => {
          if (!content) return;
          const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
          let el = document.querySelector(selector);
          if (!el) {
            el = document.createElement("meta");
            if (isProperty) {
              el.setAttribute("property", name);
            } else {
              el.setAttribute("name", name);
            }
            document.head.appendChild(el);
          }
          el.setAttribute("content", content);
        };

        // 3. Set standard meta tags
        setMeta("description", seo.meta_description);
        setMeta("keywords", seo.meta_keywords);
        setMeta("robots", seo.robots || "index, follow");

        // 4. Set Open Graph tags
        setMeta("og:title", seo.og_title || seo.meta_title, true);
        setMeta("og:description", seo.og_description || seo.meta_description, true);
        if (seo.og_image) {
          setMeta("og:image", seo.og_image, true);
        }

        // 5. Set Twitter tags
        setMeta("twitter:card", seo.twitter_card || "summary_large_image");
        setMeta("twitter:title", seo.twitter_title || seo.og_title || seo.meta_title);
        setMeta("twitter:description", seo.twitter_description || seo.og_description || seo.meta_description);
        if (seo.twitter_image || seo.og_image) {
          setMeta("twitter:image", seo.twitter_image || seo.og_image);
        }

        // 6. Set Favicon if customized
        if (seo.favicon_url) {
          let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }
          link.href = seo.favicon_url;
        }
      } catch {
        // Fallback silently if offline or API error
      }
    }

    applySeo();

    return () => {
      isMounted = false;
    };
  }, [targetPath]);
}

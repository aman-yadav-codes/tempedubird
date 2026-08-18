// proxy.ts  (Next.js edge proxy — runs before every request)
// Lightweight first-line-of-defence: blocks /admin/* routes at the edge
// if there is no refresh_token cookie.
//
// The real role check happens in the AdminGuard client component because
// role data lives in localStorage (not in a cookie), so the edge can't
// inspect it. This proxy only catches the "not logged in at all" case
// and redirects immediately — no JS bundle needed.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isKnownRoleRoutePrefix } from "@/lib/auth/role-routes";
import { getAppModeForHost } from "@/lib/deployment/app-mode";

const DEBUG_ENV_VALUES = new Set(["1", "true", "yes", "on"]);
const PUBLIC_TOP_LEVEL_ROUTES = new Set([
    "account-suspended",
    "courses",
    "designations",
    "help",
    "icons",
    "images",
    "institutes",
    "institutions",
    "test",
]);

function isDebuggingEnabled() {
    return DEBUG_ENV_VALUES.has(String(process.env.IS_DEBUGGING ?? process.env.is_debugging ?? process.env.API_PROXY_LOGS ?? "").toLowerCase());
}

function getLoginPath(request: NextRequest) {
    return getAppModeForHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host")) === "institution"
        ? "/institution/login"
        : "/admin/login";
}

async function readProxyPayload(request: NextRequest) {
    if (request.method === "GET" || request.method === "HEAD") return null;

    try {
        const contentType = request.headers.get("content-type") ?? "";
        const clone = request.clone();

        if (contentType.includes("application/json")) return await clone.json();
        if (contentType.includes("multipart/form-data")) return "[multipart/form-data]";

        const text = await clone.text();
        return text.length > 1000 ? `${text.slice(0, 1000)}...` : text;
    } catch (err) {
        return err instanceof Error ? `[payload read failed: ${err.message}]` : "[payload read failed]";
    }
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const segments = pathname.split("/").filter(Boolean);
    const firstSegment = segments[0] ?? "";

    if (pathname.startsWith("/api") && isDebuggingEnabled()) {
        console.log("[api.proxy.request]", {
            method: request.method,
            path: pathname,
            query: Object.fromEntries(request.nextUrl.searchParams.entries()),
            payload: await readProxyPayload(request),
        });
    }

    if (pathname === "/institution/login") {
        return NextResponse.next();
    }

    if (pathname === "/api/admin/access" || pathname.startsWith("/api/admin/access/")) {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = pathname.replace(/^\/api\/admin\/access(?=\/|$)/, "/api/admin/access-control");
        return NextResponse.rewrite(rewriteUrl);
    }

    if (firstSegment === "student") {
        const refreshToken = request.cookies.get("refresh_token");
        if (!refreshToken) {
            return NextResponse.redirect(new URL("/", request.url));
        }
        return NextResponse.next();
    }

    if (firstSegment && isKnownRoleRoutePrefix(firstSegment) && firstSegment !== "admin" && firstSegment !== "student") {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = `/admin${segments.length > 1 ? `/${segments.slice(1).join("/")}` : ""}`;

        if (rewriteUrl.pathname === "/admin/login") {
            return NextResponse.rewrite(rewriteUrl);
        }

        const refreshToken = request.cookies.get("refresh_token");
        if (!refreshToken) {
            return NextResponse.redirect(new URL("/", request.url));
        }

        return NextResponse.rewrite(rewriteUrl);
    }

    if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
        const refreshToken = request.cookies.get("refresh_token");

        if (!refreshToken) {
            return NextResponse.redirect(new URL("/", request.url));
        }
    }

    if (
        firstSegment &&
        firstSegment !== "api" &&
        firstSegment !== "admin" &&
        !firstSegment.startsWith("_next") &&
        !firstSegment.includes(".") &&
        !PUBLIC_TOP_LEVEL_ROUTES.has(firstSegment) &&
        request.cookies.get("refresh_token")
    ) {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = `/admin${segments.length > 1 ? `/${segments.slice(1).join("/")}` : ""}`;
        return NextResponse.rewrite(rewriteUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/api/:path*", "/:portal/:path*"],
};

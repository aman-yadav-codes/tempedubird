import { NextResponse } from "next/server";

type RouteContext = { params?: Promise<Record<string, string | string[]>> };
type ApiHandler = (req: Request, ctx: RouteContext) => Promise<Response> | Response;

const DEBUG_ENV_VALUES = new Set(["1", "true", "yes", "on"]);

export function isApiDebuggingEnabled() {
  return DEBUG_ENV_VALUES.has(String(process.env.IS_DEBUGGING ?? process.env.is_debugging ?? "").toLowerCase());
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

async function readRequestPayload(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return null;
  const contentType = req.headers.get("content-type") ?? "";
  const clone = req.clone();

  try {
    if (contentType.includes("application/json")) {
      return await clone.json();
    }
    if (contentType.includes("multipart/form-data")) {
      const formData = await clone.formData();
      return Array.from(formData.entries()).reduce<Record<string, unknown>>((acc, [key, value]) => {
        acc[key] = value instanceof File
          ? { name: value.name, size: value.size, type: value.type }
          : value;
        return acc;
      }, {});
    }
    const text = await clone.text();
    return text.length > 1000 ? `${text.slice(0, 1000)}...` : text;
  } catch (err) {
    return err instanceof Error ? `[payload read failed: ${err.message}]` : "[payload read failed]";
  }
}

async function readResponsePayload(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";
  const clone = res.clone();

  try {
    if (contentType.includes("application/json")) {
      return await clone.json();
    }
    const text = await clone.text();
    return text.length > 1000 ? `${text.slice(0, 1000)}...` : text;
  } catch (err) {
    return err instanceof Error ? `[response read failed: ${err.message}]` : "[response read failed]";
  }
}

export function withApiDebug(handler: ApiHandler, name?: string): ApiHandler {
  return async (req, ctx) => {
    if (!isApiDebuggingEnabled()) {
      return handler(req, ctx);
    }

    const startedAt = Date.now();
    const url = new URL(req.url);
    const params = ctx.params ? await ctx.params : undefined;
    const requestPayload = await readRequestPayload(req);

    console.log("[api.request]", {
      name,
      method: req.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      params,
      payload: requestPayload,
    });

    try {
      const response = await handler(req, { ...ctx, params: Promise.resolve(params ?? {}) });
      const responsePayload = await readResponsePayload(response);
      console.log("[api.response]", {
        name,
        method: req.method,
        path: url.pathname,
        status: response.status,
        durationMs: Date.now() - startedAt,
        payload: responsePayload,
      });
      return response;
    } catch (err) {
      console.error("[api.error]", {
        name,
        method: req.method,
        path: url.pathname,
        durationMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : safeJson(err),
      });
      throw err;
    }
  };
}

export function apiNotFound(req: Request) {
  const url = new URL(req.url);
  return NextResponse.json(
    {
      error: "API route not found",
      message: `No API endpoint exists for ${req.method} ${url.pathname}. Check the request URL and route file.`,
      path: url.pathname,
      method: req.method,
    },
    { status: 404 }
  );
}

// src/http/router.ts
//
// An HTTP request is just a value entering a pipeline. Routing is a
// `fallback` over route-matcher requestors: each one fails through
// (callback(undefined)) if the method/path don't match, or delegates to
// its handler if they do. This is built on the Fetch API's Request and
// Response so it runs unmodified on Node 18+, Deno, and Bun.

import { fallback } from "../pronto.js";
import type { Requestor } from "../types.js";

export type RouteParams = Record<string, string>;

export interface RouteContext {
    request: Request;
    params: RouteParams;
}

export type RouteHandler = Requestor<RouteContext, Response>;

type Matcher = (pathname: string) => RouteParams | null;

function compilePattern(pattern: string): Matcher {
    const segments = pattern.split("/").filter(Boolean);
    return function match(pathname: string): RouteParams | null {
        const parts = pathname.split("/").filter(Boolean);
        if (parts.length !== segments.length) {
            return null;
        }
        const params: RouteParams = {};
        for (let i = 0; i < segments.length; i += 1) {
            const segment = segments[i];
            const part = parts[i];
            if (segment === undefined || part === undefined) {
                return null;
            }
            if (segment.startsWith(":")) {
                params[segment.slice(1)] = decodeURIComponent(part);
            } else if (segment !== part) {
                return null;
            }
        }
        return params;
    };
}

/**
 * Build a requestor that matches one HTTP method + path pattern (supports
 * `:param` segments) and delegates to `handler` on a match. On a mismatch
 * it fails through, so it composes with other routes via `router()`.
 */
export function route(
    method: string,
    pattern: string,
    handler: RouteHandler
): Requestor<Request, Response> {
    const matcher = compilePattern(pattern);
    const expectedMethod = method.toUpperCase();
    return function route_requestor(callback, request: Request) {
        if (request.method.toUpperCase() !== expectedMethod) {
            callback(undefined, "method_mismatch");
            return;
        }
        const { pathname } = new URL(request.url);
        const params = matcher(pathname);
        if (params === null) {
            callback(undefined, "path_mismatch");
            return;
        }
        return handler(callback, { request, params });
    };
}

/**
 * Combine routes into a single application requestor. Internally this is
 * `pronto.fallback` — routes are tried in order, and the first match wins.
 */
export function router(
    routes: ReadonlyArray<Requestor<Request, Response>>
): Requestor<Request, Response> {
    return fallback(routes);
}

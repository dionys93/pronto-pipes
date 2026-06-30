import type { Requestor } from "../types.js";
export type RouteParams = Record<string, string>;
export interface RouteContext {
    request: Request;
    params: RouteParams;
}
export type RouteHandler = Requestor<RouteContext, Response>;
/**
 * Build a requestor that matches one HTTP method + path pattern (supports
 * `:param` segments) and delegates to `handler` on a match. On a mismatch
 * it fails through, so it composes with other routes via `router()`.
 */
export declare function route(method: string, pattern: string, handler: RouteHandler): Requestor<Request, Response>;
/**
 * Combine routes into a single application requestor. Internally this is
 * `pronto.fallback` — routes are tried in order, and the first match wins.
 */
export declare function router(routes: ReadonlyArray<Requestor<Request, Response>>): Requestor<Request, Response>;

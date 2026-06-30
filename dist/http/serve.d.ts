import type { Requestor } from "../types.js";
export type FetchHandler = (request: Request) => Promise<Response>;
/** Adapt an app requestor into a standard fetch-style handler function. */
export declare function toFetchHandler(app: Requestor<Request, Response>): FetchHandler;
export interface ServeOptions {
    port?: number;
    hostname?: string;
}
/**
 * Minimal Node.js HTTP listener for an app requestor, using node:http
 * underneath but speaking Request/Response at the boundary. This is
 * intentionally small — swap it for your own adapter (or a real HTTP
 * library) if you need streaming bodies, HTTP/2, etc.
 */
export declare function serveNode(app: Requestor<Request, Response>, options?: ServeOptions): Promise<{
    close: () => void;
}>;

// src/http/serve.ts
//
// `toFetchHandler` turns an app requestor (Requestor<Request, Response>)
// into a standard `(request: Request) => Promise<Response>` function — the
// same shape Deno.serve(), Bun.serve({ fetch }), and most edge runtimes
// expect natively. No adapter is needed for those runtimes; pass the
// result of toFetchHandler straight in.
//
// `serveNode` is the one Node-specific piece, since plain Node.js doesn't
// speak the fetch-handler shape natively. It lazily imports node:http so
// this file has no effect on non-Node runtimes that never call it.
/** Adapt an app requestor into a standard fetch-style handler function. */
export function toFetchHandler(app) {
    return function handle(request) {
        return new Promise(function (resolve) {
            app(function callback(value, reason) {
                if (value !== undefined) {
                    resolve(value);
                }
                else {
                    // eslint-disable-next-line no-console
                    console.error("pronto-pipes: unhandled failure", reason);
                    resolve(new Response("Internal Server Error", { status: 500 }));
                }
            }, request);
        });
    };
}
/**
 * Minimal Node.js HTTP listener for an app requestor, using node:http
 * underneath but speaking Request/Response at the boundary. This is
 * intentionally small — swap it for your own adapter (or a real HTTP
 * library) if you need streaming bodies, HTTP/2, etc.
 */
export async function serveNode(app, options = {}) {
    const { createServer } = await import("node:http");
    const handler = toFetchHandler(app);
    const port = options.port ?? 3000;
    const hostname = options.hostname ?? "localhost";
    const server = createServer(function (nodeRequest, nodeResponse) {
        const url = `http://${nodeRequest.headers.host ?? hostname}${nodeRequest.url}`;
        const hasBody = nodeRequest.method !== "GET" && nodeRequest.method !== "HEAD";
        const requestInit = {
            method: nodeRequest.method,
            headers: nodeRequest.headers,
            body: hasBody ? nodeRequest : undefined,
            // Node's fetch implementation requires this when streaming a
            // request body from a Node.js readable stream.
            duplex: hasBody ? "half" : undefined
        };
        const request = new Request(url, requestInit);
        handler(request)
            .then(async function (response) {
            nodeResponse.writeHead(response.status, Object.fromEntries(response.headers));
            if (response.body) {
                const bytes = new Uint8Array(await response.arrayBuffer());
                nodeResponse.end(bytes);
            }
            else {
                nodeResponse.end();
            }
        })
            .catch(function (exception) {
            // eslint-disable-next-line no-console
            console.error("pronto-pipes: serveNode failure", exception);
            nodeResponse.writeHead(500);
            nodeResponse.end("Internal Server Error");
        });
    });
    await new Promise(function (resolve) {
        server.listen(port, hostname, resolve);
    });
    return {
        close() {
            server.close();
        }
    };
}

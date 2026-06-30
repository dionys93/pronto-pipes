// examples/http-example.ts
//
// Run with: npm run example:http
// Then visit: http://localhost:3000/hello?name=Ada
//             http://localhost:3000/users/42

import { pipeline, step } from "../src/pipeline.js";
import { route, router } from "../src/http/router.js";
import { serveNode } from "../src/http/serve.js";
import type { RouteContext } from "../src/http/router.js";

// --- /hello?name=... --------------------------------------------------

interface Greeting {
    name: string;
}

const readName = step(
    (ctx: RouteContext): Greeting => ({
        name: new URL(ctx.request.url).searchParams.get("name") ?? "world"
    })
);

const renderGreeting = step(
    (greeting: Greeting): Response =>
        new Response(`Hello, ${greeting.name}!`, {
            headers: { "content-type": "text/plain" }
        })
);

const helloHandler = pipeline<RouteContext>()
    .pipe(readName)
    .pipe(renderGreeting)
    .build();

// --- /users/:id ---------------------------------------------------------

const renderUser = step(
    (ctx: RouteContext): Response =>
        Response.json({ id: ctx.params.id, params: ctx.params })
);

const userHandler = pipeline<RouteContext>().pipe(renderUser).build();

// --- assemble the app ----------------------------------------------------

const app = router([
    route("GET", "/hello", helloHandler),
    route("GET", "/users/:id", userHandler)
]);

const { close } = await serveNode(app, { port: 3000 });
console.log("pronto-pipes example listening on http://localhost:3000");
console.log("  GET /hello?name=Ada");
console.log("  GET /users/42");
console.log("Press Ctrl+C to stop.");

process.on("SIGINT", () => {
    close();
    process.exit(0);
});

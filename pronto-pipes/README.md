# pronto-pipes

A function-oriented server framework and data-pipeline toolkit, built directly
on top of Douglas Crockford's [pronto.js](https://www.crockford.com/pronto.html)
requestor model — with TypeScript generics layered on so pipeline stages are
checked end to end.

No classes, no `this`, no shared mutable state. Everything is a function that
takes a value and reports a result through a callback.

## Why pronto.js

Pronto already gives you the four primitives a pipeline needs:

- **`sequence`** — pronto's native pipe operator. Runs stages one at a time,
  threading each result into the next stage's input.
- **`fallback`** — runs stages in order until one succeeds; useful for
  routing ("try this route, then this one, then this one").
- **`parallel`** / **`race`** — fan-out/fan-in and first-to-finish.
- **`requestorize`** — lifts a plain function into a requestor.

This project doesn't reimplement any of that. `vendor/pronto.js` is
Crockford's runtime, vendored verbatim (it's public domain). `src/pronto.ts`
wraps each factory with `Requestor<I, O>` generics; `src/pipeline.ts` adds an
ergonomic, incrementally-typed `.pipe()` builder on top; `src/http/` applies
the same model to HTTP requests.

## Project layout

```
vendor/pronto.js       Crockford's runtime, unmodified
vendor/pronto.d.ts      loose ambient types so TS can resolve the import

src/types.ts            Requestor<I,O>, Callback<O>, Cancel — the core vocabulary
src/result.ts            Result<T> + ok/err/NONE — for explicit success/failure
src/pronto.ts            typed wrappers over the vendored factories
src/pipeline.ts          pipeline()/step()/asyncStep()/resultStep() — the main API
src/http/router.ts        route()/router() — HTTP routing via fallback
src/http/serve.ts          toFetchHandler()/serveNode() — runtime adapters
src/index.ts              barrel export

examples/http-example.ts  a small routed HTTP app
examples/etl-example.ts    a small CSV -> summary data pipeline
test/pipeline.test.ts      tests for the pipeline core
```

## Quick start

```bash
npm install
npm run typecheck
npm test
npm run example:http   # http://localhost:3000/hello?name=Ada
npm run example:etl
```

> This sandbox has no network access, so the project was developed and
> verified here using globally available `typescript`/`tsx`. On your own
> machine, `npm install` will pull in real `typescript`, `tsx`, and
> `@types/node` per `package.json`. Once `@types/node` is installed, you can
> delete `src/http/node-shims.d.ts` — it's a minimal stand-in for the precise
> Node types, used only because this environment couldn't fetch the real
> package.

## Writing a pipeline

```ts
import { pipeline, step, asyncStep } from "pronto-pipes";

const parse = step((raw: string) => JSON.parse(raw) as { age: string });
const toNumber = step((row: { age: string }) => Number(row.age));
const fetchProfile = asyncStep((age: number) => lookupProfile(age));

const handler = pipeline<string>()
    .pipe(parse)
    .pipe(toNumber)
    .pipe(fetchProfile)
    .build(); // a plain Requestor<string, Profile>

handler((profile, reason) => {
    if (profile !== undefined) {
        console.log(profile);
    } else {
        console.error("pipeline failed:", reason);
    }
}, rawJsonString);
```

Each `.pipe(stage)` call checks that the new stage's input type matches the
running pipeline's output type, and narrows the pipeline's output type to the
new stage's output. `.build()` hands the assembled stages to pronto's real
`sequence` — at runtime this *is* a sequence, nothing more.

- `step(fn)` — lift a sync function. Thrown exceptions become failures.
- `asyncStep(fn)` — lift an `async`/Promise-returning function.
- `resultStep(fn)` / `asyncResultStep(fn)` — lift a function that returns an
  explicit `Result<T>` (`ok(value)` / `err(reason)`), for stages where
  success/failure is a decision rather than something to infer from a throw.

## Writing an HTTP app

```ts
import { pipeline, step, route, router, serveNode } from "pronto-pipes";
import type { RouteContext } from "pronto-pipes";

const greet = step((ctx: RouteContext) =>
    new Response(`Hello, ${ctx.params.name}!`)
);

const app = router([
    route("GET", "/hello/:name", pipeline<RouteContext>().pipe(greet).build())
]);

await serveNode(app, { port: 3000 });
```

`router()` is `pronto.fallback` under the hood: routes are tried in order,
and the first whose method + path matches wins. An unmatched request falls
all the way through and reports failure — register a catch-all route last if
you want a typed 404 instead of the default 500.

The core (`Request`/`Response`-based) is runtime-agnostic. `serveNode` is a
small Node-specific listener; on Deno or Bun, pass `toFetchHandler(app)`
straight to `Deno.serve()` or `Bun.serve({ fetch })` — no adapter needed.

## A sharp edge in pronto itself (and how this library smooths it over)

Pronto's internal `run()` (used by `fallback`/`parallel`/`race`/`sequence`)
checks that the callback you hand it was *declared* with exactly two named
parameters: `callback.length !== 2` throws. That's surprising, because a very
common JS/TS idiom is a one-argument callback that ignores `reason`:

```ts
requestor((value) => { ... }, input); // throws under raw pronto.js!
```

`src/pronto.ts` normalizes every callback at the boundary before handing it
to the vendored runtime, so the line above works fine through this library
regardless of how you wrote your callback. See `test/pipeline.test.ts` for a
regression test of this. (If you ever drop down to calling
`vendor/pronto.js` directly, the raw arity check still applies there.)

## The `undefined`-means-failure convention

Pronto's wire protocol is: `value === undefined` on a callback means failure,
anything else means success. That's fine until a stage legitimately wants
"no value" to be a *successful* result. `src/result.ts` exports a `NONE`
sentinel for exactly that case — use it instead of a literal `undefined` as a
stage's success value, and unwrap it back to whatever your application needs
at the boundary. This is a property of pronto's own protocol, not something
a wrapper layer can fully erase — see the comments in `result.ts` for the
specifics.

## License

MIT for everything in `src/`, `examples/`, and `test/`. `vendor/pronto.js` is
Douglas Crockford's work, in the Public Domain.

# pronto-pipes — Roadmap

This project has two goals at once: become a solid, reusable framework, and
be a deliberate refresher on server fundamentals — headers, status codes,
content negotiation, request bodies in their various shapes — all expressed
as composable requestors. Every phase below is meant to be built as one or
more pipeline stages (`step`, `asyncStep`, `resultStep`) or pronto factories
(`fallback`, `parallel`, `race`, `time_limit`), never as a class or a framework
"plugin system." If a feature can't be expressed as a function that takes a
value and reports a result, that's a sign to rethink it, not to make an
exception.

Each phase lists what to build, which pronto/pipeline primitive it's a
natural fit for, and the HTTP concepts it's meant to exercise. Work through
them roughly in order — later phases lean on earlier ones — but feel free to
skip around toward whatever you're rustiest on.

## Where things stand

- Typed wrappers over vendored `pronto.js` (`fallback`, `parallel`, `race`,
  `sequence`, `time_limit`, `requestorize`, `objectify`)
- A fluent `pipeline().pipe().build()` builder with incremental type inference
- `step` / `asyncStep` / `resultStep` / `asyncResultStep` for lifting plain
  functions into requestors
- Path-based routing (`route`, `router`) built on `fallback`
- A Node listener (`serveNode`) and a runtime-agnostic `toFetchHandler`
- One ETL example, one HTTP example, a small test suite

Nothing here yet reads a request body, looks at a header, or returns
anything other than a 200 or a generic 500. That's the gap this roadmap
fills.

## Phase 1 — Request bodies as data transforms

The core idea: a request body is just another pipeline input waiting to be
parsed, validated, and transformed — the same shape as the ETL example, just
fed by an HTTP request instead of a file.

- [ ] `parseJson` stage — `request.json()` wrapped in `asyncStep`, with a
      typed failure for malformed JSON
- [ ] `parseUrlEncoded` stage — parse `application/x-www-form-urlencoded`
      bodies into a plain object
- [ ] `parseMultipart` stage — handle `multipart/form-data`, including file
      fields (this is the meatiest one; budget real time for it)
- [ ] `parseText` / `parseRawBytes` stages for the fallback case
- [ ] A `parseBody` dispatcher that reads `Content-Type` and picks the right
      parser via `fallback` — content-type-driven branching is a great
      real use of pronto's fall-through semantics
- [ ] Body size limits — fail fast (typed error) on oversized payloads
      before fully buffering them
- [ ] Validation as a separate stage from parsing (parse first, validate
      second — keep them composable and independently testable)

**Concepts to refresh:** the difference between parsing and validation,
streaming vs. buffered body reads, why `multipart/form-data` exists instead
of just using JSON for file uploads.

## Phase 2 — Headers, in depth

Headers are where a lot of "real server" knowledge lives and where toy
frameworks usually cut corners. Treat each of these as its own small stage
or a `RouteContext` enrichment step.

- [ ] **Request headers worth handling deliberately:** `Accept`,
      `Accept-Encoding`, `Accept-Language`, `Authorization`, `Cookie`,
      `If-None-Match`, `If-Modified-Since`, `Content-Type`, `Content-Length`
- [ ] **Content negotiation** — pick a response representation based on
      `Accept` (e.g. JSON vs. plain text vs. `application/problem+json`
      for errors). A natural `fallback` over "can I satisfy this Accept
      header" requestors.
- [ ] **Conditional requests** — implement `ETag` generation and honor
      `If-None-Match` to return `304 Not Modified`. Do the same for
      `Last-Modified` / `If-Modified-Since`.
- [ ] **Caching headers** — `Cache-Control`, `Vary`, and understanding when
      each applies (static asset vs. API response vs. user-specific data)
- [ ] **Compression** — honor `Accept-Encoding`, set `Content-Encoding`,
      and understand why `Vary: Accept-Encoding` matters once you do
- [ ] **CORS headers** — `Access-Control-Allow-Origin` and friends, plus
      handling the `OPTIONS` preflight request as its own route
- [ ] **Security headers** — `X-Content-Type-Options`,
      `Content-Security-Policy`, `Strict-Transport-Security`: know what
      each does even if you only set a couple by default
- [ ] **Custom headers** — propagate a `X-Request-Id` (generate if absent)
      through the pipeline and into logs

**Concepts to refresh:** what makes a header "simple" vs. requiring a CORS
preflight, weak vs. strong ETags, the actual semantics difference between
`Cache-Control: no-cache` and `no-store`.

## Phase 3 — Status codes and typed errors

Right now failure means "log it and return 500." Real APIs need a richer,
typed vocabulary for failure that still fits the `Result<T>` / `resultStep`
pattern already in the library.

- [ ] An `HttpError` type (status + machine-readable code + message) that
      `resultStep`/`asyncResultStep` failures can carry as their `reason`
- [ ] A response-rendering stage that turns an `HttpError` reason into a
      properly-coded `Response` (400, 401, 403, 404, 409, 422, 429, 500...)
      — and know *why* each of those status codes exists, not just that
      they're available
- [ ] `application/problem+json` (RFC 7807-style) error bodies as one
      content-negotiated representation from Phase 2
- [ ] Redirects (301/302/307/308) as a stage's normal success output, not
      a special case — a `Response` is a `Response`
- [ ] A consistent "every route either returns a `Response` or fails with
      an `HttpError`" contract, enforced by the types

**Concepts to refresh:** when 400 vs. 422 is more correct, why 301 vs. 308
(and 302 vs. 307) differ in whether clients are allowed to change the
request method on redirect.

## Phase 4 — Cross-cutting concerns as composable stages

The "middleware" instinct from other frameworks doesn't disappear here — it
just becomes ordinary requestor composition instead of a separate concept.

- [ ] A logging/timing stage that wraps a route (start time in, log line
      out) — written once, applied by wrapping any `RouteHandler`
- [ ] Auth as a `resultStep`: validate a bearer token or basic-auth header,
      fail with a typed 401, attach the authenticated identity to the
      context on success
- [ ] Rate limiting — a small in-memory token-bucket stage; useful for
      seeing `time_limit` and stateful-but-still-functional design (state
      held in a closure, not a class)
- [ ] Cookie parsing/setting, including a signed-cookie helper (HMAC) for
      simple session tokens
- [ ] A "wrap every route in X" helper (logging, auth, CORS) so cross-
      cutting stages don't have to be manually `.pipe()`-ed into every
      single handler

**Concepts to refresh:** stateless vs. stateful auth (JWT vs. session
cookie), why rate limiting usually lives at the edge in production but is
still worth understanding from first principles.

## Phase 5 — Pipeline composition at application scale

This is where `parallel`, `race`, and `time_limit` earn their keep beyond
toy examples — the parts of pronto that are easy to skip past until you have
a reason to need them.

- [ ] A fan-out aggregation route: call two or three "upstream" sources
      concurrently with `parallel` (or `objectify(parallel)` for named
      results) and combine them into one response
- [ ] Per-route timeouts via `time_limit`, with a typed timeout error that
      renders as `504 Gateway Timeout` (or `408`, and know the difference)
- [ ] Retry-with-fallback against a flaky simulated upstream — `fallback`
      over "the same call, several times" or "primary then backup source"
- [ ] `race` for "ask two redundant sources, use whichever answers first"
- [ ] A worked comparison in the README of `parallel` vs `race` vs
      `fallback` for the same problem, so the tradeoffs are written down
      somewhere instead of re-derived later

## Phase 6 — Streaming and long-lived connections (stretch)

Optional, and the part most likely to push past what pronto's
callback-once model comfortably expresses — good for understanding *why*
that's true, even if you don't fully build it out.

- [ ] Streamed response bodies (e.g. a large file or generated CSV) instead
      of buffering the whole thing
- [ ] Server-Sent Events for a simple live-updating endpoint
- [ ] A short write-up on why WebSockets don't fit a "single callback, once"
      requestor cleanly, and what a streaming-friendly requestor variant
      would need to look like

## Phase 7 — Observability, testing, robustness

- [ ] Structured (JSON) logging stage, request-id correlated
- [ ] Graceful shutdown for `serveNode` — stop accepting new connections,
      let in-flight requests finish, then close
- [ ] Integration tests that spin up `serveNode` on an ephemeral port and
      hit real routes with `fetch`, not just unit tests of individual
      stages
- [ ] A smoke-test script exercising every phase's example route in one run

## Phase 8 — Polish (optional)

- [ ] Light schema validation integration (hand-rolled or a small library)
      plugged in via `resultStep`
- [ ] A self-describing route registry that can generate a minimal
      OpenAPI-ish document from the registered routes
- [ ] One combined "mini API" example app that uses a piece of every prior
      phase, as the project's flagship demo

## How to use this

Pick one unchecked item, build it as a stage or two under `src/http/` (or a
new `src/http/*.ts` module if it's substantial, like body parsing), write a
focused test, and check it off. Most items are deliberately scoped to be a
single sitting's work. When a phase starts feeling repetitive, that's
usually the signal you've actually absorbed the underlying concept and it's
time to move to the next one.

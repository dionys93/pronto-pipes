// src/http/node-shims.d.ts
//
// This project has zero runtime dependencies by design — vendor/pronto.js
// is the only "dependency", and it's vendored in. The Node-specific glue in
// serve.ts (and the ETL example) is optional and isolated; it's the only
// code that touches `node:*` built-ins.
//
// Normally that glue would be typed precisely via `@types/node`. These
// ambient declarations are a stand-in for that — delete this file and
// run `npm install -D @types/node` to get full, precise Node types instead.

declare module "node:http" {
    export const createServer: any;
}

declare module "node:fs/promises" {
    export const readFile: any;
}

declare module "node:assert/strict" {
    const assert: any;
    export default assert;
}

declare module "node:test" {
    const test: any;
    export default test;
}

// The global Node.js process object.
declare const process: any;

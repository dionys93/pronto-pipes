// Loose ambient types for the vendored pronto.js runtime.
//
// This file is intentionally untyped (uses `Function`). It exists only
// so TypeScript's NodeNext resolution can find *some* declaration for
// "../vendor/pronto.js" (it looks for a sibling .d.ts with a matching name).
//
// The real, generic-aware types that application code should use live in
// src/pronto.ts, which wraps these loose declarations with proper
// Requestor<I, O> generics. Nothing outside src/pronto.ts should import
// this module directly.

interface ProntoRuntime {
    fallback(requestor_array: Function[]): Function;
    parallel(requestor_array: Function[], throttle?: number, need?: number): Function;
    race(requestor_array: Function[], throttle?: number, need?: number): Function;
    sequence(requestor_array: Function[]): Function;
    time_limit(requestor: Function, milliseconds: number): Function;
    requestorize(unary: Function): Function;
    objectify(factory: Function): Function;
}

declare const prontoRuntime: ProntoRuntime;
export default prontoRuntime;

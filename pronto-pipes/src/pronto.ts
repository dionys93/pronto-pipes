// src/pronto.ts
//
// Thin, generic-aware wrappers around the vendored pronto.js runtime
// (vendor/pronto.js, unmodified). Nothing here changes pronto's runtime
// behavior — every function here is a direct pass-through to Crockford's
// actual factory functions. This module exists purely to attach
// Requestor<I, O> types that the untyped runtime can't express on its own.

import prontoRuntime from "../vendor/pronto.js";
import type { AnyRequestor, Callback, Requestor } from "./types.js";

// Pronto's internal `run()` (used by fallback/parallel/race/sequence) checks
// that the callback it's handed was *declared* with exactly two named
// parameters (`callback.length === 2`) — a defensive sanity check on
// Crockford's part. The trouble is that idiomatic JS/TS often writes
// single-argument callbacks like `(value) => ...` when the failure reason
// isn't needed, and `Function.prototype.length` doesn't count unused
// trailing parameters. That perfectly normal style trips Pronto's check
// and throws "Not a callback function."
//
// Rather than make every caller of this library remember to always write
// out `(value, reason) => ...`, we normalize at the boundary: every
// requestor this module returns wraps whatever callback it's given in a
// function that's *always* arity 2, regardless of how the caller wrote
// theirs.
function arity2<O>(callback: Callback<O>): Callback<O> {
    return function normalized_callback(value, reason) {
        callback(value, reason);
    };
}

/**
 * Runs requestors in order until one succeeds, falling through on failure.
 * Fails only if every requestor fails.
 */
export function fallback<I, O>(
    requestorArray: ReadonlyArray<Requestor<I, O>>
): Requestor<I, O> {
    const requestor = prontoRuntime.fallback(requestorArray as AnyRequestor[]) as Requestor<I, O>;
    return function fallback_entry(callback, value) {
        return requestor(arity2(callback), value);
    };
}

/**
 * Runs requestors concurrently, collecting all results.
 *
 * The result array is dense only when every requestor succeeds. If `need`
 * is given and is less than `requestorArray.length`, positions belonging
 * to requestors that did not finish in time are left `undefined` — hence
 * the `O | undefined` element type below.
 */
export function parallel<I, O>(
    requestorArray: ReadonlyArray<Requestor<I, O>>,
    throttle?: number,
    need?: number
): Requestor<I, Array<O | undefined>> {
    const requestor = prontoRuntime.parallel(
        requestorArray as AnyRequestor[],
        throttle,
        need
    ) as Requestor<I, Array<O | undefined>>;
    return function parallel_entry(callback, value) {
        return requestor(arity2(callback), value);
    };
}

/**
 * Starts requestors concurrently; succeeds with the first to finish
 * successfully and cancels the rest.
 *
 * Note: if you pass a `need` greater than 1, pronto.race returns an array
 * of results instead of a single value. That overload isn't represented
 * here to keep the common case (`need` omitted, single winner) simple —
 * call `prontoRuntime.race` directly via a local `as` cast if you need it.
 */
export function race<I, O>(
    requestorArray: ReadonlyArray<Requestor<I, O>>,
    throttle?: number
): Requestor<I, O> {
    const requestor = prontoRuntime.race(requestorArray as AnyRequestor[], throttle) as Requestor<I, O>;
    return function race_entry(callback, value) {
        return requestor(arity2(callback), value);
    };
}

/**
 * Runs requestors one at a time, threading each result into the next
 * requestor as its input. This is pronto's native pipe operator — see
 * `pipeline()` in src/pipeline.ts for a more ergonomic, incrementally
 * typed way to build these.
 */
export function sequence<I, O>(
    requestorArray: ReadonlyArray<AnyRequestor>
): Requestor<I, O> {
    const requestor = prontoRuntime.sequence(requestorArray as AnyRequestor[]) as Requestor<I, O>;
    return function sequence_entry(callback, value) {
        return requestor(arity2(callback), value);
    };
}

/** Wraps a requestor so it cancels itself if it hasn't finished in time. */
export function time_limit<I, O>(
    requestor: Requestor<I, O>,
    milliseconds: number
): Requestor<I, O> {
    return prontoRuntime.time_limit(requestor, milliseconds) as Requestor<I, O>;
}

/**
 * Lifts a plain synchronous unary function into a requestor. If the
 * function throws, the requestor reports failure with the thrown value
 * (or the function's name) as the reason.
 */
export function requestorize<I, O>(unary: (value: I) => O): Requestor<I, O> {
    return prontoRuntime.requestorize(unary) as Requestor<I, O>;
}

/**
 * Turns a factory that takes a requestor array (e.g. `parallel`, `race`)
 * into a factory that takes a named object of requestors, delivering a
 * named object of results instead of a positional array.
 */
export function objectify<I, O extends Record<string, unknown>>(
    factory: (requestorArray: AnyRequestor[], ...rest: any[]) => AnyRequestor
): (objectOfRequestors: { [K in keyof O]: Requestor<I, O[K]> }, ...rest: any[]) => Requestor<I, O> {
    return prontoRuntime.objectify(factory) as any;
}

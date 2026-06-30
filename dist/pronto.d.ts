import type { AnyRequestor, Requestor } from "./types.js";
/**
 * Runs requestors in order until one succeeds, falling through on failure.
 * Fails only if every requestor fails.
 */
export declare function fallback<I, O>(requestorArray: ReadonlyArray<Requestor<I, O>>): Requestor<I, O>;
/**
 * Runs requestors concurrently, collecting all results.
 *
 * The result array is dense only when every requestor succeeds. If `need`
 * is given and is less than `requestorArray.length`, positions belonging
 * to requestors that did not finish in time are left `undefined` — hence
 * the `O | undefined` element type below.
 */
export declare function parallel<I, O>(requestorArray: ReadonlyArray<Requestor<I, O>>, throttle?: number, need?: number): Requestor<I, Array<O | undefined>>;
/**
 * Starts requestors concurrently; succeeds with the first to finish
 * successfully and cancels the rest.
 *
 * Note: if you pass a `need` greater than 1, pronto.race returns an array
 * of results instead of a single value. That overload isn't represented
 * here to keep the common case (`need` omitted, single winner) simple —
 * call `prontoRuntime.race` directly via a local `as` cast if you need it.
 */
export declare function race<I, O>(requestorArray: ReadonlyArray<Requestor<I, O>>, throttle?: number): Requestor<I, O>;
/**
 * Runs requestors one at a time, threading each result into the next
 * requestor as its input. This is pronto's native pipe operator — see
 * `pipeline()` in src/pipeline.ts for a more ergonomic, incrementally
 * typed way to build these.
 */
export declare function sequence<I, O>(requestorArray: ReadonlyArray<AnyRequestor>): Requestor<I, O>;
/** Wraps a requestor so it cancels itself if it hasn't finished in time. */
export declare function time_limit<I, O>(requestor: Requestor<I, O>, milliseconds: number): Requestor<I, O>;
/**
 * Lifts a plain synchronous unary function into a requestor. If the
 * function throws, the requestor reports failure with the thrown value
 * (or the function's name) as the reason.
 */
export declare function requestorize<I, O>(unary: (value: I) => O): Requestor<I, O>;
/**
 * Turns a factory that takes a requestor array (e.g. `parallel`, `race`)
 * into a factory that takes a named object of requestors, delivering a
 * named object of results instead of a positional array.
 */
export declare function objectify<I, O extends Record<string, unknown>>(factory: (requestorArray: AnyRequestor[], ...rest: any[]) => AnyRequestor): (objectOfRequestors: {
    [K in keyof O]: Requestor<I, O[K]>;
}, ...rest: any[]) => Requestor<I, O>;

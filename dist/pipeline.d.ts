import type { Requestor } from "./types.js";
import type { Result } from "./result.js";
export declare class Pipeline<I, O> {
    private readonly stages;
    private constructor();
    /** @internal use `pipeline()` instead. */
    static start<T>(): Pipeline<T, T>;
    /** Append a stage. The new pipeline's output type becomes `N`. */
    pipe<N>(stage: Requestor<O, N>): Pipeline<I, N>;
    /** Assemble the stages into a single requestor via pronto.sequence. */
    build(): Requestor<I, O>;
}
/** Start building a typed pipeline. `I` is the type the pipeline accepts. */
export declare function pipeline<I = unknown>(): Pipeline<I, I>;
/**
 * Lift a plain, synchronous, pure-ish unary function into a requestor.
 * If `fn` throws, the requestor reports failure with the thrown value as
 * the reason. This is `pronto.requestorize`, typed.
 */
export declare function step<I, O>(fn: (value: I) => O): Requestor<I, O>;
/**
 * Lift an async function (or anything returning a Promise) into a
 * requestor. Rejections become failures with the rejection reason. The
 * returned requestor supports cancellation in the advisory Pronto sense:
 * calling cancel stops the requestor from reporting a result, but it does
 * not abort the underlying promise.
 */
export declare function asyncStep<I, O>(fn: (value: I) => Promise<O>): Requestor<I, O>;
/**
 * Lift a synchronous function that returns an explicit `Result<O>` into a
 * requestor, for stages where success/failure should be decided by the
 * stage author rather than inferred from a thrown exception.
 *
 * See src/result.ts for the one sharp edge: `ok(undefined)` still reads as
 * failure once unwrapped onto Pronto's callback. Use the `NONE` sentinel
 * for an intentionally empty success value.
 */
export declare function resultStep<I, O>(fn: (value: I) => Result<O>): Requestor<I, O>;
/** The async counterpart of {@link resultStep}. */
export declare function asyncResultStep<I, O>(fn: (value: I) => Promise<Result<O>>): Requestor<I, O>;

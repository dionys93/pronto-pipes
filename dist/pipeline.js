// src/pipeline.ts
//
// The ergonomic surface of this library. `pipeline<I>()` starts a chain;
// each `.pipe(stage)` call narrows the output type and checks it against
// the next stage's input type, the same incremental-inference pattern used
// by RxJS/zod-style fluent builders. `.build()` hands the assembled stages
// to pronto's real `sequence` factory — at runtime this *is* a sequence,
// nothing more.
import { requestorize, sequence } from "./pronto.js";
export class Pipeline {
    stages;
    constructor(stages) {
        this.stages = stages;
    }
    /** @internal use `pipeline()` instead. */
    static start() {
        return new Pipeline([]);
    }
    /** Append a stage. The new pipeline's output type becomes `N`. */
    pipe(stage) {
        return new Pipeline([...this.stages, stage]);
    }
    /** Assemble the stages into a single requestor via pronto.sequence. */
    build() {
        return sequence(this.stages);
    }
}
/** Start building a typed pipeline. `I` is the type the pipeline accepts. */
export function pipeline() {
    return Pipeline.start();
}
/**
 * Lift a plain, synchronous, pure-ish unary function into a requestor.
 * If `fn` throws, the requestor reports failure with the thrown value as
 * the reason. This is `pronto.requestorize`, typed.
 */
export function step(fn) {
    return requestorize(fn);
}
/**
 * Lift an async function (or anything returning a Promise) into a
 * requestor. Rejections become failures with the rejection reason. The
 * returned requestor supports cancellation in the advisory Pronto sense:
 * calling cancel stops the requestor from reporting a result, but it does
 * not abort the underlying promise.
 */
export function asyncStep(fn) {
    return function async_step_requestor(callback, value) {
        let settled = false;
        fn(value).then(function (result) {
            if (!settled) {
                settled = true;
                callback(result);
            }
        }, function (reason) {
            if (!settled) {
                settled = true;
                callback(undefined, reason);
            }
        });
        return function cancel() {
            settled = true;
        };
    };
}
/**
 * Lift a synchronous function that returns an explicit `Result<O>` into a
 * requestor, for stages where success/failure should be decided by the
 * stage author rather than inferred from a thrown exception.
 *
 * See src/result.ts for the one sharp edge: `ok(undefined)` still reads as
 * failure once unwrapped onto Pronto's callback. Use the `NONE` sentinel
 * for an intentionally empty success value.
 */
export function resultStep(fn) {
    return function result_step_requestor(callback, value) {
        let result;
        try {
            result = fn(value);
        }
        catch (exception) {
            callback(undefined, exception);
            return;
        }
        if (result.ok) {
            callback(result.value);
        }
        else {
            callback(undefined, result.reason);
        }
    };
}
/** The async counterpart of {@link resultStep}. */
export function asyncResultStep(fn) {
    return function async_result_step_requestor(callback, value) {
        let settled = false;
        fn(value).then(function (result) {
            if (settled) {
                return;
            }
            settled = true;
            if (result.ok) {
                callback(result.value);
            }
            else {
                callback(undefined, result.reason);
            }
        }, function (reason) {
            if (!settled) {
                settled = true;
                callback(undefined, reason);
            }
        });
        return function cancel() {
            settled = true;
        };
    };
}

// src/result.ts
//
// Pronto's wire convention is simple and a little blunt: on a callback,
// `value === undefined` means failure, anything else means success. That's
// fine until a pipeline stage legitimately wants to produce "no value" as a
// *successful* result (e.g. "no rows matched", "field was absent"). Boxing
// stage outputs as a `Result<T>` makes success/failure explicit in your own
// code; the `NONE` sentinel lets you carry an intentional "empty" value
// through a stage without it colliding with Pronto's failure signal.
//
// Note the limit honestly: at the point a `Result` is unwrapped back into a
// raw Pronto callback (see `resultStep` below), an `ok(undefined)` result
// still becomes `callback(undefined)`, which Pronto reads as failure. That
// is a property of Pronto's wire protocol itself, not something this layer
// can paper over. If a stage's success value might legitimately be absent,
// represent that with `NONE` instead of `undefined`.

export type Result<T> =
    | { ok: true, value: T }
    | { ok: false, reason: unknown };

export function ok<T>(value: T): Result<T> {
    return { ok: true, value };
}

export function err(reason: unknown): Result<never> {
    return { ok: false, reason };
}

export function isOk<T>(result: Result<T>): result is { ok: true, value: T } {
    return result.ok === true;
}

export function isErr<T>(result: Result<T>): result is { ok: false, reason: unknown } {
    return result.ok === false;
}

/**
 * A sentinel representing "intentionally no value", distinct from the raw
 * JavaScript `undefined` that Pronto treats as failure. Use this as a
 * stage's success value when "empty" is a legitimate outcome.
 */
export const NONE: unique symbol = Symbol("pronto-pipes:none");
export type None = typeof NONE;

export type Result<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    reason: unknown;
};
export declare function ok<T>(value: T): Result<T>;
export declare function err(reason: unknown): Result<never>;
export declare function isOk<T>(result: Result<T>): result is {
    ok: true;
    value: T;
};
export declare function isErr<T>(result: Result<T>): result is {
    ok: false;
    reason: unknown;
};
/**
 * A sentinel representing "intentionally no value", distinct from the raw
 * JavaScript `undefined` that Pronto treats as failure. Use this as a
 * stage's success value when "empty" is a legitimate outcome.
 */
export declare const NONE: unique symbol;
export type None = typeof NONE;

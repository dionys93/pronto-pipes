/**
 * A reason explaining a failure. Pronto does not constrain this — it is
 * "debugging clues", not a guaranteed structure — so it stays `unknown`
 * here. Narrow it yourself at the edges if you need typed errors.
 */
export type Reason = unknown;
/**
 * A callback receives a `value` and an optional `reason`. By Pronto's
 * convention, `value === undefined` signals failure; anything else signals
 * success. See the README for the one sharp edge this convention has.
 */
export type Callback<O> = (value: O | undefined, reason?: Reason) => void;
/**
 * A cancel function is advisory: it asks unfinished work to stop. There is
 * no guarantee it succeeds, and it is not an undo.
 */
export type Cancel = (reason?: Reason) => void;
/**
 * A requestor performs (or delegates) one unit of work. It must report
 * success or failure through `callback`, exactly once, and must never
 * throw. It may optionally return a `Cancel` function.
 *
 * `I` is the type of value the requestor accepts; `O` is the type of value
 * it produces on success.
 */
export type Requestor<I, O> = (callback: Callback<O>, value: I) => Cancel | void;
/** A requestor whose input and output types are not (yet) known. */
export type AnyRequestor = Requestor<any, any>;

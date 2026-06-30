// test/pipeline.test.ts
//
// Run with: npm test

import assert from "node:assert/strict";
import test from "node:test";

import { pipeline, step, asyncStep, resultStep } from "../src/pipeline.js";
import { ok, err } from "../src/result.js";
import { fallback } from "../src/pronto.js";

test("pipeline runs stages in order, threading output to input", () => {
    const addOne = step((n: number) => n + 1);
    const double = step((n: number) => n * 2);
    const toString_ = step((n: number) => `value:${n}`);

    const p = pipeline<number>().pipe(addOne).pipe(double).pipe(toString_).build();

    return new Promise<void>((resolve) => {
        p((value, reason) => {
            assert.equal(reason, undefined);
            assert.equal(value, "value:6"); // (2 + 1) * 2 = 6
            resolve();
        }, 2);
    });
});

test("a thrown exception in step() becomes a failure, not a crash", () => {
    const boom = step((_: number) => {
        throw new Error("kaboom");
    });

    const p = pipeline<number>().pipe(boom).build();

    return new Promise<void>((resolve) => {
        p((value, reason) => {
            assert.equal(value, undefined);
            assert.ok(reason instanceof Error);
            resolve();
        }, 1);
    });
});

test("asyncStep resolves through the pipeline", () => {
    const delayedDouble = asyncStep(
        (n: number) => new Promise<number>((resolve) => setTimeout(() => resolve(n * 2), 5))
    );

    const p = pipeline<number>().pipe(delayedDouble).build();

    return new Promise<void>((resolve) => {
        p((value, reason) => {
            assert.equal(reason, undefined);
            assert.equal(value, 10);
            resolve();
        }, 5);
    });
});

test("a single-argument callback (idiomatic JS, ignoring `reason`) does not trip pronto's arity check", () => {
    // Pronto's run() rejects callbacks whose declared arity isn't exactly 2.
    // pronto.ts normalizes this at the boundary so callers can write the
    // shorter, idiomatic form below without knowing about that internal
    // detail.
    const double = step((n: number) => n * 2);
    const p = pipeline<number>().pipe(double).build();

    return new Promise<void>((resolve) => {
        p((value) => {
            assert.equal(value, 8);
            resolve();
        }, 4);
    });
});

test("resultStep reports explicit ok/err without throwing", () => {
    const parsePositive = resultStep((n: number) =>
        n > 0 ? ok(n) : err("must be positive")
    );

    const p = pipeline<number>().pipe(parsePositive).build();

    return new Promise<void>((resolve) => {
        p((value, reason) => {
            assert.equal(value, undefined);
            assert.equal(reason, "must be positive");
            resolve();
        }, -3);
    });
});

test("fallback tries the next requestor when the previous one fails", () => {
    const failing = step((_: string) => {
        throw new Error("nope");
    });
    const succeeding = step((s: string) => s.toUpperCase());

    const r = fallback([failing, succeeding]);

    return new Promise<void>((resolve) => {
        r((value, reason) => {
            assert.equal(reason, undefined);
            assert.equal(value, "HELLO");
            resolve();
        }, "hello");
    });
});

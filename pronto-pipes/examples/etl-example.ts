// examples/etl-example.ts
//
// Run with: npm run example:etl
//
// A small read -> parse -> validate -> transform -> summarize pipeline,
// showing the same Pipeline API used for the HTTP example applied to plain
// data transforms instead of requests.

import { readFile } from "node:fs/promises";
import { pipeline, step, asyncStep } from "../src/pipeline.js";

interface RawRecord {
    name: string;
    age: string;
}

interface CleanRecord {
    name: string;
    age: number;
}

interface Summary {
    count: number;
    averageAge: number;
    skipped: number;
}

const readCsv = asyncStep(async (path: string): Promise<string[]> => {
    const text = await readFile(path, "utf8");
    const [, ...rows] = text.trim().split("\n"); // drop the header row
    return rows;
});

const parseRows = step(
    (lines: string[]): RawRecord[] =>
        lines.map((line) => {
            const [name = "", age = ""] = line.split(",");
            return { name: name.trim(), age: age.trim() };
        })
);

const partitionValid = step((rows: RawRecord[]) => {
    const valid: RawRecord[] = [];
    let skipped = 0;
    for (const row of rows) {
        if (row.name.length > 0 && Number.isFinite(Number(row.age))) {
            valid.push(row);
        } else {
            skipped += 1;
        }
    }
    return { valid, skipped };
});

const toClean = step(
    (input: { valid: RawRecord[], skipped: number }): { records: CleanRecord[], skipped: number } => ({
        records: input.valid.map((row) => ({ name: row.name, age: Number(row.age) })),
        skipped: input.skipped
    })
);

const summarize = step(
    (input: { records: CleanRecord[], skipped: number }): Summary => ({
        count: input.records.length,
        averageAge:
            input.records.reduce((sum, record) => sum + record.age, 0) /
            (input.records.length || 1),
        skipped: input.skipped
    })
);

const etl = pipeline<string>()
    .pipe(readCsv)
    .pipe(parseRows)
    .pipe(partitionValid)
    .pipe(toClean)
    .pipe(summarize)
    .build();

etl((summary, reason) => {
    if (summary !== undefined) {
        console.log("ETL summary:", summary);
    } else {
        console.error("ETL failed:", reason);
    }
}, new URL("./data.csv", import.meta.url).pathname);

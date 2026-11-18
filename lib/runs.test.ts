import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkOutcome, parseRuns, throttled, type Run } from "./runs.ts";

const runs = parseRuns(readFileSync(new URL("../data/runs.json", import.meta.url), "utf8"));

function run(malicious: number, exitCode: number): Run {
  return { code: "x", malicious, errors: 0, lookups: 1, http: null, exitCode, seconds: null, headline: "", counts: "", watched: [] };
}

test("check outcome follows action.yml: non-zero exit is ERROR, then malicious blocks", () => {
  assert.equal(checkOutcome(run(0, 0)), "passes");
  assert.equal(checkOutcome(run(1, 0)), "blocked");
  assert.equal(checkOutcome(run(0, 3)), "error");
  assert.equal(checkOutcome(run(1, 3)), "error");
});

test("recorded throttle runs: passes on main, ERROR with commit 1, blocked with the patch", () => {
  assert.equal(checkOutcome(runs.throttleBefore), "passes");
  assert.equal(throttled(runs.throttleBefore), 372);
  assert.match(runs.throttleBefore.watched.join(), /unknown\s+debug@4\.4\.2/);
  assert.equal(checkOutcome(runs.throttleFailClosed), "error");
  assert.equal(checkOutcome(runs.throttleAfter), "blocked");
  assert.equal(throttled(runs.throttleAfter), 0);
});

test("recorded alias runs: alias passes, plain axios and patched alias are blocked", () => {
  assert.equal(checkOutcome(runs.aliasBefore), "passes");
  assert.match(runs.aliasBefore.watched.join(), /clean\s+http-client@1\.14\.1/);
  assert.equal(checkOutcome(runs.aliasControl), "blocked");
  assert.equal(checkOutcome(runs.aliasAfter), "blocked");
});

test("parseRuns rejects a missing run", () => {
  assert.throws(() => parseRuns("{}"), /throttleBefore missing/);
});

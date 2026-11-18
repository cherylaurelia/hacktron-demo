// Recorded runs of Hacktron's hfw_report.py (data/runs.json, written by scripts/extract-runs.mjs
// from the logs in ../runs). This file only decides what each run means for the PR check.

export interface Run {
  code: string;
  malicious: number;
  errors: number;
  lookups: number;
  http: Record<string, number> | null;
  exitCode: number;
  seconds: number | null;
  headline: string;
  counts: string;
  watched: string[];
  // First `::error::` line hfw_report.py printed (the job annotation); empty when none.
  annotation: string;
}

export type CheckOutcome = "passes" | "blocked" | "error";

// action.yml: the report step fails when hfw_report.py exits non-zero (README "ERROR"),
// and a later step fails the job when malicious_count != 0 (README "FAILED").
export function checkOutcome(run: Run): CheckOutcome {
  if (run.exitCode !== 0) return "error";

  if (run.malicious > 0) return "blocked";

  return "passes";
}

export function throttled(run: Run): number {
  return run.http?.["429"] ?? 0;
}

export type RunKey =
  | "throttleBefore"
  | "throttleFailClosed"
  | "throttleAfter"
  | "aliasBefore"
  | "aliasControl"
  | "aliasAfter";

// data/runs.json is written by scripts/extract-runs.mjs; check every run has its numbers.
export function parseRuns(json: string): Record<RunKey, Run> {
  const data: Partial<Record<RunKey, Run>> = JSON.parse(json);

  return {
    throttleBefore: required(data, "throttleBefore"),
    throttleFailClosed: required(data, "throttleFailClosed"),
    throttleAfter: required(data, "throttleAfter"),
    aliasBefore: required(data, "aliasBefore"),
    aliasControl: required(data, "aliasControl"),
    aliasAfter: required(data, "aliasAfter"),
  };
}

function required(data: Partial<Record<RunKey, Run>>, key: RunKey): Run {
  const run = data[key];

  if (!run) throw new Error(`runs.json: ${key} missing`);

  const counts = [run.malicious, run.errors, run.lookups, run.exitCode];

  if (!counts.every(Number.isFinite)) throw new Error(`runs.json: ${key} has a non-numeric count`);

  return run;
}

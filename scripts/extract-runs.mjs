// Reads the recorded runs in ../runs and writes data/runs.json for the page.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const RUNS = "../runs";

const runs = {
  throttleBefore: { dir: "next-debug-before2", code: "main (abdf725)" },
  throttleFailClosed: { dir: "v2-small-failclosed", code: "PR branch (2 commits)" },
  throttleAfter: { dir: "v2-full-after", code: "PR + follow-ups (4 commits)" },
  aliasBefore: { dir: "r1", log: "alias.log", comment: "alias.comment.md", code: "main (abdf725)" },
  aliasControl: { dir: "r1", log: "direct.log", comment: "direct.comment.md", code: "main (abdf725)" },
  aliasAfter: { dir: "v2-alias-after", code: "PR + follow-ups (4 commits)" },
};

const out = {};

for (const [key, spec] of Object.entries(runs)) {
  const log = readFileSync(`${RUNS}/${spec.dir}/${spec.log ?? "log.txt"}`, "utf8");
  const comment = readFileSync(`${RUNS}/${spec.dir}/${spec.comment ?? "comment.md"}`, "utf8");
  const wrote = log.match(/malicious=(\d+), suspicious=\d+, errors=(\d+), diff=(\d+)/);
  const status = log.match(/STATUS_COUNTS (\{.*?\}) rc (\d+) secs ([\d.]+)/);
  const lines = comment.split("\n");
  const headline = lines.find((l) => /^(All |\*\*Blocking|\*\*Error)/.test(l));
  const counts = lines.find((l) => l.startsWith("- added or changed"));

  const watched = log
    .split("\n")
    .filter((l) => /\] \S+\s+(debug@4\.4\.2|http-client@|axios@1\.14\.1)/.test(l))
    .map((l) => l.replace(/^\s*\[root\s*\]\s*/, "").trim());

  if (!wrote || !headline || !counts) throw new Error(`unparsed run ${key}`);
  out[key] = {
    code: spec.code,
    malicious: Number(wrote[1]),
    errors: Number(wrote[2]),
    lookups: Number(wrote[3]),
    http: status ? JSON.parse(status[1]) : null,
    exitCode: status ? Number(status[2]) : 0,
    seconds: status ? Number(status[3]) : null,
    headline: headline.replaceAll("**", ""),
    counts: counts.replaceAll("**", "").replace(/^- /, ""),
    watched,
  };
}

if (!existsSync("data")) throw new Error("run from web/");

writeFileSync("data/runs.json", JSON.stringify(out, null, 2) + "\n");

console.log(JSON.stringify(out, null, 2));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkOutcome, parseRuns, throttled, type CheckOutcome, type Run } from "@/lib/runs";

const runs = parseRuns(readFileSync(join(process.cwd(), "data/runs.json"), "utf8"));

const REPO = "https://github.com/HacktronAI/dependency-scan";

const BRANCH =
  "https://github.com/cherylaurelia/dependency-scan/compare/main...fix/fail-closed-throttle-and-aliases";

const DEMO_REPO = "https://github.com/cherylaurelia/hacktron-demo";

const OUTCOME_TEXT: Record<CheckOutcome, string> = {
  passes: "check passes",
  blocked: "check fails: blocked",
  error: "check fails: ERROR",
};

function Outcome({ outcome }: { outcome: CheckOutcome }) {
  const tone = outcome === "passes" ? "bg-red text-raised" : "bg-ink text-raised";

  return <span className={`mono rounded-full px-2.5 py-0.5 text-xs ${tone}`}>{OUTCOME_TEXT[outcome]}</span>;
}

function RunCard({ title, run, note }: { title: string; run: Run; note: string }) {
  const outcome = checkOutcome(run);
  const limited = throttled(run);

  return (
    <div className={`rounded-xl border bg-raised p-4 ${outcome === "passes" ? "border-red" : "border-line"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <Outcome outcome={outcome} />
      </div>
      <p className="mono mt-1 text-xs text-muted">hfw_report.py · {run.code}</p>
      <div className="mt-3 rounded-lg border border-line bg-card p-3">
        <p className="mono text-[11px] text-muted">PR comment</p>
        <p className="mt-1 text-sm font-semibold">{run.headline}</p>
        <p className="mono mt-1 text-xs text-muted">{run.counts}</p>
      </div>
      <dl className="mono mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-muted">HTTP 429 responses</dt>
        <dd>{limited}</dd>
        <dt className="text-muted">exit code</dt>
        <dd>{run.exitCode}</dd>
        {run.seconds === null ? null : (
          <>
            <dt className="text-muted">time</dt>
            <dd>{run.seconds} s</dd>
          </>
        )}
      </dl>
      <p className="mono mt-3 text-xs">
        {run.watched.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </p>
      <p className="mt-2 text-xs text-muted">{note}</p>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mono mt-3 overflow-x-auto rounded-lg border border-line bg-card p-3 text-xs leading-relaxed">
      {children}
    </pre>
  );
}

export default function Page() {
  const before = runs.throttleBefore;
  const after = runs.throttleAfter;

  return (
    <>
      <div className="bg-banner px-4 py-2.5 text-center text-xs text-raised">
        Unofficial demo by Cheryl Aurelia. Not affiliated with Hacktron.
      </div>
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-12 sm:px-8">
        <p className="mono text-xs tracking-widest text-muted">HACKTRON · DEPENDENCY SCAN ACTION</p>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
          A PR adding <span className="mono text-accent">debug@4.4.2</span> got &ldquo;{before.headline}&rdquo;
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed">
          <strong>Problem:</strong> {throttled(before)} of {before.lookups} verdict lookups were rate-limited (HTTP 429),
          and the Action counted them as advisory &ldquo;unknown&rdquo;, so the check passed. Hacktron&rsquo;s own API
          calls that version malicious.
        </p>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed">
          <strong>Fix:</strong> a missing verdict ends the run in <span className="mono">ERROR</span>, as the README
          says; 429s are retried after the server&rsquo;s retry-after window; npm aliases are looked up by their
          real name. With the patch the same PR is blocked.
        </p>
        <div className="mt-7 flex flex-wrap gap-3 text-sm">
          <a className="rounded-full bg-ink px-4 py-2 text-raised hover:opacity-90" href={BRANCH}>
            Patch on a fork branch [3 commits]
          </a>
          <a className="rounded-full border border-ink px-4 py-2 hover:bg-raised" href={DEMO_REPO}>
            Demo repo + repro files
          </a>
          <a className="rounded-full border border-line px-4 py-2 hover:bg-raised" href={REPO}>
            HacktronAI/dependency-scan
          </a>
        </div>

        <section className="mt-14">
          <h2 className="text-xl font-semibold">1. Throttled lookups pass as clean</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            A PR that adds the lockfile of a fresh Next.js 15 app ({before.lookups} packages, the shape of a first
            adoption or a lockfile regeneration), with the top-level <span className="mono">debug</span> at 4.4.2, the
            version compromised in September 2025. Same file, same live API, default HFW_PARALLEL=4.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <RunCard title="Before: main" run={before} note="debug@4.4.2 got a 429 and was listed as unknown." />
            <RunCard
              title="Commit 1 only (one line)"
              run={runs.throttleFailClosed}
              note="Closes the hole on its own: a lookup without a verdict is an error, so the job fails with ERROR. The comment headline is untouched."
            />
            <RunCard
              title="All 3 commits"
              run={after}
              note={`Every lookup got a verdict after retries; ${after.seconds ?? 0} s for ${after.lookups} packages.`}
            />
          </div>
          <p className="mt-6 text-sm">
            Why: <span className="mono">probe()</span> knows the response had no verdict, but returns the transport
            error, which is <span className="mono">None</span> when a 4xx body is JSON. The throttler&rsquo;s 429 is
            JSON:
          </p>
          <Code>{`HTTP/2 429  retry-after-short: 1
{"statusCode":429,"message":"ThrottlerException: Too Many Requests"}

# scripts/hfw_report.py, probe()
    is_server_error = last_error is not None or not last_body.get("status")   # True
-   "error": last_error if is_server_error else None,                        # None
+   "error": (last_error or f"http error {last_status}")
+   if is_server_error
+   else None,`}</Code>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold">2. npm aliases are checked under the alias name</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            <span className="mono">npm install http-client@npm:axios@1.14.1</span> writes{" "}
            <span className="mono">node_modules/http-client</span> with <span className="mono">&quot;name&quot;: &quot;axios&quot;</span>
            . The Action asked about <span className="mono">http-client@1.14.1</span>. In real trees this shape shows
            up as <span className="mono">string-width-cjs</span>, <span className="mono">strip-ansi-cjs</span> and{" "}
            <span className="mono">wrap-ansi-cjs</span> (via @isaacs/cliui).
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <RunCard title="Before: aliased axios@1.14.1" run={runs.aliasBefore} note="Looked up as http-client: clean." />
            <RunCard title="Control: plain axios@1.14.1" run={runs.aliasControl} note="Same version, no alias: blocked." />
            <RunCard title="After: aliased axios@1.14.1" run={runs.aliasAfter} note="Looked up as axios: blocked." />
          </div>
          <Code>{`# parse_package_lock_json(): the same rule hacktron.ai/tools/package already uses
#   (t.name ?? key.split("node_modules/").at(-1))
-   name = key[idx + len(marker) :]
+   alias_of = meta.get("name")
+   name = (
+       alias_of
+       if isinstance(alias_of, str) and alias_of
+       else key[idx + len(marker) :]
+   )`}</Code>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold">The patch</h2>
          <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed">
            <li>
              Three commits in <span className="mono">scripts/hfw_report.py</span>, take any subset:{" "}
              <span className="mono">fix: fail the scan when the verdict API returns no verdict</span> (one line),{" "}
              <span className="mono">fix: look up npm aliases by their registry name</span>,{" "}
              <span className="mono">fix: retry verdict lookups the API rate-limited</span> (at most 6 retries per
              lookup, waiting the longest <span className="mono">retry-after-*</span> header, clamped to 1–60 s).
            </li>
            <li>
              9 new tests (114 pass on Python 3.11, 3.12, 3.13); each fails on main. All 11 hand-made mutants of the
              changed lines are caught. ruff format and ruff check clean.
            </li>
            <li>
              Worst case for the retry: 6 waits of up to 60 s per lookup. Measured: {after.lookups} packages in{" "}
              {after.seconds ?? 0} s at the default parallelism. Without the retry commit, large PRs end in ERROR
              instead of passing.
            </li>
            <li>The fix is ready on a fork branch and has not been opened as a PR.</li>
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold">How this was tested</h2>
          <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed">
            <li>
              Hacktron&rsquo;s unmodified <span className="mono">hfw_report.py</span> (v1.0.0, abdf725), run with the
              environment <span className="mono">action.yml</span> sets (fast mode, empty base = the PR adds the
              lockfile), against the API URL the Action calls by default (api-staging.hacktron.ai/v1/hfw), on
              2026-11-18.
            </li>
            <li>
              Lockfiles made with <span className="mono">npm install --package-lock-only --ignore-scripts</span>; the
              bad versions were then written into the JSON. Nothing was installed.
            </li>
            <li>
              About 2,400 verdict lookups in total across 9 runs, each run started at least 60 s after the last. Rate
              limits seen in the headers: 10/s, 20/10 s, 100/min.
            </li>
            <li>Lockfiles and the counting wrapper are in the demo repo&rsquo;s repro/ folder.</li>
          </ul>
        </section>
      </main>
      <footer className="border-t border-line px-5 py-6 text-center text-xs text-muted">
        Unofficial demo by Cheryl Aurelia: not affiliated with Hacktron.
      </footer>
    </>
  );
}

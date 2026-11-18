# Hacktron dependency scan: two ways a malicious package passes

Unofficial demo by Cheryl Aurelia, not affiliated with Hacktron.

[HacktronAI/dependency-scan](https://github.com/HacktronAI/dependency-scan) (v1.0.0, abdf725) is a
free GitHub Action that checks packages a PR adds against Hacktron's malware verdict API.

1. **Throttled lookups pass as clean.** A PR adding a fresh Next.js 15 lockfile (432 packages)
   with `debug@4.4.2` (malicious per Hacktron's API) got 60 verdicts and 372 HTTP 429s. The
   429's JSON body left `probe()`'s `error` as `None`, so the comment said "All 432
   new/changed dependencies look clean." and the check passed.
2. **npm aliases are checked under the alias name.** `http-client@npm:axios@1.14.1` was looked
   up as `http-client@1.14.1` (clean); plain `axios@1.14.1` is blocked.

The fix ([branch](https://github.com/cherylaurelia/dependency-scan/compare/main...fix/fail-closed-throttled-verdicts),
2 commits): a lookup with no verdict ends the run in `ERROR` (the README's contract), and 429s
are retried after the server's `retry-after-*` window, so the same PR is blocked. The alias fix
is a separate [follow-up commit](https://github.com/cherylaurelia/dependency-scan/compare/fix/fail-closed-throttled-verdicts...fix/follow-up-npm-alias-names).

## Run

```
npm install
npm run extract   # rebuild data/runs.json from ../runs (only in the scout workspace)
npm test          # checks the recorded runs
npm run dev
```

See `repro/` for the lockfiles and run scripts (read its warning first).

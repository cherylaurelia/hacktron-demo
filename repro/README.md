# Repro files

**Do not run `npm install` / `npm ci` in these folders.** The lockfiles name known-malicious
versions (`debug@4.4.2`, `axios@1.14.1`); they are only input for the scanner.

- `next-debug/package-lock.json`: fresh Next.js 15 app (432 packages), made with
  `npm install --package-lock-only --ignore-scripts`, then the top-level `debug` set to 4.4.2.
- `alias/package-lock.json`: `http-client@npm:axios@1.14.1` (npm's alias shape: key
  `node_modules/http-client`, `"name": "axios"`).
- `direct/package-lock.json`: the same tree with plain `axios@1.14.1` (control).
- `run_counted.py`: runs `hfw_report.main()` unmodified and prints the HTTP status counts.
- `run_next.sh <outdir> <hfw_report.py> <lockfile>`: the env `action.yml` sets (fast mode,
  empty base = the PR adds the lockfile, default parallelism).

Recorded output of every run is summarized in `../data/runs.json`.

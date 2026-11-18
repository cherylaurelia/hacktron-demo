#!/bin/bash
# usage: ACTION_DIR=<clone of HacktronAI/dependency-scan> run_next.sh <outdir> <hfw_report.py> <lockfile>
# Same env as action.yml's report step: fast mode, default parallelism, empty base (the PR adds the lockfile).
set -u
out=$1; mkdir -p "$out"
base=$(mktemp); : > "$base"
HFW_PROJECTS="[{\"label\":\"root\",\"base\":\"$base\",\"head\":\"$3\",\"ecosystem\":\"npm\"}]" \
HFW_SCAN_MODE=fast HFW_REPORT_OUT="$out/comment.md" GITHUB_OUTPUT="$out/out.txt" \
uv run --project "$ACTION_DIR" --locked python "$(dirname "$0")/run_counted.py" "$2" > "$out/log.txt" 2>&1

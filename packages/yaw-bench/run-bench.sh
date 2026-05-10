#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HARNESS_DIR="$SCRIPT_DIR/js-framework-benchmark"
WEBDRIVER_DIR="$HARNESS_DIR/webdriver-ts"
RESULTS_DIR="$WEBDRIVER_DIR/results"
LOG_FILE="$SCRIPT_DIR/bench.log"
SUMMARY_FILE="$SCRIPT_DIR/bench-summary.txt"

> "$LOG_FILE"
> "$SUMMARY_FILE"

echo "Benchmark running... full log: bench.log"

# Start harness server
cd "$HARNESS_DIR"
setsid npm start >>"$LOG_FILE" 2>&1 &
PID=$!
trap "kill -- -$PID 2>/dev/null" EXIT
sleep 2

# Run benchmark
cd "$WEBDRIVER_DIR"
LANG=en_US.UTF-8 node dist/benchmarkRunner.js --headless --framework keyed/yaw >>"$LOG_FILE" 2>&1

# Generate result JS
LANG=en_US.UTF-8 node dist/createResultJS.js >>"$LOG_FILE" 2>&1

# Print results summary
bash "$SCRIPT_DIR/print-results.sh" | tee "$SUMMARY_FILE"

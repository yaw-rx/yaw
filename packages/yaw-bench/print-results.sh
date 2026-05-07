#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/js-framework-benchmark/webdriver-ts/results"

BENCH_DIR="$RESULTS_DIR" node -e "
const fs = require('fs');
const path = require('path');
const dir = process.env.BENCH_DIR;
const files = fs.readdirSync(dir).filter(f => f.startsWith('yaw-') && f.endsWith('.json')).sort();
if (!files.length) { console.log('No results found. Run npm run bench first.'); process.exit(1); }

const labels = {
    '01_run1k':              'create rows (1,000)',
    '02_replace1k':          'replace all rows (1,000)',
    '03_update10th1k_x16':   'partial update (every 10th)',
    '04_select1k':           'select row',
    '05_swap1k':             'swap rows',
    '06_remove-one-1k':      'remove row',
    '07_create10k':          'create many rows (10,000)',
    '08_create1k-after1k_x2':'append rows (1,000 to 1,000)',
    '09_clear1k_x8':         'clear rows (1,000)',
    '21_ready-memory':       'ready memory',
    '22_run-memory':         'run memory (1,000 rows)',
    '25_run-clear-memory':   'run-clear memory (5 cycles)',
    '41_size-uncompressed':  'size uncompressed',
    '42_size-compressed':    'size compressed',
    '43_first-paint':        'first paint',
};

const throttle = { '03_update10th1k_x16': 4, '04_select1k': 4, '05_swap1k': 4, '06_remove-one-1k': 2, '09_clear1k_x8': 4 };

console.log('');
console.log('  YAW Benchmark Results');
console.log('  ' + '='.repeat(72));
console.log('');

for (const f of files) {
    const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const id = r.benchmark || path.basename(f, '.json');
    const label = labels[id] || id;
    const v = r.values && (r.values.total || r.values.DEFAULT);
    if (!v) continue;

    const unit = r.type === 'mem' ? ' MB' : (id.startsWith('4') && !id.startsWith('43') ? ' KB' : ' ms');
    const slow = throttle[id] ? '  ('+throttle[id]+'x CPU slowdown)' : '';
    const sd = v.stddev != null ? v.stddev.toFixed(1) : '-';

    console.log('  ' + label + slow);
    console.log('    mean: ' + v.mean.toFixed(1) + unit + '  ±' + sd + '  median: ' + v.median.toFixed(1) + unit + '  [' + v.min.toFixed(1) + ' .. ' + v.max.toFixed(1) + ']');
    console.log('');
}
"

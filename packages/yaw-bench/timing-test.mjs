/**
 * Standalone timing benchmark for yaw-bench.
 * Measures create, replace, clear, swap, select, append, and update against a running dev server.
 *
 * Usage:
 *   node packages/yaw-bench/timing-test.mjs
 *
 * Requires the dev server at http://localhost:4000 to be running.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const CHROME = '/usr/bin/google-chrome';
const URL = 'http://localhost:4000';
const WARMUP = 1;
const RUNS = 5;

async function launch() {
    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: true,
        args: ['--no-sandbox', '--disable-gpu', '--disable-extensions'],
    });
    return browser;
}

/** Wait for selector to appear, return elapsed ms since `t0`. */
async function waitFor(page, selector, t0) {
    await page.waitForSelector(selector, { timeout: 30_000 });
    return await page.evaluate(() => performance.now()) - t0;
}

/** Get a high-res page timestamp. */
async function now(page) {
    return await page.evaluate(() => performance.now());
}

/** Click a selector on the page. */
async function click(page, selector) {
    await page.click(selector);
}

/** Reload the page and wait for #run to be ready. */
async function reset(page) {
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#run', { timeout: 10_000 });
}

// ── Benchmark definitions ──────────────────────────────────────────

const benchmarks = [
    {
        name: 'create 1k',
        setup: async (page) => { await reset(page); },
        run: async (page) => {
            const t0 = await now(page);
            await click(page, '#run');
            await waitFor(page, 'tbody tr:nth-of-type(1000)', t0);
            const t1 = await now(page);
            return t1 - t0;
        },
    },
    {
        name: 'replace 1k',
        setup: async (page) => {
            await reset(page);
            await click(page, '#run');
            await page.waitForSelector('tbody tr:nth-of-type(1000)', { timeout: 30_000 });
        },
        run: async (page) => {
            // Snapshot the first row's id cell text so we can detect replacement
            const origId = await page.evaluate(() => {
                return document.querySelector('tbody tr:nth-of-type(1) td:nth-of-type(1)')?.textContent ?? '';
            });
            const t0 = await now(page);
            await click(page, '#run');
            // Wait until the first row's id changes (new data) and we still have 1000 rows
            await page.waitForFunction((prevId) => {
                const rows = document.querySelectorAll('tbody tr');
                if (rows.length !== 1000) return false;
                const newId = rows[0]?.querySelector('td:nth-of-type(1)')?.textContent ?? '';
                return newId !== prevId;
            }, { timeout: 30_000 }, origId);
            const t1 = await now(page);
            return t1 - t0;
        },
    },
    {
        name: 'clear',
        setup: async (page) => {
            await reset(page);
            await click(page, '#run');
            await page.waitForSelector('tbody tr:nth-of-type(1000)', { timeout: 30_000 });
        },
        run: async (page) => {
            const t0 = await now(page);
            await click(page, '#clear');
            await page.waitForFunction(() => {
                return document.querySelectorAll('tbody tr').length === 0;
            }, { timeout: 30_000 });
            const t1 = await now(page);
            return t1 - t0;
        },
    },
    {
        name: 'swap rows',
        setup: async (page) => {
            await reset(page);
            await click(page, '#run');
            await page.waitForSelector('tbody tr:nth-of-type(1000)', { timeout: 30_000 });
        },
        run: async (page) => {
            // Snapshot text of row 2 and row 999 before swap
            const before = await page.evaluate(() => {
                const rows = document.querySelectorAll('tbody tr');
                return {
                    row2: rows[1]?.querySelector('td:nth-of-type(2) a')?.textContent ?? '',
                    row999: rows[998]?.querySelector('td:nth-of-type(2) a')?.textContent ?? '',
                };
            });
            const t0 = await now(page);
            await click(page, '#swaprows');
            // Wait until row 2's text equals the old row 999 text
            await page.waitForFunction((expected) => {
                const row2 = document.querySelectorAll('tbody tr')[1];
                const text = row2?.querySelector('td:nth-of-type(2) a')?.textContent ?? '';
                return text === expected;
            }, { timeout: 30_000 }, before.row999);
            const t1 = await now(page);
            return t1 - t0;
        },
    },
    {
        name: 'select row',
        setup: async (page) => {
            await reset(page);
            await click(page, '#run');
            await page.waitForSelector('tbody tr:nth-of-type(1000)', { timeout: 30_000 });
        },
        run: async (page) => {
            // Pick a row in the middle (row 500)
            const t0 = await now(page);
            await click(page, 'tbody tr:nth-of-type(500) td:nth-of-type(2) a');
            await page.waitForFunction(() => {
                const row = document.querySelectorAll('tbody tr')[499];
                return row?.classList.contains('danger');
            }, { timeout: 30_000 });
            const t1 = await now(page);
            return t1 - t0;
        },
    },
    {
        name: 'append 1k',
        setup: async (page) => {
            await reset(page);
            await click(page, '#run');
            await page.waitForSelector('tbody tr:nth-of-type(1000)', { timeout: 30_000 });
        },
        run: async (page) => {
            const t0 = await now(page);
            await click(page, '#add');
            await page.waitForSelector('tbody tr:nth-of-type(2000)', { timeout: 30_000 });
            const t1 = await now(page);
            return t1 - t0;
        },
    },
    {
        name: 'update every 10th',
        setup: async (page) => {
            await reset(page);
            await click(page, '#run');
            await page.waitForSelector('tbody tr:nth-of-type(1000)', { timeout: 30_000 });
        },
        run: async (page) => {
            // Snapshot text of row 1 (index 0, should get updated)
            const origText = await page.evaluate(() => {
                return document.querySelector('tbody tr:nth-of-type(1) td:nth-of-type(2) a')?.textContent ?? '';
            });
            const t0 = await now(page);
            await click(page, '#update');
            await page.waitForFunction((orig) => {
                const text = document.querySelector('tbody tr:nth-of-type(1) td:nth-of-type(2) a')?.textContent ?? '';
                return text !== orig && text.endsWith(' !!!');
            }, { timeout: 30_000 }, origText);
            const t1 = await now(page);
            return t1 - t0;
        },
    },
];

// ── Runner ──────────────────────────────────────────────────────────

async function main() {
    const browser = await launch();
    const page = await browser.newPage();

    // Suppress console noise from the page
    // page.on('console', () => {});

    console.log(`\nTiming benchmark — ${WARMUP} warmup, ${RUNS} measured runs each\n`);
    console.log(`${'Benchmark'.padEnd(20)} ${'Mean'.padStart(10)} ${'Min'.padStart(10)} ${'Max'.padStart(10)}`);
    console.log('-'.repeat(54));

    for (const bench of benchmarks) {
        const times = [];

        // Warmup
        for (let i = 0; i < WARMUP; i++) {
            await bench.setup(page);
            await bench.run(page);
        }

        // Measured runs
        for (let i = 0; i < RUNS; i++) {
            await bench.setup(page);
            const elapsed = await bench.run(page);
            times.push(elapsed);
        }

        const mean = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);

        const fmt = (n) => `${n.toFixed(1)}ms`.padStart(10);
        console.log(`${bench.name.padEnd(20)} ${fmt(mean)} ${fmt(min)} ${fmt(max)}`);
    }

    console.log();
    await browser.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

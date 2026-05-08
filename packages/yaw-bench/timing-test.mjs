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

const ROW = 'bench-row';
const ROW_1000 = `${ROW}:nth-of-type(1000)`;
const ROW_2000 = `${ROW}:nth-of-type(2000)`;

async function launch() {
    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: true,
        args: ['--no-sandbox', '--disable-gpu', '--disable-extensions'],
    });
    return browser;
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

/** Read the text of the first col-md-1 span inside a row element. */
function rowIdText(row) {
    return row?.querySelector('.col-md-1')?.textContent?.trim() ?? '';
}

/** Read the label text (col-md-4 a) inside a row element. */
function rowLabelText(row) {
    return row?.querySelector('.col-md-4 a')?.textContent?.trim() ?? '';
}

// ── Benchmark definitions ──────────────────────────────────────────

const benchmarks = [
    {
        name: 'create 1k',
        setup: async (page) => { await reset(page); },
        run: async (page) => {
            const t0 = await now(page);
            await click(page, '#run');
            await page.waitForSelector(ROW_1000, { timeout: 30_000 });
            const t1 = await now(page);
            return t1 - t0;
        },
    },
    {
        name: 'replace 1k',
        setup: async (page) => {
            await reset(page);
            await click(page, '#run');
            await page.waitForSelector(ROW_1000, { timeout: 30_000 });
        },
        run: async (page) => {
            const origId = await page.evaluate(() => {
                const row = document.querySelector('bench-row');
                return row?.querySelector('.col-md-1')?.textContent?.trim() ?? '';
            });
            const t0 = await now(page);
            await click(page, '#run');
            await page.waitForFunction((prevId) => {
                const rows = document.querySelectorAll('bench-row');
                if (rows.length !== 1000) return false;
                const newId = rows[0]?.querySelector('.col-md-1')?.textContent?.trim() ?? '';
                return newId !== '' && newId !== '0' && newId !== prevId;
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
            await page.waitForSelector(ROW_1000, { timeout: 30_000 });
        },
        run: async (page) => {
            const t0 = await now(page);
            await click(page, '#clear');
            await page.waitForFunction(() => {
                return document.querySelectorAll('bench-row').length === 0;
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
            await page.waitForSelector(ROW_1000, { timeout: 30_000 });
        },
        run: async (page) => {
            const before = await page.evaluate(() => {
                const rows = document.querySelectorAll('bench-row');
                return {
                    row2: rows[1]?.querySelector('.col-md-4 a')?.textContent?.trim() ?? '',
                    row999: rows[998]?.querySelector('.col-md-4 a')?.textContent?.trim() ?? '',
                };
            });
            const t0 = await now(page);
            await click(page, '#swaprows');
            await page.waitForFunction((expected) => {
                const row2 = document.querySelectorAll('bench-row')[1];
                const text = row2?.querySelector('.col-md-4 a')?.textContent?.trim() ?? '';
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
            await page.waitForSelector(ROW_1000, { timeout: 30_000 });
        },
        run: async (page) => {
            const t0 = await now(page);
            await click(page, 'bench-row:nth-of-type(500) .col-md-4 a');
            await page.waitForFunction(() => {
                const row = document.querySelectorAll('bench-row')[499];
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
            await page.waitForSelector(ROW_1000, { timeout: 30_000 });
        },
        run: async (page) => {
            const t0 = await now(page);
            await click(page, '#add');
            await page.waitForSelector(ROW_2000, { timeout: 30_000 });
            const t1 = await now(page);
            return t1 - t0;
        },
    },
    {
        name: 'update every 10th',
        setup: async (page) => {
            await reset(page);
            await click(page, '#run');
            await page.waitForSelector(ROW_1000, { timeout: 30_000 });
        },
        run: async (page) => {
            const origText = await page.evaluate(() => {
                const row = document.querySelector('bench-row');
                return row?.querySelector('.col-md-4 a')?.textContent?.trim() ?? '';
            });
            const t0 = await now(page);
            await click(page, '#update');
            await page.waitForFunction((orig) => {
                const row = document.querySelector('bench-row');
                const text = row?.querySelector('.col-md-4 a')?.textContent?.trim() ?? '';
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

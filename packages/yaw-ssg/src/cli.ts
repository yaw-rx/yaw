#!/usr/bin/env node
import { cpSync } from 'fs';
import { findBrowser } from './find-browser.js';
import { serve } from './serve.js';
import { discoverRoutes } from './discover.js';
import { captureRoute } from './capture.js';

async function main(): Promise<void> {
    const distDir = process.argv[2];
    const outDir = process.argv[3];
    if (distDir === undefined || outDir === undefined) {
        console.error('Usage: yaw-ssg <dist-dir> <out-dir>');
        process.exit(1);
    }

    cpSync(distDir, outDir, { recursive: true });
    console.log(`Copied ${distDir} → ${outDir}`);

    const config = await findBrowser();
    const puppeteer = await import('puppeteer-core');
    const browser = await puppeteer.launch({
        executablePath: config.executablePath,
        args: config.args,
        headless: config.headless,
    });

    const { url, close } = await serve(distDir);
    console.log(`Serving ${distDir} at ${url}`);

    try {
        const routes = await discoverRoutes(browser, url);
        console.log(`Discovered ${String(routes.length)} routes: ${routes.join(', ')}`);
        await Promise.all(routes.map((route) => captureRoute(browser, url, route, outDir)));
    } finally {
        await browser.close();
        close();
    }
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});

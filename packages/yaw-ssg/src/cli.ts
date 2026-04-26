#!/usr/bin/env node
import { findBrowser } from './find-browser.js';

async function main(): Promise<void> {
    const browser = await findBrowser();
    console.log(`Using browser: ${browser.executablePath}`);
    // TODO: serve dist, launch puppeteer, visit routes, capture DOM
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});

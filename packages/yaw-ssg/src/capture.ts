import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { Browser } from 'puppeteer-core';
import { finalizePage } from './finalize-page.js';
// import prettier from 'prettier';

const HYDRATE_SCRIPT = '<script>globalThis.__yaw_hydrate=true;</script>';

export async function captureRoute(browser: Browser, baseUrl: string, route: string, outDir: string): Promise<void> {
    const page = await browser.newPage();
    page.on('console', (msg) => console.log(`[capture:${route}] ${msg.text()}`));
    page.on('pageerror', (err) => console.error(`[capture:${route}] PAGE ERROR:`, err));
    await page.evaluateOnNewDocument(() => { (globalThis as Record<string, unknown>)['__yaw_ssg'] = true; });
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle0' });
    await finalizePage(page);
    let html = await page.content();
    html = html.replace('<head>', '<head>\n' + HYDRATE_SCRIPT);
    // html = await prettier.format(html, { parser: 'html', printWidth: 120, tabWidth: 4, htmlWhitespaceSensitivity: 'ignore' });
    const outPath = route === '/' ? join(outDir, 'index.html') : join(outDir, route, 'index.html');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html);
    console.log(`Captured ${route} → ${outPath}`);
    await page.close();
}

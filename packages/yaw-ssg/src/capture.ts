import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { Browser } from 'puppeteer-core';

const HYDRATE_SCRIPT = '<script>globalThis.__yaw_hydrate=true;</script>';

export async function captureRoute(browser: Browser, baseUrl: string, route: string, outDir: string): Promise<void> {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => { (globalThis as Record<string, unknown>)['__yaw_ssg'] = true; });
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('body[data-ssg-ready]', { timeout: 30_000 });
    let html = await page.content();
    html = html.replace('<head>', '<head>\n' + HYDRATE_SCRIPT);
    const outPath = route === '/' ? join(outDir, 'index.html') : join(outDir, route, 'index.html');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html);
    console.log(`Captured ${route} → ${outPath}`);
    await page.close();
}

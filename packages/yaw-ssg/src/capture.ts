import type { Browser } from 'puppeteer-core';
import { finalizePage } from './finalize-page.js';
// import prettier from 'prettier';

export interface CaptureResult {
    route: string;
    html: string;
    globalSSGState: Record<string, Record<string, unknown>>;
}

export async function captureRoute(browser: Browser, baseUrl: string, route: string): Promise<CaptureResult> {
    const page = await browser.newPage();
    page.on('console', (msg) => console.log(`[capture:${route}] ${msg.text()}`));
    page.on('pageerror', (err) => console.error(`[capture:${route}] PAGE ERROR:`, err));
    await page.evaluateOnNewDocument(() => { (globalThis as Record<string, unknown>)['__yaw_ssg'] = true; });
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle0' });
    const globalSSGStateBlob = await finalizePage(page);
    const html = await page.content();
    // html = await prettier.format(html, { parser: 'html', printWidth: 120, tabWidth: 4, htmlWhitespaceSensitivity: 'ignore' });
    await page.close();
    let globalSSGState: Record<string, Record<string, unknown>>;
    try {
        globalSSGState = JSON.parse(globalSSGStateBlob) as Record<string, Record<string, unknown>>;
    } catch (e) {
        throw new Error(`Failed to parse global SSG state blob for route "${route}"`, { cause: e });
    }
    return { route, html, globalSSGState };
}

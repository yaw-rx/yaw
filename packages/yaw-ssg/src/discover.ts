import type { Browser } from 'puppeteer-core';

export async function discoverRoutes(browser: Browser, baseUrl: string): Promise<string[]> {
    const page = await browser.newPage();
    page.on('console', (msg) => console.log(`[discover] ${msg.text()}`));
    await page.evaluateOnNewDocument(() => { (globalThis as Record<string, unknown>)['__yaw_ssg'] = true; });
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    await page.waitForSelector('body[data-ssg-ready]', { timeout: 30_000 });
    const routes = await page.evaluate(() => {
        const el = document.getElementById('yaw-ssg-routes');
        return el !== null ? JSON.parse(el.textContent!) as string[] : ['/'];
    });
    await page.close();
    return routes;
}

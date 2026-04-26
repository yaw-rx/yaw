import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { Browser, Page } from 'puppeteer-core';

async function collectModules(page: Page, baseUrl: string): Promise<string[]> {
    const modules: string[] = [];
    page.on('response', (res) => {
        const url = res.url();
        const type = res.headers()['content-type'] ?? '';
        if (url.startsWith(baseUrl) && (url.endsWith('.js') || type.includes('javascript'))) {
            modules.push(url.slice(baseUrl.length));
        }
    });
    return modules;
}

function buildStub(modules: string[]): string {
    const imports = modules.map((m) => `import '${m}';`).join('\n');
    return `<script>globalThis.__yaw_hydrate=true;</script>\n<script type="module">\n${imports}\n</script>`;
}

export async function captureRoute(browser: Browser, baseUrl: string, route: string, outDir: string): Promise<void> {
    const page = await browser.newPage();
    const modules = await collectModules(page, baseUrl);
    await page.evaluateOnNewDocument(() => { (globalThis as Record<string, unknown>)['__yaw_ssg'] = true; });
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('body[data-ssg-ready]', { timeout: 30_000 });
    let html = await page.content();
    html = html.replace(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/g, '');
    html = html.replace('<head>', '<head>\n' + buildStub(modules));
    const outPath = route === '/' ? join(outDir, 'index.html') : join(outDir, route, 'index.html');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html);
    console.log(`Captured ${route} → ${outPath}`);
    await page.close();
}

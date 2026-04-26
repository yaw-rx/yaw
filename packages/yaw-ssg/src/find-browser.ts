import { execSync } from 'child_process';
import { existsSync } from 'fs';

const MAC_CANDIDATES = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Vivaldi.app/Contents/MacOS/Vivaldi',
    '/Applications/Arc.app/Contents/MacOS/Arc',
];

const WIN_CANDIDATES = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Vivaldi\\Application\\vivaldi.exe',
];

const LINUX_WHICH = [
    'google-chrome',
    'google-chrome-stable',
    'chromium-browser',
    'chromium',
    'brave-browser',
    'brave',
    'microsoft-edge',
    'vivaldi',
].join(' || which ');

interface BrowserResult {
    executablePath: string;
    args: string[];
}

export async function findBrowser(): Promise<BrowserResult> {
    try {
        const chromium = await import('@sparticuz/chromium');
        return {
            executablePath: await (chromium.default.executablePath as () => Promise<string>)(),
            args: chromium.default.args as string[],
        };
    } catch { /* not installed — local dev */ }

    if (process.platform === 'darwin') {
        for (const p of MAC_CANDIDATES) {
            try { execSync(`test -x "${p}"`); return { executablePath: p, args: [] }; } catch {}
        }
    }

    if (process.platform === 'win32') {
        for (const p of WIN_CANDIDATES) {
            if (existsSync(p)) return { executablePath: p, args: [] };
        }
    }

    try {
        const path = execSync(`which ${LINUX_WHICH}`, { encoding: 'utf-8' }).trim();
        return { executablePath: path, args: [] };
    } catch {}

    throw new Error('No Chromium-based browser found');
}

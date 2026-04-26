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

export interface LaunchConfig {
    executablePath: string;
    args: string[];
    headless: boolean | 'shell';
}

export async function findBrowser(): Promise<LaunchConfig> {
    try {
        const chromium = await import('@sparticuz/chromium');
        return {
            executablePath: await (chromium.default.executablePath as () => Promise<string>)(),
            args: chromium.default.args as string[],
            headless: chromium.default.headless as boolean | 'shell',
        };
    } catch { /* not installed — local browser */ }

    const local = (executablePath: string): LaunchConfig => ({ executablePath, args: [], headless: true });

    if (process.platform === 'darwin') {
        for (const p of MAC_CANDIDATES) {
            try { execSync(`test -x "${p}"`); return local(p); } catch {}
        }
    }

    if (process.platform === 'win32') {
        for (const p of WIN_CANDIDATES) {
            if (existsSync(p)) return local(p);
        }
    }

    try {
        return local(execSync(`which ${LINUX_WHICH}`, { encoding: 'utf-8' }).trim());
    } catch {}

    throw new Error('No Chromium-based browser found');
}

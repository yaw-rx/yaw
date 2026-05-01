import { readFileSync } from 'fs';
import type { Plugin } from 'vite';

export const viteAssets = (extensions: string[]): Plugin => {
    const suffixed = extensions.map(ext => ext.startsWith('.') ? ext : `.${ext}`);

    return {
        name: 'yaw-assets',
        enforce: 'pre' as const,
        resolveId(source: string, importer: string | undefined) {
            if (importer && suffixed.some(ext => source.endsWith(ext))) {
                const path = source.startsWith('.') ? new URL(source, 'file://' + importer).pathname : null;
                if (path) return path + '?raw-asset';
            }
            return;
        },
        load(id: string) {
            if (id.endsWith('?raw-asset')) {
                const file = id.slice(0, -'?raw-asset'.length);
                return `export default ${JSON.stringify(readFileSync(file, 'utf-8'))}`;
            }
            return;
        },
    };
};

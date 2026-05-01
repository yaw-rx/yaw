import { readFileSync } from 'fs';

interface RollupPlugin {
    name: string;
    load(id: string): string | undefined;
}

export const rollupAssets = (extensions: string[]): RollupPlugin => {
    const suffixed = extensions.map(ext => ext.startsWith('.') ? ext : `.${ext}`);

    return {
        name: 'yaw-assets',

        load(id: string): string | undefined {
            if (suffixed.some(ext => id.endsWith(ext))) {
                return `export default ${JSON.stringify(readFileSync(id, 'utf-8'))}`;
            }
            return undefined;
        },
    };
};

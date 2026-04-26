import { createTransformedProgram, type TransformedProgram } from './bundlerPlugin.js';
import type { Plugin } from 'vite';

export const vitePlugin = (): Plugin => {
    let tp: TransformedProgram | undefined;
    let root: string;

    return {
        name: 'yaw-inject-transform',
        enforce: 'pre',

        configResolved(config) {
            root = config.root;
            tp = createTransformedProgram(root);
        },

        handleHotUpdate({ file }) {
            if (file.endsWith('.ts') && !file.includes('node_modules')) {
                tp = createTransformedProgram(root);
            }
        },

        transform(code, id) {
            if (!id.endsWith('.ts') || id.includes('node_modules') || id.endsWith('.d.ts')) return null;
            if (!code.includes('@Component')) return null;
            if (tp === undefined) return null;

            const output = tp.getSource(id);
            if (output === undefined) return null;

            return { code: output, map: null };
        },
    };
};

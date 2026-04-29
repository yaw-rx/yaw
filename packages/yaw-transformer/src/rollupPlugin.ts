import { createTransformedProgram, type TransformedProgram } from './bundlerPlugin.js';

interface RollupPlugin {
    name: string;
    buildStart(): void;
    transform(code: string, id: string): { code: string; map: null } | null;
}

export const rollupPlugin = (): RollupPlugin => {
    let tp: TransformedProgram | undefined;

    return {
        name: 'yaw-inject-transform',

        buildStart() {
            tp = createTransformedProgram(process.cwd());
        },

        transform(code, id) {
            if (!id.endsWith('.ts') || id.includes('node_modules') || id.endsWith('.d.ts')) return null;
            if (!code.includes('@Component') && !code.includes('@state')) return null;
            if (tp === undefined) return null;
            const output = tp.getSource(id);
            if (output === undefined) return null;
            return { code: output, map: null };
        },
    };
};

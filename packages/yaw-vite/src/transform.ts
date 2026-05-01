import { transform } from 'esbuild';
import { createTransformedProgram, type TransformedProgram } from 'yaw-transformer';
import type { Plugin } from 'vite';

export const viteTransform = (): Plugin => {
    let tp: TransformedProgram | undefined;
    let root: string;

    return {
        name: 'yaw-transform',
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

        async transform(code, id) {
            if (!id.endsWith('.ts') || id.includes('node_modules') || id.endsWith('.d.ts')) return null;
            if (!code.includes('@Component') && !code.includes('@state')) return null;
            if (tp === undefined) return null;

            const output = tp.getSource(id);
            if (output === undefined) return null;

            const result = await transform(output, {
                loader: 'ts',
                sourcefile: id,
                sourcemap: 'external',
                target: 'es2022',
                tsconfigRaw: {
                    compilerOptions: {
                        verbatimModuleSyntax: true,
                    },
                },
            });
            return { code: result.code, map: result.map || null };
        },
    };
};

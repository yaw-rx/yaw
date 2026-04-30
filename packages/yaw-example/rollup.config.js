import { rollupPlugin } from 'yaw-transformer';
import esbuild from 'rollup-plugin-esbuild';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { readFileSync } from 'fs';

const rawExtensions = ['.css', '.html', '.wgsl'];

const rawAssets = {
    name: 'raw-assets',
    load(id) {
        if (rawExtensions.some(ext => id.endsWith(ext))) {
            return `export default ${JSON.stringify(readFileSync(id, 'utf-8'))}`;
        }
    },
};

export default {
    input: 'src/main.ts',
    output: { dir: 'dist/rollup', format: 'es' },
    plugins: [
        rawAssets,
        rollupPlugin(),
        resolve(),
        commonjs(),
        esbuild({ target: 'es2022' }),
    ],
};

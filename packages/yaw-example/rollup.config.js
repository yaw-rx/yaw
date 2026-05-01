import { rollupTransform, rollupAssets } from 'yaw-rollup';
import esbuild from 'rollup-plugin-esbuild';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'src/main.ts',
    output: { dir: 'dist/rollup', format: 'es' },
    plugins: [
        rollupAssets(['.css', '.html', '.wgsl']),
        rollupTransform(),
        resolve({ dedupe: ['rxjs'] }),
        commonjs(),
        esbuild({ target: 'es2022', minify: true }),
    ],
};

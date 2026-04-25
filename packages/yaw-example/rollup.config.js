import { rollupPlugin } from 'yaw-transformer';
import esbuild from 'rollup-plugin-esbuild';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'src/main.ts',
    output: { dir: 'dist/rollup', format: 'es' },
    plugins: [
        rollupPlugin(),
        resolve(),
        commonjs(),
        esbuild({ target: 'es2022' }),
    ],
};

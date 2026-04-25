import { esbuildPlugin } from 'yaw-transformer';
import { build } from 'esbuild';

await build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    outdir: 'dist/esbuild',
    format: 'esm',
    target: 'es2022',
    plugins: [esbuildPlugin()],
});

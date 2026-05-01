import { esbuildTransform, esbuildAssets } from 'yaw-esbuild';
import { build } from 'esbuild';

await build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    outdir: 'dist/esbuild',
    format: 'esm',
    splitting: true,
    minify: true,
    target: 'es2022',
    plugins: [esbuildAssets(['.css', '.html', '.wgsl']), esbuildTransform()],
});

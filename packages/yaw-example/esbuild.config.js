import { esbuildPlugin } from 'yaw-transformer';
import { build } from 'esbuild';
import { readFileSync } from 'fs';

const rawAssets = {
    name: 'raw-assets',
    setup(build) {
        const filter = /\.(css|html|wgsl)$/;
        build.onLoad({ filter }, (args) => ({
            contents: `export default ${JSON.stringify(readFileSync(args.path, 'utf-8'))}`,
            loader: 'js',
        }));
    },
};

await build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    outdir: 'dist/esbuild',
    format: 'esm',
    target: 'es2022',
    plugins: [rawAssets, esbuildPlugin()],
});

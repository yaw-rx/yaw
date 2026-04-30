import { defineConfig } from 'vite';
import { vitePlugin } from 'yaw-transformer';
import { readFileSync } from 'fs';

const rawExtensions = ['.css', '.html', '.wgsl'];

const rawAssets = {
    name: 'raw-assets',
    enforce: 'pre' as const,
    resolveId(source: string, importer: string | undefined) {
        if (importer && rawExtensions.some(ext => source.endsWith(ext))) {
            const path = source.startsWith('.') ? new URL(source, 'file://' + importer).pathname : null;
            if (path) return path + '?raw-asset';
        }
    },
    load(id: string) {
        if (id.endsWith('?raw-asset')) {
            const file = id.slice(0, -'?raw-asset'.length);
            return `export default ${JSON.stringify(readFileSync(file, 'utf-8'))}`;
        }
    },
};

export default defineConfig({
    root: '.',
    plugins: [rawAssets, vitePlugin()],
    esbuild: { target: 'es2022' },
    resolve: {
        dedupe: ['rxjs'],
    },
    server: {
        port: 5176,
    },
    publicDir: false,
    build: {
        outDir: 'dist',
        target: 'es2021',
        minify: 'terser',
        terserOptions: {
            compress: {
                passes: 3,
                pure_getters: true,
                unsafe_math: true,
                unsafe_proto: true,
                unsafe_regexp: true,
                unsafe_undefined: true,
            },
            mangle: true,
        },
    },
});

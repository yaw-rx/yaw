import { defineConfig } from 'vite';
import { viteTransform } from '@yaw-rx/vite';

export default defineConfig({
    root: '.',
    plugins: [viteTransform()],
    esbuild: { target: 'es2022' },
    resolve: {
        dedupe: ['rxjs'],
    },
    server: {
        port: 4000,
    },
    base: './',
    build: {
        outDir: 'dist',
        target: 'es2022',
        minify: true,
    },
});

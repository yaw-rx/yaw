import { defineConfig } from 'vite';
import { vitePlugin } from 'yaw-transformer';

export default defineConfig({
    root: '.',
    plugins: [vitePlugin()],
    esbuild: { target: 'es2022' },
    resolve: {
        conditions: ['es2015', 'import'],
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

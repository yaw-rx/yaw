import { defineConfig } from 'vite';
import { vitePlugin } from 'yaw-transformer';

export default defineConfig({
    root: '.',
    plugins: [vitePlugin()],
    server: {
        port: 5176,
    },
    build: {
        outDir: 'dist',
        target: 'es2022',
    },
});

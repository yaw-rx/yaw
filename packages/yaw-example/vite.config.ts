import { defineConfig } from 'vite';
import { vitePlugin } from 'yaw-transformer';

export default defineConfig({
    root: '.',
    plugins: [vitePlugin()],
    server: {
        port: 5175,
    },
    build: {
        outDir: 'dist',
        target: 'es2022',
    },
});

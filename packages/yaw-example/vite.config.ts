import { defineConfig } from 'vite';
import { vitePlugin } from 'yaw-transformer';

export default defineConfig({
    root: '.',
    plugins: [vitePlugin()],
    build: {
        outDir: 'dist',
        target: 'es2022',
    },
});

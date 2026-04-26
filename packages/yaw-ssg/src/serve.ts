import { createServer } from 'http';
import sirv from 'sirv';

export function serve(distDir: string): Promise<{ url: string; close: () => void }> {
    return new Promise((resolve) => {
        const handler = sirv(distDir, { single: true });
        const server = createServer(handler);
        server.listen(0, () => {
            const addr = server.address();
            const port = typeof addr === 'object' && addr !== null ? addr.port : 0;
            resolve({ url: `http://localhost:${String(port)}`, close: () => server.close() });
        });
    });
}

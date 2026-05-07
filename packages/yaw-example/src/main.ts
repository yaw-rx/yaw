import { bootstrap } from '@yaw-rx/core';
import { Router, ROUTES } from '@yaw-rx/core/router';
import { AppRoot } from './app-root.js';
import globalStyles from './main.css';

await bootstrap({
    root: AppRoot,
    globals: { styles: globalStyles },
    providers: [
        { provide: ROUTES, useValue: [
            { path: '/',         load: () => import('./app-root/pages/manifesto-page.js').then(m => m.ManifestoPage) },
            { path: '/showcase', load: () => import('./app-root/pages/showcase-page.js').then(m => m.ShowcasePage) },
            { path: '/examples', load: () => import('./app-root/pages/examples-page.js').then(m => m.ExamplesPage) },
            { path: '/docs',     load: () => import('./app-root/pages/docs-page.js').then(m => m.DocsPage) },
            { path: '/bench',    load: () => import('./app-root/pages/bench-page.js').then(m => m.BenchPage) },
        ] },
        Router,
    ],
});
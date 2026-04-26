import { bootstrap } from 'yaw';
import { Router, ROUTES } from 'yaw/router';
import { RxIf } from 'yaw/directives/rx-if';
import { RxFor } from 'yaw/directives/rx-for';
import { AppRoot } from './app-root.js';

bootstrap({
    root: AppRoot,
    providers: [
        { provide: ROUTES, useValue: [
            { path: '/',         load: () => import('./app-root/pages/manifesto-page.js').then(m => m.ManifestoPage) },
            { path: '/showcase', load: () => import('./app-root/pages/showcase-page.js').then(m => m.ShowcasePage) },
            { path: '/examples', load: () => import('./app-root/pages/examples-page.js').then(m => m.ExamplesPage) },
            { path: '/docs',     load: () => import('./app-root/pages/docs-page.js').then(m => m.DocsPage) },
        ] },
        Router,
    ],
    globals: {
        directives: [RxIf, RxFor],
    },
});
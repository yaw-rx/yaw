import { bootstrap, Router, ROUTES, DefaultGlobalDirectives } from 'yaw';
import { AppRoot } from './app-root.js';
import './app-root/components/nav-bar.js';
import './app-root/components/code-block.js';
import { TocSection } from './app-root/pages/docs-page/directives/toc-section.js';

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
        directives: [...DefaultGlobalDirectives, TocSection],
    },
});
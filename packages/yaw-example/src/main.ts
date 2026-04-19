import 'reflect-metadata';
import { bootstrap, Router, ROUTES, DefaultGlobalDirectives } from 'yaw';
import { AppRoot } from './components/app-root.js';
import './components/nav-bar.js';
import './components/hero-section.js';
import './components/stat-counter.js';
import { ManifestoPage } from './components/manifesto-page.js';
import './components/manifesto-section.js';
import './components/code-block.js';
import './components/page-footer.js';

bootstrap({
    root: AppRoot,
    providers: [
        { provide: ROUTES, useValue: [{ path: '/', component: ManifestoPage }] },
        Router,
    ],
    globalDirectives: DefaultGlobalDirectives,
});

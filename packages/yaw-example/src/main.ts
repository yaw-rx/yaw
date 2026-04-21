import 'reflect-metadata';
import { bootstrap, Router, ROUTES, DefaultGlobalDirectives } from 'yaw';

import { AppRoot } from './shared/components/app-root.js';
import './shared/components/nav-bar.js';
import './shared/components/code-block.js';

import { ManifestoPage } from './pages/manifesto/manifesto-page.js';
import './pages/manifesto/components/hero-section.js';
import './pages/manifesto/components/stat-counter.js';
import './pages/manifesto/components/manifesto-section.js';
import './pages/manifesto/components/page-footer.js';

import { ExamplesPage } from './pages/examples/examples-page.js';
import './pages/examples/components/nested-level.js';
import './pages/examples/components/nesting-example.js';
import './pages/examples/components/color-playground.js';
import './pages/examples/components/yaw-slider.js';
import './pages/examples/components/slider-example.js';
import './pages/examples/components/signal-meter.js';
import './pages/examples/components/row-firehose.js';
import './pages/examples/components/page-echo.js';

import { ShowcasePage } from './pages/showcase/ShowcasePage.js';
import './pages/showcase/components/drum-sequencer/StepCell.js';
import './pages/showcase/components/drum-sequencer/TrackRow.js';
import './pages/showcase/components/drum-sequencer/DrumMachine.js';
import './pages/showcase/components/drum-sequencer/DrumSequencer.js';

import { DocsPage } from './pages/docs/page.js';
import { TocSection } from './pages/docs/toc.js';
import './pages/docs/components/sidebar.js';
import './pages/docs/components/bootstrap.js';
import './pages/docs/components/components.js';
import './pages/docs/components/directives.js';
import './pages/docs/components/services.js';
import './pages/docs/components/navigation.js';

bootstrap({
    root: AppRoot,
    providers: [
        { provide: ROUTES, useValue: [
            { path: '/',         component: ManifestoPage },
            { path: '/showcase', component: ShowcasePage },
            { path: '/examples', component: ExamplesPage },
            { path: '/docs',     component: DocsPage },
        ] },
        Router,
    ],
    globalDirectives: [...DefaultGlobalDirectives, TocSection],
});

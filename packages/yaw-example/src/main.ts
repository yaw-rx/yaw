import { bootstrap, Router, ROUTES, DefaultGlobalDirectives, type AttributeCodec } from 'yaw';
import Decimal from 'decimal.js';
import dayjs, { type Dayjs } from 'dayjs';
import { getAddress } from 'viem';

import { AppRoot } from './app-root.js';
import './app-root/components/nav-bar.js';
import './app-root/components/code-block.js';

import { ManifestoPage } from './app-root/pages/manifesto-page.js';
import './app-root/pages/manifesto-page/sections/hero.js';
import './app-root/pages/manifesto-page/sections/stat-counter.js';
import './app-root/pages/manifesto-page/sections/manifesto.js';
import './app-root/pages/manifesto-page/sections/footer.js';

import { ExamplesPage } from './app-root/pages/examples-page.js';
import './app-root/pages/examples-page/components/yaw-slider.js';
import './app-root/pages/examples-page/sections/slider-example.js';
import './app-root/pages/examples-page/sections/color-playground.js';
import './app-root/pages/examples-page/sections/signal-meter.js';
import './app-root/pages/examples-page/sections/row-firehose.js';
import './app-root/pages/examples-page/sections/nesting-example.js';
import './app-root/pages/examples-page/sections/nesting-example/components/nested-level.js';
import './app-root/pages/examples-page/sections/nesting-example/components/page-echo.js';
import './app-root/pages/examples-page/sections/calendar-example.js';
import './app-root/pages/examples-page/sections/calendar-example/calendar-grid.js';
import './app-root/pages/examples-page/sections/calendar-example/calendar-grid/calendar-week.js';
import './app-root/pages/examples-page/sections/calendar-example/calendar-grid/calendar-week/calendar-day.js';

import { ShowcasePage } from './app-root/pages/showcase-page.js';
import './app-root/pages/showcase-page/sections/drum-sequencer.js';
import './app-root/pages/showcase-page/sections/drum-sequencer/drum-machine.js';
import './app-root/pages/showcase-page/sections/drum-sequencer/drum-machine/track-row.js';
import './app-root/pages/showcase-page/sections/drum-sequencer/drum-machine/track-row/step-cell.js';

import { DocsPage } from './app-root/pages/docs-page.js';
import { TocSection } from './app-root/pages/docs-page/directives/toc-section.js';
import './app-root/pages/docs-page/sidebar.js';
import './app-root/pages/docs-page/sidebar/toc-node.js';
import './app-root/pages/docs-page/sections/bootstrap.js';
import './app-root/pages/docs-page/sections/components.js';
import './app-root/pages/docs-page/sections/directives.js';
import './app-root/pages/docs-page/sections/directives/for-demo.js';
import './app-root/pages/docs-page/sections/directives/scope-demo.js';
import './app-root/pages/docs-page/sections/directives/blink-demo.js';
import './app-root/pages/docs-page/sections/services.js';
import './app-root/pages/docs-page/sections/navigation.js';
import './app-root/pages/docs-page/sections/reactive-state.js';

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
    attributeCodecs: {
        Decimal: {
            encode: (v) => (v as Decimal).toString(),
            decode: (s) => new Decimal(s),
        } as AttributeCodec,
        Address: {
            encode: (v) => v as string,
            decode: (s) => getAddress(s),
        } as AttributeCodec,
        PlainDate: {
            encode: (v) => (v as Temporal.PlainDate).toString(),
            decode: (s) => Temporal.PlainDate.from(s),
        } as AttributeCodec,
        Dayjs: {
            encode: (v) => (v as Dayjs).toISOString(),
            decode: (s) => dayjs(s),
        } as AttributeCodec,
    },
});

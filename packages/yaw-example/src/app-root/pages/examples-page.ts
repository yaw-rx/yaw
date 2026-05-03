import { Component, RxElement } from '@yaw-rx/core';
import { TocSection } from './docs-page/directives/toc-section.js';
import { TocAnchor } from './docs-page/directives/toc-anchor.js';
import { SidebarDrawer } from '../directives/sidebar-drawer.js';
import { TocService } from './docs-page/services/toc-service.js';
import './docs-page/sidebar.js';
import './examples-page/components/yaw-slider.js';
import './examples-page/components/signal-meter.js';
import './examples-page/components/color-playground.js';
import './examples-page/components/scheduler-theatre.js';
import './examples-page/sections/slider-example.js';
import './examples-page/sections/color-playground.js';
import './examples-page/sections/signal-meter.js';
import './examples-page/sections/scheduler-theatre.js';
import './examples-page/sections/nesting-example.js';
import './examples-page/sections/calendar-example.js';

@Component({
    selector: 'examples-page',
    providers: [TocService],
    directives: [TocSection, TocAnchor, SidebarDrawer],
    template: `
        <docs-sidebar sidebar-drawer></docs-sidebar>
        <main class="content">
            <header class="intro" toc-section="intro">
                <h1 toc-anchor="intro">Examples</h1>
                <p class="lede">Small, real components — each exercising one piece of the
                   framework. Source strings are the same strings the browser renders, so
                   every code block you see is the truth of what's running beside it.</p>
            </header>

            <slider-example toc-section="custom-slider"></slider-example>
            <color-playground-example toc-section="reactive-palette"></color-playground-example>
            <signal-meter-example toc-section="signal-meter"></signal-meter-example>
            <scheduler-theatre-example toc-section="scheduler-theatre"></scheduler-theatre-example>
            <!-- <calendar-example></calendar-example> -->
            <nesting-example toc-section="nesting-example"></nesting-example>
        </main>
    `,
    styles: `
        :host { display: flex; background: #000; min-height: 100vh;
                color: #ccc; box-sizing: border-box; }
        :host > .content { flex: 1 1 0; min-width: 0; box-sizing: border-box;
                          padding: 6rem 1.25rem 4rem 1.25rem; }
        .intro { margin-bottom: 2.5rem; }
        h1 { color: #fff; font-size: 2.5rem; font-weight: 900;
             letter-spacing: -1px; margin: 0 0 1rem; }
        .lede { color: #888; line-height: 1.7; max-width: 72ch; margin: 0; }
        .reveal { opacity: 0; transform: translateY(24px);
                  transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal.revealed { opacity: 1; transform: none; }
    `,
})
export class ExamplesPage extends RxElement {}

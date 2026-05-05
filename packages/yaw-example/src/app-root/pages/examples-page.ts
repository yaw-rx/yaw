import { Component, RxElement } from '@yaw-rx/core';
import { TocSection } from '../directives/toc-section.directive.js';
import { TocAnchor } from '../directives/toc-anchor.directive.js';
import { TocMenuCollapse } from '../directives/toc-menu-collapse.directive.js';
import { TocMenuItemsService } from '../services/toc-menu-items.service.js';
import '../components/toc-menu.component.js';
import './examples-page/slider-section.component.js';
import './examples-page/color-playground-section.component.js';
import './examples-page/signal-meter-section.component.js';
import './examples-page/graph-section.component.js';
import './examples-page/wave-mixer-section.component.js';
import './examples-page/nesting-section.component.js';
import './examples-page/scheduler-theatre-section.component.js';
import './examples-page/calendar-section.component.js';

@Component({
    selector: 'examples-page',
    providers: [TocMenuItemsService],
    directives: [TocSection, TocAnchor, TocMenuCollapse],
    template: `
        <toc-menu toc-menu-collapse></toc-menu>
        <main class="content">
            <header class="intro" toc-section="intro">
                <h1 toc-anchor="intro">Examples</h1>
                <p class="lede">Small, real components — each exercising one piece of
                   the framework. Every example includes the full source, a live
                   instance running beside it, and links back to the
                   <a href="/docs">documentation</a> that explains the mechanisms
                   involved.</p>
            </header>

            <slider-section toc-section="custom-slider"></slider-section>
            <color-playground-section toc-section="reactive-palette"></color-playground-section>
            <signal-meter-section toc-section="signal-meter"></signal-meter-section>
            <!-- <calendar-section></calendar-section> -->
            <graph-section toc-section="rx-graph"></graph-section>
            <wave-mixer-section toc-section="wave-mixer"></wave-mixer-section>
            <nesting-section toc-section="nesting-example"></nesting-section>
            <scheduler-theatre-section toc-section="scheduler-theatre"></scheduler-theatre-section>
        </main>
    `,
    styles: `
        :host { display: flex; background: var(--black); min-height: 100vh;
                color: var(--text); box-sizing: border-box; }
        :host > .content { flex: 1 1 0; min-width: 0; box-sizing: border-box;
                          padding: 6rem 1.25rem 4rem 1.25rem; }
        .intro { margin-bottom: 2.5rem; }
        h1 { color: var(--white); font-size: 2.5rem; font-weight: 900;
             letter-spacing: -1px; margin: 0 0 1rem; }
        .lede { color: var(--secondary); line-height: 1.7; max-width: 72ch; margin: 0; }
        .reveal { opacity: 0; transform: translateY(24px);
                  transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal.revealed { opacity: 1; transform: none; }
    `,
})
export class ExamplesPage extends RxElement {}

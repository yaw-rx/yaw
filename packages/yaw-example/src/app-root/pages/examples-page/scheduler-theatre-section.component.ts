import { Component } from '@yaw-rx/core';
import { DocSection } from '../../components/doc-section.component.js';
import { escape } from '../../components/code-block/code-block-highlight.component.js';
import '../../components/code-block.component.js';
import { TocSection } from '../../directives/toc-section.directive.js';
import { TocAnchor } from '../../directives/toc-anchor.directive.js';
import { SCHEDULER_THEATRE_SOURCE } from './scheduler-theatre-section/scheduler-theatre.component.js';

const WRAPPER_STYLES = `
    .live { padding: 1.25rem; background: var(--bg-1);
            border: var(--border-width) solid var(--bg-5); border-radius: var(--radius-lg); }
`;

@Component({
    selector: 'scheduler-theatre-section',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="scheduler-theatre">Scheduler theatre</h1>
        <p class="lede">Click flood to start inserting rows into a table. A proportional controller
           measures frame rate and adjusts batch size per frame to try to maintain 60 fps. Watch the
           graphs as elements pile up. FPS will sag
           and the batch size shrink to compensate — this is a game it will quickly lose. The writes
           haven't slowed down — <code class="inline">insertAdjacentHTML</code> is still
           microseconds. Layout and paint got expensive. That cost lives in the browser's C++
           layout engine, on the other side of a boundary no abstraction can cross.
           No amount of diffing, batching, or dirty-checking will ever move that line.
           The P controller in this demo is like any other popular framework. It reacts to the symptom,
           backs off proportionally, and loses anyway.</p>

        <p class="lede"><em>The framework could insert 10,000 rows in a blink without dropping
           a frame. This demo throttles on purpose with heavy instrumentation to prove a point.</em></p>

        <section class="host">
            <code-block syntax="ts">${escape`${SCHEDULER_THEATRE_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>Flood</h2>
            <p class="note">Press flood, watch the graphs.</p>
            <div class="split">
                <code-block syntax="html">${escape`<scheduler-theatre></scheduler-theatre>`}</code-block>
                <div class="live"><scheduler-theatre></scheduler-theatre></div>
            </div>
        </section>
    `,
    styles: WRAPPER_STYLES,
})
export class SchedulerTheatreExample extends DocSection {}

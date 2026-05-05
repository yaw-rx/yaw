import { Component, RxElement, state } from '@yaw-rx/core';
import { escape } from '@yaw-rx/common';
import '../../../components/code-block.js';
import { GRAPH_SOURCE } from '../components/graph.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';
import { TocSection } from '../../docs-page/directives/toc-section.js';
import { TocAnchor } from '../../docs-page/directives/toc-anchor.js';
import { interval, scan, type Observable } from 'rxjs';

const USAGE = `<rx-graph [config]="config" [series]="series"></rx-graph>`;

const WRAPPER_STYLES = `
    .live { padding: 1.25rem; background: var(--bg-1);
            border: var(--border-width) solid var(--bg-5); border-radius: var(--radius-lg); }
`;

const POINTS = 120;
const SAMPLE_MS = 80;

@Component({
    selector: 'graph-example',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="rx-graph">Reactive graph</h1>
        <p class="lede">A canvas-based graph component driven by
           <code class="inline">${escape`Observable<number[]>`}</code> streams. The
           parent passes named observables into the
           <code class="inline">[series]</code>
           <a href="/docs/components/bindings">property binding</a> and a
           configuration record into <code class="inline">[config]</code> — the
           graph draws itself as data arrives and redraws whenever a stream
           emits.</p>

        <section class="host">
            <h2>The graph component</h2>
            <p class="note">Two
               <a href="/docs/components/state"><code class="inline">@state</code></a>
               fields.
               <code class="inline">config</code> is a record that maps series
               names to labels and colours.
               <code class="inline">series</code> is a record that maps series
               names to <code class="inline">${escape`Observable<number[]>`}</code>
               streams. When the parent writes a new
               <code class="inline">series</code> map, the component unsubscribes
               from every stream in the old map and subscribes to every stream in
               the new one.</p>
            <code-block syntax="ts">${escape`${GRAPH_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>Live — random walk</h2>
            <p class="note">The graph below is fed a single series built from
               <code class="inline">interval</code> and
               <code class="inline">scan</code> — a random walk that emits a new
               point array every 80ms. The line draws itself as the data
               arrives.</p>
            <div class="split">
                <code-block syntax="html">${escape`${USAGE}`}</code-block>
                <div class="live">
                    <rx-graph [config]="graphConfig" [series]="graphSeries"></rx-graph>
                </div>
            </div>
        </section>
    `,
    styles: `
        :host { display: block; }
        ${DOC_STYLES}
        ${WRAPPER_STYLES}
    `,
})
export class GraphExample extends RxElement {
    @state graphConfig = { walk: { label: 'random walk', color: '#8af' } };
    @state graphSeries: Record<string, Observable<number[]>> = {};

    private io: IntersectionObserver | undefined;

    private readonly walk$ = interval(SAMPLE_MS).pipe(
        scan((pts) => {
            const last = pts[pts.length - 1] ?? 50;
            const next = Math.max(0, Math.min(100, last + (Math.random() - 0.5) * 8));
            const out = [...pts, next];
            return out.length > POINTS ? out.slice(out.length - POINTS) : out;
        }, new Array(POINTS).fill(50) as number[]),
    );

    override onInit(): void {
        this.io = new IntersectionObserver(([entry]) => {
            if (entry!.isIntersecting) this.resume();
            else this.pause();
        });
        this.io.observe(this);
    }

    override onDestroy(): void {
        this.io?.disconnect();
        this.pause();
    }

    private resume(): void {
        this.graphSeries = { walk: this.walk$ };
    }

    private pause(): void {
        this.graphSeries = {};
    }
}

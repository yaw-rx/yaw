import { Component, RxElement, state } from '@yaw-rx/core';
import { escape } from '../../../components/code-block/code-highlight.js';
import '../../../components/code-block.js';
import { GRAPH_SOURCE } from '../components/graph.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';
import { TocSection } from '../../docs-page/directives/toc-section.js';
import { TocAnchor } from '../../docs-page/directives/toc-anchor.js';
import { interval, scan, type Observable } from 'rxjs';

const USAGE = `<rx-graph [config]="config" [series]="series"></rx-graph>`;

const WRAPPER_STYLES = `
    .live { padding: 1.25rem; background: #050505;
            border: 1px solid #1a1a1a; border-radius: 8px; }
`;

const POINTS = 120;
const SAMPLE_MS = 80;

@Component({
    selector: 'graph-example',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="rx-graph">Reactive graph</h1>
        <p class="lede">A canvas-based graph that takes
           <code class="inline">Observable&lt;number[]&gt;</code> streams as input.
           Pass named observables via the <code class="inline">[series]</code> binding
           and the graph subscribes, redraws on every emission, and cleans up
           when the map changes. The parent owns the data. The graph owns the pixels.</p>

        <section class="host">
            <h2>The graph component</h2>
            <p class="note">Two <code class="inline">@state</code> fields:
               <code class="inline">config</code> defines labels and colours,
               <code class="inline">series</code> is a map of named observable streams.
               When <code class="inline">series</code> changes the graph unsubscribes
               from the old streams and subscribes to the new ones.</p>
            <code-block syntax="ts">${escape`${GRAPH_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>Live — random walk</h2>
            <p class="note">A single series built from <code class="inline">interval</code>
               and <code class="inline">scan</code>. An IntersectionObserver swaps the
               series map in and out — the graph subscribes when visible,
               unsubscribes when not.</p>
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

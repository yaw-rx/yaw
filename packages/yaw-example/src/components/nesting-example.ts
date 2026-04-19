import 'reflect-metadata';
import { map, type Observable } from 'rxjs';
import { Component, RxElement, observable } from 'yaw';
import { escape } from './code-highlight.js';

const styles = `
    nesting-example { display: block; color: #ccc; }
    nesting-example h2 { color: #fff; font-size: 1.1rem; font-weight: 700;
                         margin: 0 0 1rem; letter-spacing: 0.02em; }
    nesting-example .inline { background: #111; padding: 0.1rem 0.4rem;
                              border-radius: 3px; font-size: 0.9em; color: #8af; }
    nesting-example .host, nesting-example .ex { margin-bottom: 1.5rem; padding: 1.25rem;
                                                 background: #0a0a0a; border: 1px solid #1a1a1a;
                                                 border-radius: 8px; }
    nesting-example .split { display: grid;
                             grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                             gap: 1rem; align-items: stretch; }
    nesting-example .split > * { min-width: 0; }
    nesting-example .live { display: flex; flex-direction: column; gap: 0.5rem;
                            padding: 1.25rem; background: #050505;
                            border: 1px solid #1a1a1a; border-radius: 8px; }
    nesting-example .note { color: #888; font-size: 0.9rem; line-height: 1.6;
                            margin: 0 0 1rem; max-width: 72ch; }
    nesting-example .state { margin: 0.75rem 0 0; font-family: monospace;
                             color: #888; font-size: 0.85rem; }
    nesting-example .state .status { color: #8af; }
    nesting-example button { background: #111; border: 1px solid #333; color: #fff;
                             padding: 0.5rem 1rem; font: inherit; font-size: 0.9rem;
                             cursor: pointer; border-radius: 6px; margin: 0.15rem; }
    nesting-example button:hover { background: #1a1a1a; border-color: #555; }
    @media (max-width: 960px) {
        nesting-example .split { grid-template-columns: 1fr; }
    }
`;

const DEPTH_1 = `<!-- depth 0: author writes increment(1); compiled stays increment(1) -->
<button onclick="increment(1)">+1</button>
<button onclick="increment(-1)">-1</button>
<button onclick="reset">reset</button>
<p class="state">count = {{count}} <span class="status">({{status()}})</span></p>`;

const DEPTH_2 = `<!-- depth 1: author writes increment(5); compiled becomes ^.increment(5) -->
<nested-level>
    <button onclick="increment(5)">+5</button>
    <button onclick="increment(-5)">-5</button>
</nested-level>
<p class="state">count = {{count}} <span class="status">({{status()}})</span></p>`;

const DEPTH_3 = `<!-- depth 2: author writes increment(10); compiled becomes ^^.increment(10) -->
<nested-level>
    <nested-level>
        <button onclick="increment(10)">+10</button>
        <button onclick="increment(100)">+100</button>
    </nested-level>
</nested-level>
<p class="state">count = {{count}} <span class="status">({{status()}})</span></p>`;

export const NESTING_TEMPLATE = `
${DEPTH_1}

${DEPTH_2}

${DEPTH_3}
`;

const HOST_SOURCE = `@Component({
    selector: 'nesting-example',
    template: \`${NESTING_TEMPLATE}\`,
    styles,
})
export class NestingExample extends RxElement<{ count: number }> {
    @observable count = 0;

    increment(amount: number): void { this.count = this.count + amount; }
    reset(): void { this.count = 0; }

    status(): Observable<string> {
        return this.count$.pipe(map((c) => c === 0 ? 'zero' : c > 0 ? 'positive' : 'negative'));
    }
}`;

const PAGE_ECHO_SOURCE = `@Component({
    selector: 'page-echo',
    template: \`
        <code>{{ parentRef.count }}</code>
        <code>{{ parentRef.status() }}</code>
        <button onclick="parentRef.increment(2)">parentRef.increment(2)</button>
        <button onclick="parentRef.reset">parentRef.reset</button>
    \`,
})
export class PageEcho extends RxElement {}`;

@Component({
    selector: 'nesting-example',
    template: `
        <div class="page">
            <h1>Nesting example</h1>
            <p class="lede">The same <code class="inline">increment(n)</code> method on
               nesting-example, called from three different structural depths. Bindings are
               authored flat — the compiler injects carets into the compiled
               <code class="inline">data-rx-on-click</code> based on how many custom-element
               layers each call sits inside.</p>

            <section class="host">
                <h2>The component itself</h2>
                <p class="note">The full source. <code class="inline">NESTING_TEMPLATE</code>
                   is the same string rendered live in the sections below — single source,
                   no cheating.</p>
                <code-block lang="ts">${escape`${HOST_SOURCE}`}</code-block>
            </section>

            <section class="ex">
                <h2>Depth 0 — local</h2>
                <p class="note">Buttons are direct children. Compiler leaves calls as-is.</p>
                <div class="split">
                    <code-block lang="html">${escape`${DEPTH_1}`}</code-block>
                    <div class="live">${DEPTH_1}</div>
                </div>
            </section>

            <section class="ex">
                <h2>Depth 1 — one custom element</h2>
                <p class="note">Wrapped in <code class="inline">&lt;nested-level&gt;</code>.
                   Compiler rewrites to <code class="inline">^.increment(5)</code>.</p>
                <div class="split">
                    <code-block lang="html">${escape`${DEPTH_2}`}</code-block>
                    <div class="live">${DEPTH_2}</div>
                </div>
            </section>

            <section class="ex">
                <h2>Depth 2 — two custom elements</h2>
                <p class="note">Two layers. Compiler rewrites to
                   <code class="inline">^^.increment(10)</code>.</p>
                <div class="split">
                    <code-block lang="html">${escape`${DEPTH_3}`}</code-block>
                    <div class="live">${DEPTH_3}</div>
                </div>
            </section>

            <section class="ex">
                <h2>Author-facing up-walk via <code class="inline">parentRef</code></h2>
                <p class="note">page-echo's own template is authored flat and uses
                   <code class="inline">parentRef.*</code> to reach into nesting-example.
                   <code class="inline">parentRef</code> walks past mirror wrappers to the
                   nearest real custom-element host.</p>
                <div class="split">
                    <code-block lang="ts">${escape`${PAGE_ECHO_SOURCE}`}</code-block>
                    <div class="live"><page-echo></page-echo></div>
                </div>
            </section>
        </div>
    `,
    styles,
})
export class NestingExample extends RxElement<{ count: number }> {
    @observable count = 0;

    increment(amount: number): void {
        this.count += amount;
    }

    reset(): void {
        this.count = 0;
    }

    status(): Observable<string> {
        return this.count$.pipe(map((c) => {
            if (c === 0) { return 'zero'; }
            return c > 0 ? 'positive' : 'negative';
        }));
    }
}

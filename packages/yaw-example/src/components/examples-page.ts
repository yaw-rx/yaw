import 'reflect-metadata';
import { map, type Observable } from 'rxjs';
import { Component, RxElement, observable } from 'yaw';

const EX0_CODE = `
    <button onclick="increment(1)">+1</button>
    <button onclick="increment(-1)">-1</button>
    <button onclick="reset">reset</button>
    <p>count = {{count}} ({{status()}})</p>
`;

const EX1_CODE = `
    <nested-level>
        <button onclick="increment(5)">+5</button>
        <button onclick="increment(-5)">-5</button>
    </nested-level>
`;

const EX2_CODE = `
    <nested-level>
        <nested-level>
            <button onclick="increment(10)">+10</button>
            <button onclick="increment(100)">+100</button>
            <button onclick="reset">reset</button>
        </nested-level>
    </nested-level>
`;

const EX3_CODE = `
    // examples-page.ts
    <page-echo></page-echo>

    // page-echo.ts — authored flat (zero carets)
    @Component({
        selector: 'page-echo',
        template: \`
            <code>{{ parentRef.count }}</code>
            <code>{{ parentRef.status() }}</code>
            <button onclick="parentRef.increment(2)">+2</button>
            <button onclick="parentRef.reset">reset</button>
        \`
    })
    export class PageEcho extends RxElement {}
`;

const HOST_CODE = `
    @Component({
        selector: 'examples-page',
        template: \`
            <!-- depth 0: author writes increment(1); compiled stays increment(1) -->
            <button onclick="increment(1)">+1</button>
            <p>count = {{count}} ({{status()}})</p>

            <!-- depth 1: author writes increment(5); compiled becomes ^.increment(5) -->
            <nested-level>
                <button onclick="increment(5)">+5</button>
            </nested-level>

            <!-- depth 2: author writes increment(10); compiled becomes ^^.increment(10) -->
            <nested-level>
                <nested-level>
                    <button onclick="increment(10)">+10</button>
                </nested-level>
            </nested-level>
        \`
    })
    export class ExamplesPage extends RxElement<{ count: number }> {
        @observable count = 0;

        increment(amount: number): void {
            this.count = this.count + amount;
        }

        reset(): void { this.count = 0; }

        status(): Observable<string> {
            return this.count$.pipe(
                map((c) => c === 0 ? 'zero' : c > 0 ? 'positive' : 'negative')
            );
        }
    }
`;

@Component({
    selector: 'examples-page',
    template: `
        <div class="page">
            <h1>Examples</h1>
            <p class="lede">The same <code class="inline">increment(n)</code> method on
               examples-page, called from three different structural depths. Bindings are
               authored flat — the compiler injects carets into the compiled
               <code class="inline">data-rx-on-click</code> based on how many custom-element
               layers each call sits inside.</p>

            <section class="host">
                <h2>The host component</h2>
                <code-block lang="ts"><script type="text/plain">${HOST_CODE}</script></code-block>
            </section>

            <section class="ex">
                <h2>Depth 0 — local</h2>
                <div class="split">
                    <code-block lang="ts"><script type="text/plain">${EX0_CODE}</script></code-block>
                    <div class="live">
                        <div class="controls">
                            <button onclick="increment(1)">+1</button>
                            <button onclick="increment(-1)">-1</button>
                            <button onclick="reset">reset</button>
                        </div>
                        <p class="state">count = {{count}} <span class="status">({{status()}})</span></p>
                    </div>
                </div>
            </section>

            <section class="ex">
                <h2>Depth 1 — inside one custom element (parent)</h2>
                <div class="split">
                    <code-block lang="ts"><script type="text/plain">${EX1_CODE}</script></code-block>
                    <div class="live">
                        <nested-level>
                            <button onclick="increment(5)">+5</button>
                            <button onclick="increment(-5)">-5</button>
                        </nested-level>
                        <p class="state">count = {{count}}</p>
                    </div>
                </div>
            </section>

            <section class="ex">
                <h2>Depth 2 — inside two custom elements (grandparent)</h2>
                <div class="split">
                    <code-block lang="ts"><script type="text/plain">${EX2_CODE}</script></code-block>
                    <div class="live">
                        <nested-level>
                            <nested-level>
                                <button onclick="increment(10)">+10</button>
                                <button onclick="increment(100)">+100</button>
                                <button onclick="reset">reset</button>
                            </nested-level>
                        </nested-level>
                        <p class="state">count = {{count}}</p>
                    </div>
                </div>
            </section>

            <section class="ex">
                <h2>Author-facing up-walk via <code class="inline">parentRef</code></h2>
                <p class="note">page-echo's own template is authored flat (zero carets) and uses
                   <code class="inline">parentRef.*</code> to reach into examples-page.
                   <code class="inline">parentRef</code> is a real runtime property that walks
                   past mirror wrappers to the nearest real custom-element host.</p>
                <div class="split">
                    <code-block lang="ts"><script type="text/plain">${EX3_CODE}</script></code-block>
                    <div class="live">
                        <page-echo></page-echo>
                    </div>
                </div>
            </section>
        </div>
    `,
    styles: `
        examples-page { display: block; background: #000; min-height: 100vh;
                        padding: 6rem 1.25rem 4rem; color: #ccc; box-sizing: border-box; }
        .page { max-width: 1200px; margin: 0 auto; }
        h1 { color: #fff; font-size: 2.5rem; font-weight: 900; letter-spacing: -1px;
             margin: 0 0 1rem; }
        .lede { color: #888; line-height: 1.7; margin-bottom: 2.5rem; max-width: 72ch; }
        .lede .inline, .note .inline { background: #111; padding: 0.1rem 0.4rem;
                                       border-radius: 3px; font-size: 0.9em; color: #8af; }
        h2 { color: #fff; font-size: 1.1rem; font-weight: 700; margin: 0 0 1rem;
             letter-spacing: 0.02em; }
        .host, .ex { margin-bottom: 1.5rem; padding: 1.25rem; background: #0a0a0a;
                     border: 1px solid #1a1a1a; border-radius: 8px; }
        .split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                 gap: 1rem; align-items: stretch; }
        .split > * { min-width: 0; }
        .live { display: flex; flex-direction: column; justify-content: center; gap: 0.75rem;
                padding: 1.25rem; background: #050505; border: 1px solid #1a1a1a;
                border-radius: 8px; min-height: 9rem; }
        .controls { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .state { margin: 0; font-family: monospace; color: #888; font-size: 0.85rem; }
        .state .status { color: #8af; }
        .note { color: #888; font-size: 0.9rem; line-height: 1.6; margin: 0 0 1rem; max-width: 72ch; }
        button { background: #111; border: 1px solid #333; color: #fff;
                 padding: 0.5rem 1rem; font: inherit; font-size: 0.9rem;
                 cursor: pointer; border-radius: 6px; }
        button:hover { background: #1a1a1a; border-color: #555; }
        @media (max-width: 960px) {
            .split { grid-template-columns: 1fr; }
            .live { min-height: 0; }
        }
    `
})
export class ExamplesPage extends RxElement<{ count: number }> {
    @observable count = 0;

    increment(amount: number): void {
        this.count = this.count + amount;
    }

    reset(): void {
        this.count = 0;
    }

    status(): Observable<string> {
        return this.count$.pipe(map((c) => c === 0 ? 'zero' : c > 0 ? 'positive' : 'negative'));
    }
}

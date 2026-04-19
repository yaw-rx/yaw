import 'reflect-metadata';
import { map, type Observable } from 'rxjs';
import { Component, RxElement, observable } from 'yaw';

@Component({
    selector: 'examples-page',
    template: `
        <div class="page">
            <h1>Examples</h1>
            <p class="lede">The same <code>increment(n)</code> method on examples-page, called
               from three different structural depths. Bindings are authored flat — the compiler
               injects carets into the compiled <code>data-rx-on-click</code> based on how many
               custom-element layers each call sits inside.</p>

            <section class="ex">
                <h2>Depth 0 — local</h2>
                <div class="controls">
                    <button onclick="increment(1)">+1</button>
                    <button onclick="increment(-1)">-1</button>
                    <button onclick="reset">reset</button>
                </div>
                <p class="state">count = {{count}} <span class="status">({{status()}})</span></p>
            </section>

            <section class="ex">
                <h2>Depth 1 — inside one custom element (parent)</h2>
                <nested-level>
                    <button onclick="increment(5)">+5</button>
                    <button onclick="increment(-5)">-5</button>
                </nested-level>
                <p class="state">count = {{count}}</p>
            </section>

            <section class="ex">
                <h2>Depth 2 — inside two custom elements (grandparent)</h2>
                <nested-level>
                    <nested-level>
                        <button onclick="increment(10)">+10</button>
                        <button onclick="increment(100)">+100</button>
                        <button onclick="reset">reset</button>
                    </nested-level>
                </nested-level>
                <p class="state">count = {{count}}</p>
            </section>

            <section class="ex">
                <h2>Author-facing up-walk via <code>parentRef</code></h2>
                <p class="note">page-echo's own template is authored flat (zero carets) and uses
                   <code>parentRef.*</code> to reach into examples-page. No compiler caret
                   injection — <code>parentRef</code> is a real runtime property that walks
                   past mirror wrappers to the nearest real custom-element host.</p>
                <page-echo></page-echo>
            </section>
        </div>
    `,
    styles: `
        examples-page { display: block; background: #000; min-height: 100vh;
                        padding: 6rem 2rem 4rem; color: #ccc; }
        .page { max-width: 760px; margin: 0 auto; }
        h1 { color: #fff; font-size: 2.5rem; font-weight: 900; letter-spacing: -1px;
             margin: 0 0 1rem; }
        .lede { color: #888; line-height: 1.7; margin-bottom: 2.5rem; }
        .lede code { background: #111; padding: 0.1rem 0.4rem; border-radius: 3px;
                     font-size: 0.9em; color: #8af; }
        h2 { color: #fff; font-size: 1.1rem; font-weight: 700; margin: 0 0 1rem;
             letter-spacing: 0.02em; }
        .ex { margin-bottom: 2.5rem; padding: 1.5rem; background: #0a0a0a;
              border: 1px solid #1a1a1a; border-radius: 8px; }
        .controls { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .state { margin: 0.8rem 0 0; font-family: monospace; color: #888; }
        .state .status { color: #8af; }
        .note { color: #888; font-size: 0.9rem; line-height: 1.6; margin: 0 0 1rem; }
        .note code { background: #111; padding: 0.1rem 0.4rem; border-radius: 3px;
                     font-size: 0.9em; color: #8af; }
        button { background: #111; border: 1px solid #333; color: #fff;
                 padding: 0.5rem 1rem; font: inherit; font-size: 0.9rem;
                 cursor: pointer; border-radius: 6px; }
        button:hover { background: #1a1a1a; border-color: #555; }
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

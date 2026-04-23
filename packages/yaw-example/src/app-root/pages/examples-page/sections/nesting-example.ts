import { map, type Observable } from 'rxjs';
import { Component, RxElement, observable } from 'yaw';
import { escape } from '../../../components/code-block/code-highlight.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';

const NESTING_STYLES = `
    :host { display: block; }
    .state { margin: 0.75rem 0 0; font-family: monospace;
             color: #888; font-size: 0.85rem; }
    .state .status { color: #8af; }
    button { background: #111; border: 1px solid #333; color: #fff;
             padding: 0.5rem 1rem; font: inherit; font-size: 0.9rem;
             cursor: pointer; border-radius: 6px; margin: 0.15rem; }
    button:hover { background: #1a1a1a; border-color: #555; }
`;

const WRAPPER_STYLES = `
    .live { display: flex; flex-direction: column; gap: 0.5rem;
            padding: 1.25rem; background: #050505;
            border: 1px solid #1a1a1a; border-radius: 8px; }
`;

const DEPTH_1 = `<!-- depth 0: button is a direct child of the host -->
<button onclick="increment(1)">+1</button>
<button onclick="increment(-1)">-1</button>
<button onclick="reset">reset</button>
<p class="state">count = {{count}} <span class="status">({{status}})</span></p>`;

const DEPTH_2 = `<!-- depth 1: button wrapped in one <nested-level> -->
<nested-level>
    <button onclick="increment(5)">+5</button>
    <button onclick="increment(-5)">-5</button>
</nested-level>
<p class="state">count = {{count}} <span class="status">({{status}})</span></p>`;

const DEPTH_3 = `<!-- depth 2: button wrapped in two <nested-level>s -->
<nested-level>
    <nested-level>
        <button onclick="increment(10)">+10</button>
        <button onclick="increment(100)">+100</button>
    </nested-level>
</nested-level>
<p class="state">count = {{count}} <span class="status">({{status}})</span></p>`;

export const NESTING_TEMPLATE = `
${DEPTH_1}

${DEPTH_2}

${DEPTH_3}
`;

const NESTED_LEVEL_SOURCE = `@Component({
    selector: 'nested-level',
    template: \`
        <div class="nested">
            <div class="tag">nested scope</div>
            <div class="content"><slot></slot></div>
        </div>
    \`,
})
export class NestedLevel extends RxElement {}`;

const HOST_SOURCE = `@Component({
    selector: 'nesting-example',
    template: \`${NESTING_TEMPLATE}
<!-- a separate component dropped into the same host template -->
<page-echo></page-echo>\`,
    styles: \`${NESTING_STYLES}\`,
})
export class NestingExample extends RxElement<{ count: number }> {
    @observable count = 0;

    increment(amount: number): void { this.count = this.count + amount; }
    reset(): void { this.count = 0; }

    get status$(): Observable<string> {
        return this.count$.pipe(map((c) => c === 0 ? 'zero' : c > 0 ? 'positive' : 'negative'));
    }
}`;

const PAGE_ECHO_SOURCE = `@Component({
    selector: 'page-echo',
    template: \`
        <code>{{ ^.count }}</code>
        <code>{{ ^.status }}</code>
        <button onclick="^.increment(2)">^.increment(2)</button>
        <button onclick="^.reset">^.reset</button>
    \`,
})
export class PageEcho extends RxElement {}`;

const MINIMAL_HOST_SOURCE = `@Component({
    selector: 'nesting-example',
    template: \`
        <button onclick="increment(1)">+1</button>
        <p>count = {{count}}</p>
    \`,
})
export class NestingExample extends RxElement {
    @observable count = 0;
    increment(n: number): void { this.count += n; }
}`;

@Component({
    selector: 'nesting-example',
    template: `
        <div class="page">
            <h1>Nesting example</h1>

            <p class="lede">This example is one component,
               <code class="inline">&lt;nesting-example&gt;</code>. It owns one piece
               of state, <code class="inline">count</code> (and a derived
               <code class="inline">status</code> label — "zero", "positive",
               "negative" — that the demos print alongside it). Everything below —
               three sets of buttons at increasing depth of nesting, plus one more
               set inside a <em>separate</em> component near the end of this example —
               reads and writes that same <code class="inline">count</code>.</p>

            <p class="lede">The unit you define in this framework is a
               <em>component</em> — a custom element with its own template, state,
               and methods. Its template is where you write what it contains:
               HTML, other custom elements, and <em>bindings</em> —
               <code class="inline">{{ count }}</code> interpolations or event
               attributes like <code class="inline">onclick="increment(1)"</code>
               that read and write state.</p>

            <p class="lede">A component's template <em>defines its scope</em>.
               Every binding written in that template resolves against the
               component whose template it is — the <em>host</em> of the
               template. <code class="inline">{{ count }}</code> reads
               <code class="inline">count</code> on the host;
               <code class="inline">onclick="increment(1)"</code> calls
               <code class="inline">increment(1)</code> on the host. No
               prefix, no ceremony. The term matches CSS
               <code class="inline">:host</code>: the element that owns
               what's inside.</p>

            <section class="host">
                <h2>Minimal host</h2>
                <p class="note">The host stripped to its essentials. Both
                   bindings sit in
                   <code class="inline">&lt;nesting-example&gt;</code>'s
                   template, so both resolve against
                   <code class="inline">&lt;nesting-example&gt;</code>.</p>
                <code-block lang="ts">${escape`${MINIMAL_HOST_SOURCE}`}</code-block>
            </section>

            <section class="host">
                <h2><code class="inline">&lt;nested-level&gt;</code> — a wrapper</h2>
                <p class="note">A custom element whose entire job is to draw a
                   framed box around its <code class="inline">&lt;slot&gt;</code>.
                   No behaviour, no state. In the live sections below, every
                   dashed box is one.</p>
                <code-block lang="ts">${escape`${NESTED_LEVEL_SOURCE}`}</code-block>
            </section>

            <p class="lede">Here is the rule that matters. Wrapping a binding
               in a custom-element tag <em>inside your own template</em> does
               not change where the binding resolves. It is still in your
               template, so it is still your scope. A button sitting directly
               under <code class="inline">&lt;nesting-example&gt;</code> and
               a button sitting two
               <code class="inline">&lt;nested-level&gt;</code>s deep — both
               written in
               <code class="inline">&lt;nesting-example&gt;</code>'s template —
               read and write the same
               <code class="inline">count</code>. You write them the same
               way: <code class="inline">increment(1)</code>,
               <code class="inline">{{ count }}</code> — flat, no marker.</p>

            <section class="host">
                <h2>The host in full</h2>
                <p class="note">Three copies of the counter UI at increasing
                   wrapper depth — zero, one, two — all written in
                   <code class="inline">&lt;nesting-example&gt;</code>'s own
                   template, so all three resolve against its
                   <code class="inline">count</code>. A
                   <code class="inline">&lt;page-echo&gt;</code> tag sits at
                   the bottom; that is a separate component with its own
                   template, covered at the end of the page. Every live
                   block below is rendered inside this page's
                   <code class="inline">&lt;nesting-example&gt;</code>
                   instance, so all four share one
                   <code class="inline">count</code> — click a button
                   anywhere and every
                   <code class="inline">count = N</code> on the page updates
                   together.</p>
                <code-block lang="ts">${escape`${HOST_SOURCE}`}</code-block>
            </section>

            <section class="ex">
                <h2>Depth 0 — no wrapper</h2>
                <p class="note">Buttons are direct children of the host.
                   <code class="inline">increment(1)</code> is written flat
                   and resolves on
                   <code class="inline">&lt;nesting-example&gt;</code>, the
                   component whose template it's in.</p>
                <div class="split">
                    <code-block lang="html">${escape`${DEPTH_1}`}</code-block>
                    <div class="live">${DEPTH_1}</div>
                </div>
            </section>

            <section class="ex">
                <h2>Depth 1 — one wrapper</h2>
                <p class="note">Wrapped in one
                   <code class="inline">&lt;nested-level&gt;</code>. Same
                   template, same scope — the binding still resolves on
                   <code class="inline">&lt;nesting-example&gt;</code>, not
                   on <code class="inline">&lt;nested-level&gt;</code>. The
                   author writes it flat:
                   <code class="inline">increment(5)</code>.</p>
                <div class="split">
                    <code-block lang="html">${escape`${DEPTH_2}`}</code-block>
                    <div class="live">${DEPTH_2}</div>
                </div>
            </section>

            <section class="ex">
                <h2>Depth 2 — two wrappers</h2>
                <p class="note">Two
                   <code class="inline">&lt;nested-level&gt;</code>s deep.
                   Still the same template, so still
                   <code class="inline">&lt;nesting-example&gt;</code>'s
                   scope. Still written flat.</p>
                <div class="split">
                    <code-block lang="html">${escape`${DEPTH_3}`}</code-block>
                    <div class="live">${DEPTH_3}</div>
                </div>
            </section>

            <p class="lede">So far every binding has lived in
               <code class="inline">&lt;nesting-example&gt;</code>'s own
               template. Now the different case.
               <code class="inline">&lt;page-echo&gt;</code> is a separate
               component, written in <em>its own</em> template. That
               template doesn't know where a
               <code class="inline">&lt;page-echo&gt;</code> tag will be
               placed — that is decided by whatever component uses the
               tag. By the same rule as above, bindings inside
               <code class="inline">&lt;page-echo&gt;</code>'s template
               would resolve against
               <code class="inline">&lt;page-echo&gt;</code>. But what if
               page-echo's template wants to reach <em>out</em> — to read
               and write state on whatever component placed its tag?</p>

            <p class="lede">That is the one place the caret
               (<code class="inline">^</code>) is used. A leading
               <code class="inline">^</code> on a binding means
               <em>"cross one template boundary outward — resolve in the
               scope that placed this template's tag, not in this
               template's own scope."</em> It is the author's tool for
               letting a template reach back up to whoever is using it.</p>

            <section class="host">
                <h2><code class="inline">&lt;page-echo&gt;</code> — a template reaching out</h2>
                <p class="note">Every binding in
                   <code class="inline">&lt;page-echo&gt;</code>'s template
                   starts with <code class="inline">^</code>. When a
                   <code class="inline">&lt;page-echo&gt;</code> tag is
                   placed inside
                   <code class="inline">&lt;nesting-example&gt;</code> (as
                   in the demo below), each <code class="inline">^</code>
                   crosses that one template boundary and lands on
                   <code class="inline">&lt;nesting-example&gt;</code> — so
                   <code class="inline">^.count</code> reads the same
                   <code class="inline">count</code> everything above
                   shares.</p>
                <code-block lang="ts">${escape`${PAGE_ECHO_SOURCE}`}</code-block>
            </section>

            <section class="ex">
                <h2>Live — <code class="inline">&lt;page-echo&gt;</code> in this host</h2>
                <p class="note">A <code class="inline">&lt;page-echo&gt;</code>
                   tag placed inside this
                   <code class="inline">&lt;nesting-example&gt;</code>.
                   Each <code class="inline">^</code> in its template
                   crosses out to
                   <code class="inline">&lt;nesting-example&gt;</code>, so
                   the numbers below stay locked to the three demos
                   above.</p>
                <div class="split">
                    <code-block lang="html">${escape`<page-echo></page-echo>`}</code-block>
                    <div class="live"><page-echo></page-echo></div>
                </div>
            </section>
        </div>
    `,
    styles: `${NESTING_STYLES}\n${WRAPPER_STYLES}\n${DOC_STYLES}`,
})
export class NestingExample extends RxElement<{ count: number }> {
    @observable count = 0;

    get status$(): Observable<string> {
        return this.count$.pipe(map((c) => {
            if (c === 0) { return 'zero'; }
            return c > 0 ? 'positive' : 'negative';
        }));
    }

    increment(amount: number): void {
        this.count += amount;
    }

    reset(): void {
        this.count = 0;
    }
}

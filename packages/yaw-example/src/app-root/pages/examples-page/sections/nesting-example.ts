import { map, type Observable } from 'rxjs';
import { Component, RxElement, state } from 'yaw';
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

<!-- model binding: page-echo's accent pushes up to the host -->
<page-echo [(accent)]="accent"></page-echo>
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
    template: NESTING_TEMPLATE,
})
export class NestingExample extends RxElement {
    @state count = 0;
    @state accent = '#050505';

    increment(amount: number): void { this.count = this.count + amount; }
    reset(): void { this.count = 0; }

    get status$(): Observable<string> {
        return this.count$.pipe(map((c) => c === 0 ? 'zero' : c > 0 ? 'positive' : 'negative'));
    }
}`;

const PAGE_ECHO_SOURCE = `@Component({
    selector: 'page-echo',
    template: \`
        <div class="echo" [class.blended]="blend">
            <!-- caret bindings reach the parent host -->
            <code>^count {{ ^count }}</code>
            <code>^status {{ ^status }}</code>
            <button onclick="^increment(2)">^increment(2)</button>
            <button onclick="^reset">^reset</button>

            <!-- local accent — pushes to host via model binding -->
            <code>accent {{ accent }}</code>
            <button onclick="cycleAccent" [style]="accentBtnStyle">accent</button>

            <!-- local blend — stays in this component, never leaves -->
            <code>blend {{ blend }}</code>
            <button onclick="toggleBlend" [class.active]="blend">blend</button>
        </div>
    \`,
})
export class PageEcho extends RxElement {
    @state accent = '#050505';
    @state blend = false;

    private readonly accents = ['#050505', '#0f2538', '#250f28', '#0f2510', '#25200f', '#280f0f', '#0f0f28'];

    private lighten(hex: string, amount: number): string {
        const c = (o: number) => Math.min(255, parseInt(hex.slice(o, o + 2), 16) + amount);
        return \`rgb(\${c(1)},\${c(3)},\${c(5)})\`;
    }

    get accentBtnStyle$() {
        return this.accent$.pipe(
            map((a) => ({ accent: a, bg: this.lighten(a, 70) })),
            map(({ accent, bg }) => \`border-color: \${accent}; color: \${accent}; background: \${bg}\`),
        );
    }

    cycleAccent(): void {
        const i = this.accents.indexOf(this.accent);
        this.accent = this.accents[(i + 1) % this.accents.length]!;
    }

    toggleBlend(): void {
        this.blend = !this.blend;
    }
}`;

const MINIMAL_HOST_SOURCE = `@Component({
    selector: 'nesting-example',
    template: \`
        <button onclick="increment(1)">+1</button>
        <p>count = {{count}}</p>
    \`,
})
export class NestingExample extends RxElement {
    @state count = 0;
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
                <h2><code class="inline">&lt;nesting-example&gt;</code> — minimal host</h2>
                <p class="note">The host stripped to its essentials. One
                   <code class="inline">@state</code>, one method, two
                   bindings. Both sit in the component's own template, so
                   both resolve against
                   <code class="inline">&lt;nesting-example&gt;</code>.</p>
                <code-block syntax="ts">${escape`${MINIMAL_HOST_SOURCE}`}</code-block>
            </section>

            <section class="host">
                <h2><code class="inline">&lt;nested-level&gt;</code> — a wrapper</h2>
                <p class="note">A custom element whose entire job is to draw a
                   framed box around its <code class="inline">&lt;slot&gt;</code>.
                   No behaviour, no state. In the live demo below, every
                   dashed box is one of these.</p>
                <code-block syntax="ts">${escape`${NESTED_LEVEL_SOURCE}`}</code-block>
            </section>

            <p class="lede"><code class="inline">&lt;page-echo&gt;</code> is a
               separate component with its own template and its own state.
               It demonstrates three patterns for how state can flow.
               <strong>Caret bindings</strong>
               (<code class="inline">^count</code>,
               <code class="inline">^increment(2)</code>) reach
               <em>out</em> to the host that placed the tag.
               <strong>Model binding</strong> — the host writes
               <code class="inline">&lt;page-echo
               [(accent)]="accent"&gt;</code> — keeps the child's
               <code class="inline">accent</code> and the host's
               <code class="inline">accent</code> in sync; when the child
               cycles its colour the host's background updates.
               <strong>Local state</strong> —
               <code class="inline">blend</code> — stays entirely inside
               the component. Toggling it applies
               <code class="inline">mix-blend-mode: difference</code> to
               the panel, but nothing outside ever sees it.</p>

            <section class="host">
                <h2><code class="inline">&lt;page-echo&gt;</code> — carets and model binding</h2>
                <p class="note">Three kinds of state in one component.
                   <code class="inline">^</code> bindings reach out to the
                   host's <code class="inline">count</code> and methods.
                   <code class="inline">accent</code> is local but the
                   model binding on the tag pushes each new value up to the
                   host, which drives the live section's background.
                   <code class="inline">blend</code> is purely local — it
                   toggles <code class="inline">mix-blend-mode: difference</code>
                   on the panel and nothing outside ever knows.</p>
                <code-block syntax="ts">${escape`${PAGE_ECHO_SOURCE}`}</code-block>
            </section>

            <p class="lede">Now the rule that ties it together. Wrapping a
               binding in a custom-element tag <em>inside your own
               template</em> does not change where the binding resolves.
               It is still in your template, so it is still your scope.
               A button sitting directly under
               <code class="inline">&lt;nesting-example&gt;</code> and a
               button sitting two
               <code class="inline">&lt;nested-level&gt;</code>s deep —
               both written in
               <code class="inline">&lt;nesting-example&gt;</code>'s
               template — read and write the same
               <code class="inline">count</code>. You write them the same
               way: <code class="inline">increment(1)</code>,
               <code class="inline">{{ count }}</code> — flat, no marker.</p>

            <section class="host">
                <h3>The template</h3>
                <p class="note">Three groups of buttons at increasing wrapper
                   depth — zero, one, two — all written in
                   <code class="inline">&lt;nesting-example&gt;</code>'s own
                   template, so all three resolve against its
                   <code class="inline">count</code>. At the bottom, a
                   <code class="inline">&lt;page-echo&gt;</code> tag drops
                   in the separate component introduced above — its
                   <code class="inline">^</code> bindings cross one boundary
                   and land on the same host.</p>
                <h4><code class="inline">NESTING_TEMPLATE</code> — the full template markup</h4>
                <code-block syntax="html">${escape`${NESTING_TEMPLATE}`}</code-block>
            </section>

            <section class="host">
                <h3>The component</h3>
                <p class="note">One <code class="inline">@state</code>, two
                   methods, one derived getter. The template above is the
                   entire UI — every binding in it resolves here.</p>
                <code-block syntax="ts">${escape`${HOST_SOURCE}`}</code-block>
            </section>

            <section class="ex">
                <h2>Live</h2>
                <p class="note">Everything above rendered together. All four
                   groups — three depths of buttons plus the
                   <code class="inline">&lt;page-echo&gt;</code> — share one
                   <code class="inline">count</code>. Click a button anywhere
                   and every counter updates. Click
                   <code class="inline">accent</code> in the
                   <code class="inline">&lt;page-echo&gt;</code> panel to
                   cycle the background — that is the model binding pushing
                   a local value up to the host.</p>
                <div class="live" [style.background]="accent">${NESTING_TEMPLATE}</div>
            </section>
        </div>
    `,
    styles: `${NESTING_STYLES}\n${WRAPPER_STYLES}\n${DOC_STYLES}`,
})
export class NestingExample extends RxElement {
    @state count = 0;
    @state accent = '#050505';

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

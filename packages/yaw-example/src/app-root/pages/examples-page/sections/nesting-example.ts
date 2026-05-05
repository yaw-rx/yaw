import { map, type Observable } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';
import { escape } from '../../../components/code-block/code-highlight.js';
import '../../../components/code-block.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';
import { TocSection } from '../../docs-page/directives/toc-section.js';
import { TocAnchor } from '../../docs-page/directives/toc-anchor.js';
import './nesting-example/components/nested-level.js';
import './nesting-example/components/page-echo.js';

const NESTING_STYLES = `
    :host { display: block; }
    .buttons { display: flex; flex-wrap: wrap; gap: 0.3rem; }
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

const NESTING_TEMPLATE = `
<!-- depth 0: buttons sit directly in the host's template -->
<div class="buttons">
    <button onclick="increment(1)">+1</button>
    <button onclick="increment(-1)">-1</button>
    <button onclick="reset">reset</button>
</div>
<p class="state">count = {{count}} <span class="status">({{status}})</span></p>

<!-- depth 1: buttons wrapped in one <nested-level> -->
<nested-level>
    <button onclick="increment(5)">+5</button>
    <button onclick="increment(-5)">-5</button>
</nested-level>
<p class="state">count = {{count}} <span class="status">({{status}})</span></p>

<!-- depth 2: buttons wrapped in two <nested-level>s -->
<nested-level>
    <nested-level>
        <button onclick="increment(10)">+10</button>
        <button onclick="increment(100)">+100</button>
    </nested-level>
</nested-level>
<p class="state">count = {{count}} <span class="status">({{status}})</span></p>

<!-- page-echo: a separate component with its own template and state -->
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
    styles: \`
        :host { display: block; }
        .nested { border: 1px dashed #333; border-radius: 6px;
                  padding: 0.5rem 0.75rem 0.6rem; margin: 0.3rem 0; background: #070707; }
        .tag { color: #555; font-size: 0.65rem; letter-spacing: 0.08em;
               text-transform: uppercase; margin-bottom: 0.4rem; }
        .content { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
    \`
})
export class NestedLevel extends RxElement {}`;

const HOST_SOURCE = `@Component({
    selector: 'nesting-example',
    template: NESTING_TEMPLATE,
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
}`;

const PAGE_ECHO_SOURCE = `@Component({
    selector: 'page-echo',
    template: \`
        <div class="echo" [class.blended]="blend">
            <div class="section">
                <div class="label">child template — caret prefix reaches the parent host</div>
                <div class="body">
                    <div class="row">
                        <code><span class="pre">^count</span> {{ ^count }}</code>
                        <span class="sep">·</span>
                        <code><span class="pre">^status</span> {{ ^status }}</code>
                    </div>
                    <div class="row">
                        <button onclick="^increment(2)">^increment(2)</button>
                        <button onclick="^reset">^reset</button>
                    </div>
                </div>
            </div>
            <div class="section">
                <div class="label">local <code class="inline">accent</code> state pushes to the host via tap binding</div>
                <div class="body">
                    <div class="row">
                        <code><span class="pre">accent</span> {{ accent }}</code>
                    </div>
                    <div class="row">
                        <button onclick="cycleAccent" [style]="accentBtnStyle">accent</button>
                    </div>
                </div>
            </div>
            <div class="section">
                <div class="label">local <code class="inline">blend</code> state — stays in this component, never leaves</div>
                <div class="body">
                    <div class="row">
                        <code><span class="pre">blend</span> {{ blend }}</code>
                    </div>
                    <div class="row">
                        <button onclick="toggleBlend" [class.active]="blend">blend</button>
                    </div>
                </div>
            </div>
        </div>
    \`,
    styles: \`
        :host { display: block; }
        .echo { background: #0a1128; border: 1px solid #1a2352; border-radius: 6px;
                padding: 1rem; color: #8af; font-family: monospace; font-size: 0.85rem; }
        .section + .section { margin-top: 1rem; }
        .label { color: #556; font-size: 0.7rem; letter-spacing: 0.08em;
                 text-transform: uppercase; margin-bottom: 0.5rem; }
        .label code { color: #8af; font-size: inherit; }
        .body { display: flex; flex-direction: column; gap: 0.4rem;
                padding: 0.5rem 0.6rem; background: #050505;
                border-radius: 4px; }
        .row { display: flex; gap: 0.5rem; align-items: center; }
        .row code { color: #8af; background: transparent; padding: 0.35rem 0.4rem; }
        .pre { color: #556; }
        .sep { color: #334; }
        .row button { background: #0f1a3a; border: 1px solid #1a2352; color: #8af;
                      padding: 0.35rem 0.7rem; font: inherit; font-size: 0.8rem;
                      cursor: pointer; border-radius: 4px; }
        .row button:hover { background: #182555; color: #fff; }
        .row button.active { background: #1a2352; border-color: #8af; color: #fff; }
        .echo.blended { mix-blend-mode: difference; }
    \`
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

@Component({
    selector: 'nesting-example',
    directives: [TocSection, TocAnchor],
    template: `
        <div class="page">
            <h1 toc-anchor="nesting-example">Nesting example</h1>

            <p class="lede">Bindings resolve against the component whose template
               they are written in — the <em>host</em>. Nesting a binding inside
               another element, including a custom element that projects its children
               through a slot, does not change where it resolves. This example uses
               three components to demonstrate the rule and the one mechanism that
               crosses a component boundary.</p>

            <section class="host">
                <h2><code class="inline">&lt;nested-level&gt;</code> — a stateless wrapper</h2>
                <p class="note">A custom element that draws a dashed box around its
                   <code class="inline">&lt;slot&gt;</code>. No state, no methods.
                   Every dashed box in the live demo below is one of these. Wrapping
                   buttons inside it does not change where their bindings resolve —
                   the buttons are still written in the host's template, so they
                   still resolve against the host.</p>
                <code-block syntax="ts">${escape`${NESTED_LEVEL_SOURCE}`}</code-block>
            </section>

            <section class="host">
                <h2><code class="inline">&lt;nesting-example&gt;</code> — the host</h2>
                <p class="note">The component that owns the state. Two
                   <code class="inline">@state</code> fields —
                   <code class="inline">count</code> and
                   <code class="inline">accent</code> — and a derived getter
                   <code class="inline">status$</code> that maps count to
                   "zero", "positive", or "negative". The template places buttons
                   at three depths: directly, inside one
                   <code class="inline">&lt;nested-level&gt;</code>, and inside two.
                   All three groups call <code class="inline">increment</code> and
                   read <code class="inline">count</code> on this component, because
                   all three are written in this component's template. At the bottom,
                   a <code class="inline">&lt;page-echo&gt;</code> tag drops in the
                   separate component shown next — its tap binding
                   <code class="inline">[(accent)]="accent"</code> keeps the child's
                   accent synced with the host's.</p>
                <p class="note">The template:</p>
                <code-block syntax="html">${escape`${NESTING_TEMPLATE}`}</code-block>
                <p class="note">The class:</p>
                <code-block syntax="ts">${escape`${HOST_SOURCE}`}</code-block>
            </section>

            <section class="host">
                <h2><code class="inline">&lt;page-echo&gt;</code> — crossing a component boundary</h2>
                <p class="note">Unlike <code class="inline">&lt;nested-level&gt;</code>,
                   this component has its own template and its own state. Its bindings
                   resolve against itself by default —
                   <code class="inline">blend</code> and
                   <code class="inline">accent</code> are local. To reach the host's
                   <code class="inline">count</code> and methods, it uses caret
                   bindings: <code class="inline">^count</code>,
                   <code class="inline">^increment(2)</code>. The caret prefix walks
                   one host boundary outward.</p>
                <code-block syntax="ts">${escape`${PAGE_ECHO_SOURCE}`}</code-block>
            </section>

            <section class="ex">
                <h2>Live</h2>
                <p class="note">All three components rendered together. Every button
                   at every depth reads and writes the same
                   <code class="inline">count</code>.
                   <code class="inline">&lt;page-echo&gt;</code> reaches it via
                   carets. Click <em>accent</em> to cycle the background — that is the
                   tap binding pushing a local value up to the host. Click
                   <em>blend</em> to toggle
                   <code class="inline">mix-blend-mode: difference</code> — that
                   state stays entirely inside
                   <code class="inline">&lt;page-echo&gt;</code>.</p>
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

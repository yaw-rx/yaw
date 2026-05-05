import { map, type Observable } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';
import { DocSection } from '../../components/doc-section.component.js';
import { escape } from '@yaw-rx/common';
import '../../components/code-block.component.js';
import { TocSection } from '../../directives/toc-section.directive.js';
import { TocAnchor } from '../../directives/toc-anchor.directive.js';
import './nesting-section/nested-level.component.js';
import './nesting-section/page-echo.component.js';

const NESTING_STYLES = `
    :host { display: block; }
    .buttons { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .state { margin: 0.75rem 0 0; font-family: var(--font-mono);
             color: var(--secondary); font-size: 0.85rem; }
    .state .status { color: var(--accent); }
    button { background: var(--bg-3); border: var(--border-width) solid var(--border); color: var(--white);
             padding: 0.5rem 1rem; font: inherit; font-size: 0.9rem;
             cursor: pointer; border-radius: var(--radius); margin: 0.15rem; }
    button:hover { background: var(--bg-5); border-color: var(--dim); }
`;

const WRAPPER_STYLES = `
    .live { display: flex; flex-direction: column; gap: 0.5rem;
            padding: 1.25rem; background: var(--bg-1);
            border: var(--border-width) solid var(--bg-5); border-radius: var(--radius-lg); }
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
        .nested { border: 1px dashed var(--border); border-radius: var(--radius);
                  padding: 0.5rem 0.75rem 0.6rem; margin: 0.3rem 0; background: #070707; }
        .tag { color: var(--dim); font-size: 0.65rem; letter-spacing: var(--tracking);
               text-transform: uppercase; margin-bottom: 0.4rem; }
        .content { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
    \`
})
export class NestedLevel extends RxElement {}`;

const HOST_SOURCE = `@Component({
    selector: 'nesting-section',
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
        .echo { background: #0a1128; border: var(--border-width) solid var(--navy); border-radius: var(--radius);
                padding: 1rem; color: var(--accent); font-family: var(--font-mono); font-size: 0.85rem; }
        .section + .section { margin-top: 1rem; }
        .label { color: var(--slate); font-size: 0.7rem; letter-spacing: var(--tracking);
                 text-transform: uppercase; margin-bottom: 0.5rem; }
        .label code { color: var(--accent); font-size: inherit; }
        .body { display: flex; flex-direction: column; gap: 0.4rem;
                padding: 0.5rem 0.6rem; background: var(--bg-1);
                border-radius: var(--radius-sm); }
        .row { display: flex; gap: 0.5rem; align-items: center; }
        .row code { color: var(--accent); background: transparent; padding: 0.35rem 0.4rem; }
        .pre { color: var(--slate); }
        .sep { color: #334; }
        .row button { background: #0f1a3a; border: var(--border-width) solid var(--navy); color: var(--accent);
                      padding: 0.35rem 0.7rem; font: inherit; font-size: 0.8rem;
                      cursor: pointer; border-radius: var(--radius-sm); }
        .row button:hover { background: #182555; color: var(--white); }
        .row button.active { background: var(--navy); border-color: var(--accent); color: var(--white); }
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
    selector: 'nesting-section',
    directives: [TocSection, TocAnchor],
    template: `
        <div class="page">
            <h1 toc-anchor="nesting-example">Nesting example</h1>

            <p class="lede"><a href="/docs/components/bindings">Bindings</a> resolve
               against the component whose template they're written in. Nesting depth
               is irrelevant. A <code class="inline">${escape`<div>`}</code> wrapper,
               a custom element wrapper, two custom element wrappers — doesn't matter.
               If the binding is in your template, it resolves against you.</p>

            <section class="host">
                <h2><code class="inline">${escape`<nested-level>`}</code> — a stateless wrapper</h2>
                <p class="note">A stateless wrapper that
                   <a href="/docs/components/projection">projects</a> its children
                   through a <code class="inline">${escape`<slot>`}</code> inside a
                   dashed border and a label. It has no state and no behaviour — it
                   exists to prove that wrapping bindings in a custom element doesn't
                   redirect where they resolve. This component adds visual framing
                   but introduces no scope boundary.</p>
                <code-block syntax="ts">${escape`${NESTED_LEVEL_SOURCE}`}</code-block>
            </section>

            <section class="host">
                <h2><code class="inline">${escape`<page-echo>`}</code> — a component boundary</h2>
                <p class="note">This <em>is</em> a
                   <a href="/docs/components/bindings">component boundary</a>.
                   Its bindings resolve against itself by default —
                   its <a href="/docs/components/state"><code class="inline">@state</code></a> fields
                   <code class="inline">blend</code> and
                   <code class="inline">accent</code> are local. It assumes its host
                   has a <code class="inline">count</code> field and an
                   <code class="inline">increment</code> method, and uses
                   <a href="/docs/components/paths/carets">caret bindings</a>
                   to reach them
                   (<code class="inline">${escape`^count`}</code>,
                   <code class="inline">${escape`^increment(2)`}</code>). The tap binding
                   <code class="inline">${escape`[(accent)]="accent"`}</code> writes
                   in the opposite direction — when
                   <code class="inline">${escape`[(accent)]`}</code> changes, the new
                   value pushes into the host's
                   <code class="inline">accent</code>.
                   Wrapping in a stateless element doesn't change scope, but a component
                   with its own template does — and carets are how you cross that
                   boundary.</p>
                <code-block syntax="ts">${escape`${PAGE_ECHO_SOURCE}`}</code-block>
            </section>

            <section class="host">
                <h2><code class="inline">${escape`<nesting-section>`}</code> — the host template (<code class="inline">NESTING_TEMPLATE</code>)</h2>
                <p class="note">The host template places buttons at three
                   nesting depths. Some sit directly in the template, some are
                   wrapped in one
                   <code class="inline">${escape`<nested-level>`}</code>, and some
                   are wrapped in two.
                   All three groups
                   <a href="/docs/components/paths">resolve against</a> this component
                   because all three are written in its template. At the bottom,
                   <code class="inline">${escape`<page-echo [(accent)]="accent">`}</code>
                   — when <code class="inline">${escape`<page-echo>`}</code>'s
                   <code class="inline">${escape`[(accent)]`}</code> changes, the
                   <a href="/docs/components/bindings/data">tap binding</a> pushes
                   it into the host's <code class="inline">accent</code>.</p>
                <code-block syntax="html">${escape`${NESTING_TEMPLATE}`}</code-block>
            </section>

            <section class="host">
                <h2><code class="inline">${escape`<nesting-section>`}</code> — the host class</h2>
                <p class="note">The class owns all the state that the template and
                   its children read. <code class="inline">count</code> and
                   <code class="inline">accent</code> are
                   <code class="inline">@state</code> fields — each one backs an
                   observable stream that bindings subscribe to.
                   <code class="inline">status$</code> is a derived getter that maps
                   <code class="inline">count</code> to the strings
                   "zero", "positive", or "negative".
                   <code class="inline">increment</code> and
                   <code class="inline">reset</code> are the methods that the
                   template's <code class="inline">onclick</code> bindings call.</p>
                <code-block syntax="ts">${escape`${HOST_SOURCE}`}</code-block>
            </section>

            <section class="ex">
                <h2>Live</h2>
                <p class="note">All three components rendered together. The
                   buttons at depth 0 sit directly in the
                   <code class="inline">${escape`<nesting-section>`}</code> template.
                   The buttons inside the dashed boxes are wrapped in one or two
                   <code class="inline">${escape`<nested-level>`}</code> elements —
                   but they still resolve against the host, so they read and write
                   the same <code class="inline">count</code>. At the bottom,
                   <code class="inline">${escape`<page-echo>`}</code> reaches
                   <code class="inline">count</code> via carets, and its tap binding
                   <code class="inline">${escape`[(accent)]="accent"`}</code> pushes
                   <code class="inline">${escape`<page-echo>`}</code>'s
                   <code class="inline">accent</code> into the host's
                   <code class="inline">accent</code> — click the accent button to
                   cycle the background.
                   <code class="inline">blend</code> stays entirely inside
                   <code class="inline">${escape`<page-echo>`}</code> and nothing
                   outside sees it.</p>
                <div class="live" [style.background]="accent">${NESTING_TEMPLATE}</div>
            </section>
        </div>
    `,
    styles: `${NESTING_STYLES}\n${WRAPPER_STYLES}`,
})
export class NestingExample extends DocSection {
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

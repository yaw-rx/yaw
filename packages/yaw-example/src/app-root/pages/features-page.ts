import { Component, RxElement, state } from '@yaw-rx/core';
import { escape } from '@yaw-rx/common/escape';
import { interval, scan, map, Subscription, animationFrameScheduler, type Observable } from 'rxjs';
import '../pages/examples-page/signal-meter-section/signal-meter.component.js';
import '../pages/examples-page/slider-section/yaw-slider.component.js';
import '../pages/examples-page/color-playground-section/color-playground.component.js';
import '../pages/examples-page/graph-section/rx-graph.component.js';

const POINTS = 120;
const SAMPLE_MS = 80;

@Component({
    selector: 'features-page',
    template: `
        <main class="content">
            <header>
                <h1>Features</h1>
                <p class="lede">Every feature below fell out of using the platform correctly.
                Not dedicated infrastructure. Consequences.</p>
            </header>

            <div class="flow">
                <div class="demo right">
                    <h2><a href="/examples/signal-meter">Signal meter</a></h2>
                    <signal-meter [strength]="meterStrength" hueStart="340" hueEnd="140" lightness="55" glow="14"></signal-meter>
                </div>

                <ul class="consequences">
                    <li>One dependency — <a href="https://rxjs.dev">RxJS</a>.
                    One abstraction — the Observable, a monad. It's the right one
                    and it's being
                    <a href="https://github.com/WICG/observable">standardised</a>
                    (even RxJS is on borrowed time)
                    and you've been using it all along —
                    <code>addEventListener</code>, <code>MutationObserver</code>,
                    <code>IntersectionObserver</code>, <code>ResizeObserver</code>,
                    <code>PerformanceObserver</code>, …</li>

                    <li>Template rendering as <code>innerHTML</code> — the browser's
                    C++ HTML parser does the work. The template renders once — the fastest
                    path into the DOM — and never re-renders. Updates are surgical:
                    each binding subscribes to its node directly. No virtual DOM, no
                    reconciler, no diff pass, no "should this component update?"</li>

                    <li><a href="/docs/components/state/decorator">One primitive for reactive state</a> —
                    <code>${escape`@state`}</code> wraps a field in a
                    <code>BehaviorSubject</code>. It lives on the DOM nodes
                    themselves — <code>${escape`{{count}}`}</code> resolves against the
                    element that owns it. Services use the same observable.
                    No signals, no atoms, no stores. One mechanism everywhere.</li>

                    <li>Template binding as <a href="/docs/components/paths">path
                    resolution</a>, not a template language.
                    Logic stays in TypeScript where it belongs, not
                    in a proxy language between your code and the DOM. No DSL, no pipes,
                    no structural directive syntax.
                    <a href="/docs/components/bindings/data">One grammar</a> for text,
                    properties, attributes, classes, styles, taps, events, and refs.
                        <ul>
                            <li><a href="/docs/components/paths/dotted">Dotted paths</a>
                            resolve segment by segment — each segment independently
                            subscribes if it's observable. Any mix of reactive and plain
                            segments works.</li>
                        </ul>
                    </li>
                </ul>

                <div class="demo left wide">
                    <h2><a href="/examples/rx-graph">Reactive graph</a></h2>
                    <rx-graph [config]="graphConfig" [series]="graphSeries"></rx-graph>
                </div>

                <ul class="consequences">
                    <li><a href="/docs/components/paths/carets">Scope resolution as DOM
                    traversal</a>, not explicit annotation. The DOM is already a tree —
                    bindings just walk it.
                        <ul>
                            <li><a href="/examples/nesting-example">A nested component</a> — <code>${escape`{{count}}`}</code> resolves against the host.
                            <code>${escape`{{^^count}}`}</code> walks up two host ancestors
                            via <code>${escape`element.closest('[data-rx-host]')`}</code>.</li>
                            <li><a href="/showcase">A leaf component three layers deep</a> calls a method on
                            the root, passing data from the middle:
                            <code>${escape`^^.toggleStep(^.trackKey, idx)`}</code>. No props
                            drilled, no events emitted, no context provider.</li>
                        </ul>
                    </li>

                    <li><a href="/examples/reactive-palette">Child state can flow up</a> —
                    <code>${escape`[(value)]="hue"`}</code>. No <code>@Output()</code>
                    decorator. No event emitter. No callback prop.</li>

                    <li><a href="/docs/services/resolve">Dependency injection</a> as a DOM subtree,
                    not a module graph. Provide at a component, every descendant resolves
                    it. The element tree is the injector tree. 94 lines.</li>

                    <li><a href="/docs/directives/hooks">Framework internals are open
                    seams</a>, not closed walls — directives can take over DOM lifecycle,
                    inject new names into the binding system, or change how subscriptions
                    fire. No plugin API, no renderer subclass. Register a function, the
                    framework yields.</li>

                    <li>Iterative rendering as an optional, tree-shakable
                    <a href="/docs/directives/builtin/rx-for">directive</a>, not a framework
                    primitive. Don't use it, don't ship it. Splat, scope, destructure,
                    keyed — one expression.</li>
                </ul>

                <div class="demo right wide">
                    <h2><a href="/examples/reactive-palette">Color playground</a></h2>
                    <color-playground></color-playground>
                </div>

                <ul class="consequences">
                    <li>Your state is already observable —
                    <a href="/docs/components/state/dollar">just transform it</a>.
                        <ul>
                            <li>No <code>computed()</code>. No <code>useMemo()</code>.
                            No dependency arrays.</li>
                            <li><code>${escape`Observable<number[]>`}</code>
                            <a href="/examples/rx-graph">flows through a binding</a>
                            the same way a number does — no framework input system.</li>
                        </ul>
                    </li>

                    <li><a href="/docs/components/marshalling/custom-codecs">Typed
                    attributes</a>, not manual casting. Declare
                    <code>${escape`@state total: Decimal`}</code> and the string attribute
                    becomes a <code>Decimal</code> on connect. No
                    <code>${escape`Number(params['id'])`}</code> scattered through your
                    code. <code>Temporal.PlainDate</code>, <code>Address</code> — same
                    story.</li>

                    <li><a href="/docs/components/bindings/imperative">Refs are the raw DOM node</a> —
                    <code>${escape`<canvas #graph>`}</code> gives you an
                    <code>HTMLCanvasElement</code>. Not a wrapper. Not a ref object.
                    The element itself.</li>

                    <li><a href="/docs/components/lifecycle">Lifecycle</a> is
                    <code>connectedCallback</code> and <code>disconnectedCallback</code>.
                    The only hook we added was <code>onRender</code> and it's only because we had to because we inject the template.</li>

                    <li>Automatic cleanup — <code>disconnectedCallback</code> unsubscribes
                    all bindings, tears down directives, destroys injector instances. No
                    <code>useEffect</code> cleanup functions. You only clean up what
                    you own.</li>

                    <li><a href="/docs/navigation/api">Routing</a> as a
                    <code>BehaviorSubject</code> — one service, one element, one
                    observable. Active links, lazy loading, transitions — just
                    subscriptions to the same stream.</li>

                    <li><a href="/docs/ssg">SSG</a> — 292 lines.
                        <ul>
                            <li><a href="/docs/ssg/browser">Puppeteer visiting routes in parallel browser tabs</a> — the
                            browser's own engine renders, not a JS-side reimplementation.</li>
                            <li>Templates compiled at build time —
                            <code>${escape`{{count}}`}</code> becomes
                            <code>${escape`<span data-rx-bind-text="count">`}</code>.
                            The runtime reads <code>data-rx-bind-*</code> attributes
                            off the DOM — the runtime template parser is skipped.</li>
                            <li>No <a href="/docs/ssg/hydration">hydration mismatch</a> —
                            server-rendered HTML with custom elements upgrades in place.
                            No virtual tree to reconcile against.</li>
                        </ul>
                    </li>

                    <li><a href="/docs/components/projection">Content projection</a> as
                    <code>${escape`<slot>`}</code> — children go in, the template says
                    where they appear. <code>rx-if</code> (tree-shakable like
                    <code>rx-for</code>) stashes DOM in a
                    <code>${escape`<template>`}</code> element — the browser's own
                    inert container. No <code>ng-content</code>, no
                    <code>{children}</code> prop.</li>

                    <li><a href="/docs/getting-started/bundler-config">Bundler agnostic</a>
                    — Vite, Rollup, esbuild, Webpack. The framework is a TypeScript
                    transformer and a runtime. Not coupled to a build tool.</li>

                    <li>The Elements panel just works — no shadow DOM to pierce, no virtual
                    tree to decode. <code>querySelector</code> returns the actual component.
                    You can call methods on it from the console.</li>

                    <li>The CSS cascade just works — no shadow DOM encapsulation to
                    fight. Styles scoped by selector prefix, not encapsulation. Theming
                    just works. No <code>::part()</code> escape hatches. The accessibility
                    tree is the component tree — screen readers see what's rendered.</li>

                    <li>Third-party DOM libraries just work — D3, GSAP, Leaflet expect
                    elements. Yaw gives them elements. No refs, no effects, no portal
                    hacks.</li>

                    <li>Standard events, <code>MutationObserver</code>, back/forward cache,
                    browser profiling — all work because the components are real DOM nodes
                    that the browser already knows how to handle.</li>
                </ul>
            </div>

            <p class="closer">Side effects of correct foundational decisions, delivered in hundreds of lines
            instead of hundreds of thousands.</p>

        </main>
    `,
    styles: `
        :host { display: block; background: var(--black); min-height: 100vh;
                padding: 6rem 1.25rem 2.5rem; color: var(--secondary); box-sizing: border-box; }
        .content { max-width: 1200px; margin: 0 auto; }
        h1 { color: var(--white); font-size: 2.5rem; font-weight: 900;
             letter-spacing: -1px; margin: 0 0 0.75rem; }
        .lede { color: var(--secondary); line-height: 1.7; margin: 0 0 1.5rem; }
        .flow { line-height: 1.8; font-size: 1.05rem; }
        .flow::after { content: ''; display: table; clear: both; }
        .demo { width: 280px; padding: 0.25rem 0.75rem 0.75rem; background: var(--bg-2);
                border: var(--border-width) solid var(--bg-5);
                border-radius: var(--radius-lg); margin-top: 0.5rem; margin-bottom: 0.75rem; }
        .demo h2 { font-size: 1.1rem; font-weight: 700; color: var(--white);
                   margin: 0 0 0.5rem; letter-spacing: 0.02em; }
        .demo signal-meter { display: block; margin: 0.5rem auto 0.5rem; width: fit-content; }
        .demo color-playground { display: grid; grid-template-columns: auto 1fr;
                gap: 0.75rem 1rem; align-items: center; margin: 1rem 0.5rem 0.5rem; }
        .demo rx-graph { display: block; margin: 0.5rem 0 0; }
        .demo rx-graph canvas { height: 21rem; }
        .demo.right { float: right; margin-left: 2rem; }
        .demo.left { float: left; margin-right: 2rem; }
        .demo.wide { width: 360px; }
        .consequences { padding-left: 1.2rem; margin: 0 0 1rem; }
        .consequences li { padding: 0.4rem 0; }
        .consequences ul { padding-left: 1rem; margin: 0.3rem 0 0; }
        .consequences code { background: var(--bg-3); padding: 0.1rem 0.4rem;
                             border-radius: 3px; font-size: 0.9em; color: var(--accent); }
        .closer { color: var(--secondary); font-weight: 900; font-size: 1.15rem;
                  margin: 0; }
        @media (max-width: 768px) {
            .demo { float: none; width: 100%; margin: 0 0 1.5rem; }
        }
    `,
})
export class FeaturesPage extends RxElement {
    @state graphConfig = { walk: { label: 'random walk', color: '#8af' } };
    @state graphSeries: Record<string, Observable<number[]>> = {};
    @state meterStrength = 0;

    private readonly walk$ = interval(SAMPLE_MS).pipe(
        scan((pts) => {
            const last = pts[pts.length - 1] ?? 50;
            const next = Math.max(0, Math.min(100, last + (Math.random() - 0.5) * 8));
            const out = [...pts, next];
            return out.length > POINTS ? out.slice(out.length - POINTS) : out;
        }, new Array(POINTS).fill(50) as number[]),
    );

    private io: IntersectionObserver | undefined;
    private animSub = new Subscription();

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

        this.animSub.add(
            interval(0, animationFrameScheduler).pipe(
                scan((t) => t + 0.015, 0),
                scan((t) => t + 0.015 * (0.4 + 0.6 * (1 - Math.abs(Math.sin(t)))), 0),
                map(t => 50 + 40 * Math.sin(t)),
            ).subscribe(v => { this.meterStrength = v; }),
        );

    }

    private pause(): void {
        this.graphSeries = {};
        this.animSub.unsubscribe();
        this.animSub = new Subscription();
    }
}

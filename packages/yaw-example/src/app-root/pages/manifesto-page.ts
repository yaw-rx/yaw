import { Component, RxElement } from '@yaw-rx/core';
import { escape } from '@yaw-rx/common';
import '../components/code-block.js';
import './manifesto-page/sections/hero.js';
import './manifesto-page/sections/stat-counter.js';
import './manifesto-page/sections/manifesto.js';
import './manifesto-page/sections/footer.js';

const REACT_SNIPPET = `
    // React 19: 60KB gzipped to call appendChild
    const [count, setCount] = useState(0);
    useEffect(() => { document.title = count; }, [count]);
`;

const YAW_SNIPPET = `
    // YAW: 16KB gzipped. Direct. Honest.
    @state count = 0;
    // That's it. The DOM updates. No diff. No reconciliation.
`;

@Component({
    selector: 'manifesto-page',
    template: `
        <hero-section></hero-section>

        <div class="sections">
            <manifesto-section heading="The Wrong Turn">
                <p>We were handed a runtime that renders trees in C++, and we responded by building
                JavaScript replicas of it. Twice. Once in Google's cathedral, once in Facebook's garage.</p>
                <p>React asks you to pretend the DOM doesn't exist, then builds a virtual one, diffs it,
                and finally touches the real thing. The virtual part is pure tax.
                You pay for the allocation, you pay for the diff, you pay for the reconciliation,
                and at the end of the day you still call <code>appendChild</code> like it's 1998.
                All to solve a problem they invented: "What if direct DOM manipulation was unpredictable?"
                It wasn't.</p>
                <p>Angular shipped a framework that downloads half the internet to render a button.
                Zone.js monkey-patches every async API in the browser just to know when to check
                if anything changed. They built a change detection system so complex it needs its own
                debugging tools. And for what? So you can write <code>${escape`{{user.name}}`}</code> instead of
                <code>${escape`user.name$.subscribe(name => this.textContent = name)`}</code>.
                They've since conceded by shipping signals — a second reactivity primitive bolted
                onto a framework that wasn't designed for them. Two abstractions deep and Zone.js
                still isn't gone.</p>
                <p>Both replaced <code>HTMLElement</code> with their own component model. The browser's
                built-in tools — Elements panel, <code>querySelector</code>,
                <code>connectedCallback</code>, <code>closest()</code> — stopped working.
                So they rebuilt those too.</p>
                <code-block syntax="ts">${escape`${REACT_SNIPPET}`}</code-block>
            </manifesto-section>

            <manifesto-section heading="&quot;Sophistication&quot;">
                <p>They told us this was necessary. That the web was "too complex" for simple solutions.
                That we needed "predictable state management" and "unidirectional data flow"
                and "fine-grained reactivity."</p>
                <p>These are not insights. These are apologies for overhead.</p>
                <p>Angular's "change detection" is "we have no idea when your state changes so we check
                everything, constantly, or patch the browser to tell us." React's "unidirectional data flow"
                is just "we diff two trees because we don't trust you to update what changed."</p>
                <p>The actual solution was always there: push updates directly to the DOM when you know
                they happened. That's what Observables do. That's what the browser's been doing
                since <code>MutationObserver</code>.</p>
                <p>The "sophistication" was never in the runtime. It was in convincing you that you needed it.</p>
            </manifesto-section>

            <manifesto-section heading="Premature Deoptimization">
                <p>DOM writes were never slow. Inserting elements takes
                microseconds. At a few thousand elements, the browser lags regardless — layout and paint
                are the bottleneck, not JavaScript. They built their entire architecture around
                optimising something that doesn't matter at small scale and can't be helped at large scale.
                <a href="/examples/scheduler-theatre">See it for yourself.</a></p>
                <p>Add a layer that makes simple things slow, then spend a career making the layer fast.</p>
                <p>We optimise for latency — the thinnest possible path between intent and effect.
                The user doesn't care how cleverly your framework writes to the DOM. Layout is already lazy precisely because it's expensive —
                it's not something you need a framework to optimise for you.</p>
                <p>The performance pitch isn't ours. It's the browser's. We get out of its way.</p>
            </manifesto-section>

            <manifesto-section heading="Our Heresy">
                <p>We reject Zone.js. Not because we hate debugging, but because we can unsubscribe.</p>
                <p>We reject the virtual DOM. Not because we're Luddites, but because we can read.</p>
                <p>We reject 3GB of <code>node_modules</code>. Not because we enjoy suffering, but because
                the platform already ships with a DOM.</p>
                <p>We write <code>${escape`{{count}}`}</code> and <code>${escape`[label]="status"`}</code>
                because no one wants to write <code>${escape`count$.subscribe(v => el.textContent = v)`}</code> inline.
                That's not a principle — that's jQuery with extra steps. The template is the abstraction
                that earns its keep: it compiles to exactly those subscriptions and nothing else. No virtual
                copy. No diff. No reconciliation queue. Just <code>${escape`data-rx-bind-prop-label="status"`}</code>
                stamped into real DOM, read by the element that owns it.</p>
                <p><code>rx-for</code> stamps DOM nodes. The browser instantiates them. They bind themselves.
                The tree walks itself. We don't manage components — we register custom elements
                and get out of the way.</p>
                <p>This is not minimalism for aesthetics. This is removing solutions to problems we didn't have.</p>
                <code-block syntax="ts">${escape`${YAW_SNIPPET}`}</code-block>
            </manifesto-section>

            <manifesto-section heading="The Fallout">
                <p>Every feature below fell out of using the platform correctly.
                Not dedicated infrastructure. Consequences.</p>

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

                    <li><a href="/docs/components/state/dollar">Derived values</a> by
                    transforming existing observables, not a dedicated primitive. Your
                    state is already observable — just transform it.
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

                    <li>Iterative rendering as an optional, tree-shakable
                    <a href="/docs/directives/builtin/rx-for">directive</a>, not a framework
                    primitive. Don't use it, don't ship it. Splat, scope, destructure,
                    keyed — one expression.</li>

                    <li><a href="/docs/components/bindings/imperative">Refs</a> are the raw DOM node —
                    <code>${escape`<canvas #graph>`}</code> gives you an
                    <code>HTMLCanvasElement</code>. Not a wrapper. Not a ref object.
                    The element itself.</li>

                    <li><a href="/docs/services/resolve">Dependency injection</a> as a DOM subtree,
                    not a module graph. Provide at a component, every descendant resolves
                    it. The element tree is the injector tree. 94 lines.</li>

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

                <p>Side effects of correct foundational decisions, delivered in hundreds of lines
                instead of hundreds of thousands.</p>
            </manifesto-section>

            <manifesto-section heading="The Numbers">
                <p>The core runtime — <code>state.ts</code>, <code>rx-element.ts</code>,
                <code>setupBindings.ts</code>, <code>bind.ts</code> — is 681 lines.
                The whole framework including compile-time transforms and SSG is about 3,500.</p>
                <p>React's runtime alone is 245,000 lines. Angular's is 305,000+.</p>
            </manifesto-section>

            <manifesto-section heading="The Platform Is Enough">
                <p>HTML parses. Custom elements instantiate. Attributes are strings we can scan.
                <code>connectedCallback</code> is <code>onInit</code>.
                <code>disconnectedCallback</code> is <code>onDestroy</code>.
                <code>innerHTML</code> renders trees.
                RxJS handles asynchrony. The DI container is a Map with a parent pointer.
                Everything else is ceremony.</p>
                <p>You want server-side rendering? The browser parses HTML. You want hydration?
                Custom elements upgrade when definitions load. You want lazy loading? Dynamic
                <code>import()</code> and <code>customElements.define</code>. You want dev tools?
                They're called the <strong>Elements panel</strong>. Ours works because we didn't break it.</p>
                <p>Yes, we built yet another framework 🙄 (it's one you can read in an afternoon!).
                But the convention it's built on will
                hopefully outlast them all: extend <code>HTMLElement</code>, scan your attributes,
                subscribe to Observables, clean up when removed. And that's the API. That's the whole API.</p>
            </manifesto-section>

            <manifesto-section heading="To the Angular Dev">
                <p>We know the churn is exhausting. NgModule to standalone, decorators to signals,
                Zone.js to zoneless — each one an admission that they got the last abstraction wrong.
                Again.</p>
                <p>Our DI is a function that walks up a parent chain. Our components are classes that
                extend <code>HTMLElement</code>. Our templates are HTML. You already know this pattern.
                We just removed the 305,000 lines of abstraction between you and it.</p>
            </manifesto-section>

            <manifesto-section heading="To the React Dev">
                <p>The <code>useEffect</code> dependency array is a manual memory management exercise
                disguised as declarative code. The "rules of Hooks" are a runtime linter because the
                abstraction leaks. The concurrent features are fixing scheduling problems created by
                the scheduler.</p>
                <p>We don't have rules. We have <code>subscribe</code> and <code>unsubscribe</code>.
                We don't have a scheduler. We have the browser's event loop. We don't have "server
                components" because our components <strong>are</strong> HTML — they render the same everywhere.</p>
            </manifesto-section>

            <manifesto-section heading="The Measure of Success">
                <p>We ship in kilobytes, not megabytes. We start instantly, not after hydration.
                We update precisely, not after diffing. We garbage collect automatically, not after
                manual effect cleanup.</p>
                <p>Our <code>node_modules</code> fits in an email attachment.
                Our mental model fits in a sentence:</p>
                <strong class="model">Observables push, DOM reflects, elements clean up.</strong>
                <p>The web was never broken. We just convinced ourselves it was,
                then sold each other expensive repairs.</p>
                <p class="closer">We're done. The DOM is fine. Use it.</p>
            </manifesto-section>
        </div>

        <page-footer></page-footer>
    `,
    styles: `
        :host { display: block; background: #000; min-height: 100vh; }
        .sections { padding: 2rem 0 0; }
        code-block { margin: 1rem 0; }
    `
})
export class ManifestoPage extends RxElement {}

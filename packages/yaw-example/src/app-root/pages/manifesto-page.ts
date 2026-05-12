import { Component, RxElement } from '@yaw-rx/core';
import { escape } from '@yaw-rx/common/escape';
import { ts } from '@yaw-rx/common/tags';
import '../components/code-block.component.js';
import './manifesto-page/hero-section.component.js';
import './manifesto-page/stat-counter.component.js';
import './manifesto-page/manifesto-section.component.js';
import './manifesto-page/footer-section.component.js';

const REACT_SNIPPET = ts`
    // React 19: 60KB gzipped to call appendChild
    const [count, setCount] = useState(0);
    useEffect(() => { document.title = count; }, [count]);
`;

const YAW_SNIPPET = ts`
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
                <code-block syntax="ts">${escape`${REACT_SNIPPET}`}</code-block>
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
                <hr style="border: none; border-top: var(--border-width) solid var(--bg-6); margin: 1.5rem 0;"/>
                <p><strong>The principle:</strong> don't pay up front for a class of
                optimisation until you're hitting a workload that actually needs it.
                Premature deoptimisation is paying for the pathological case in every ordinary one.</p>
                <p>Default to no scheduler, no
                suppression, no coalescing infrastructure. Pay only for the work that's
                actually present. When you have a workload where intermediate values
                matter — expensive derivations, wide fan-out, cascading computeds — you
                reach for an operator that fits the case. The cost is local to the case that
                needs it. Everything else stays cheap.</p>
                <p>YAW stubbornly refuses to inherit the cost of solving problems most apps don't
                have, and pushes the few apps that do toward the platform-level tools
                that solve them precisely.</p>
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

            <manifesto-section heading="The Numbers">
                <p>The core runtime — <code>state.ts</code>, <code>rx-element.ts</code>,
                <code>binding/setup.ts</code>, <code>binding/path.ts</code> — is 560 lines.</p>
                <p>The whole framework across all packages is 4,712. That includes
                <code>yaw-common</code>, a shared template and style transform library (722 lines),
                <code>yaw-transformer</code>, a TypeScript build-time transformer (567 lines),
                <code>yaw-ts-plugin</code>, a TypeScript language service plugin (464 lines),
                <code>yaw-ssg</code>, an SSG renderer (261 lines),
                <code>yaw-vscode</code>, a VSCode extension for inline template and style
                highlighting (150 lines), and four bundler plugins —
                <code>yaw-vite</code> (64 lines), <code>yaw-esbuild</code> (59 lines),
                <code>yaw-rollup</code> (42 lines), <code>yaw-webpack</code> (13 lines).</p>
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
                <p>Yes, we built yet another framework 🙄 (although it's one you can read in an afternoon!).
                But the convention it's built on will
                hopefully outlast them all: extend <code>HTMLElement</code>, scan your attributes,
                subscribe to Observables, clean up when removed. And that's the API. That's the whole API.</p>
            </manifesto-section>

            <manifesto-section heading="Time Is On Our Side">
                <p>The platform is enough today. It will be more than enough tomorrow.</p>
                <p>Custom elements instantiate faster every Chrome release.
                <code>MutationObserver</code> is faster than it was two years ago.
                The DOM API keeps getting engine specialisation work.
                <code>Observable</code> is at WICG, on track to become a primitive —
                RxJS is already preparing to be the polyfill rather than the implementation.
                When it lands, our hot path moves into native code. We don't migrate to it.
                We don't release for it. We were already using it.
                The code shipped last year gets faster while we sleep.</p>
                <p>The frameworks racing each other on synthetic benchmarks today are racing
                on userland JavaScript. A virtual DOM is not a primitive the engines are optimising.
                A scheduler is not a primitive. Change detection is not a primitive. Those costs
                stay where they were put — in framework code, optimised by hand, against a moving
                target. The framework team keeps running. The numbers move a little, then stop
                moving, then need rewriting.</p>
                <p>The bet isn't that we're fastest today. The bet is that we built on the
                right primitives — and they're the ones getting engine work.</p>
                <p class="closer">Time will settle the argument.</p>
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

        <footer-section></footer-section>
    `,
    styles: `
        :host { display: block; background: var(--black); min-height: 100vh; }
        .sections { padding: 0; }
        code-block { margin: 1rem 0; }
    `
})
export class ManifestoPage extends RxElement {}

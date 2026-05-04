import { Component, RxElement } from '@yaw-rx/core';
import '../components/code-block.js';
import './manifesto-page/sections/hero.js';
import './manifesto-page/sections/stat-counter.js';
import './manifesto-page/sections/manifesto.js';
import './manifesto-page/sections/footer.js';

const REACT_SNIPPET = `
    // React 19: 59KB gzipped to call appendChild
    const [count, setCount] = useState(0);
    useEffect(() => { document.title = count; }, [count]);
`;

const YAW_SNIPPET = `
    // YAW: 18KB gzipped. Direct. Honest.
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
                and finally touches the real thing. The virtual DOM is a read receipt for state mutations
                you initiated yourself. The virtual part is pure tax.</p>
                <p>Angular monkey-patched every async API in the browser so it could detect when something
                might have changed, then walked the entire component tree checking. They've now admitted
                this was wrong and are migrating to signals — which sit on top of change detection,
                not instead of it.</p>
                <p>Both replaced <code>HTMLElement</code> with their own component model. The browser's
                built-in tools — Elements panel, <code>querySelector</code>,
                <code>connectedCallback</code>, <code>closest()</code> — stopped working.
                So they rebuilt those too.</p>
                <code-block syntax="ts"><script type="text/plain">${REACT_SNIPPET}</script></code-block>
            </manifesto-section>

            <manifesto-section heading="The Compound Tax">
                <p>Once you replace the DOM, you lose everything it gave you for free.
                And you rebuild each piece from scratch.</p>
                <p>Components don't produce HTML? Now you need a server renderer. Then a hydration
                system to reconcile it with the client. Angular shipped theirs at Google I/O as a
                headline feature. The crowd applauded a fix for a problem the framework created.</p>
                <p>State lives in closures, not on elements? You can't walk the tree to find data.
                Redux. Zustand. Jotai. Pinia. MobX. Recoil (deprecated). Each one a cottage industry
                built around the inability to read a value from an ancestor.</p>
                <p>Lifecycle is framework-managed? <code>useEffect</code> cleanup,
                <code>ngOnDestroy</code>, <code>onUnmounted</code>.
                Miss one and you leak. The browser's <code>disconnectedCallback</code> does this
                automatically — but the frameworks can't use it because their components aren't elements.</p>
                <p>Not features. Debt service.</p>
            </manifesto-section>

            <manifesto-section heading="Premature Deoptimization">
                <p>DOM writes were never slow. The browser's layout engine handles mutations in
                microseconds. At 20,000 elements, the browser lags regardless — layout and paint
                are the bottleneck, not JavaScript. They built their entire architecture around
                optimising something that doesn't matter at small scale and can't be helped at large scale.
                <a href="/examples/scheduler-theatre">See it for yourself.</a></p>
                <p>Add a layer that makes simple things slow, then spend a career making the layer fast.</p>
                <p>We optimise for latency — the thinnest possible path between intent and effect.
                The user doesn't care how cleverly your framework writes to the DOM. Neither does the
                browser — it batches layout itself. The cleverness is overhead nobody asked for.</p>
                <p>The performance pitch isn't ours. It's the browser's. We get out of its way.</p>
            </manifesto-section>

            <manifesto-section heading="Our Heresy">
                <p>We reject Zone.js. Not because we hate debugging, but because we can unsubscribe.
                We reject the virtual DOM. Not because we're Luddites, but because we can read.
                We reject 3GB of <code>node_modules</code>. Not because we enjoy suffering, but because
                the platform already ships with a DOM.</p>
                <p>One property change, one subscription fires, one DOM node updates. The granularity
                is per-binding, not per-component. There's nothing to opt out of because there's no
                over-rendering to begin with.</p>
                <code-block syntax="ts"><script type="text/plain">${YAW_SNIPPET}</script></code-block>
                <p>This is not minimalism for aesthetics. This is removing solutions to problems we didn't have.</p>
            </manifesto-section>

            <manifesto-section heading="What Falls Out">
                <p>Every feature below fell out of using the platform correctly.
                Not dedicated infrastructure. Consequences.</p>
                <p><a href="/showcase">A leaf component</a> three layers deep calls a method on the root, passing data from
                the middle: <code>^^.toggleStep(^.trackKey, idx)</code>. No props drilled, no events
                emitted, no context provider.
                This is architecturally impossible in React and Angular —
                their components aren't DOM elements, there's no tree to walk.</p>
                <p>DI is a Map with a parent pointer. 94 lines. SSG is Puppeteer visiting every route
                in parallel. 292 lines. Attribute typing is a codec registry that decodes raw strings
                into real typed objects at connect time. No other framework has this.</p>
                <p>Side effects of correct foundational decisions, delivered in hundreds of lines
                instead of hundreds of thousands.</p>
            </manifesto-section>

            <manifesto-section heading="The Numbers">
                <p>The core runtime — <code>state.ts</code>, <code>rx-element.ts</code>,
                <code>setupBindings.ts</code>, <code>bind.ts</code> — is 681 lines.
                The whole framework including compile-time transforms and SSG is about 3,500.</p>
                <p>React's runtime alone is 248,000 lines. Angular's is 311,000+.</p>
                <p>Our <code>node_modules</code> fits in an email attachment.
                Our mental model fits in a sentence:</p>
                <strong class="model">Observables push, DOM reflects, elements clean up.</strong>
                <p>We ship in kilobytes, not megabytes. We start instantly, not after hydration.
                We update precisely, not after diffing. We garbage collect automatically, not after
                manual effect cleanup.</p>
                <p>The web was never broken. We just convinced ourselves it was,
                then sold each other expensive repairs.</p>
                <p class="closer">We're done buying.</p>
            </manifesto-section>

            <manifesto-section heading="The Platform Is Enough">
                <p>HTML parses. Custom elements instantiate. Attributes are strings we can scan.
                <code>connectedCallback</code> is <code>onInit</code>.
                <code>disconnectedCallback</code> is <code>onDestroy</code>.
                <code>appendChild</code> adds nodes.
                RxJS handles asynchrony. The DI container is a Map with a parent pointer.
                Everything else is ceremony.</p>
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

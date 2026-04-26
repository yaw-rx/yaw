import { Component, Directive, RxElement } from 'yaw';
import type { RxElementLike } from 'yaw';
import { TocSection } from '../directives/toc-section.js';
import { escape } from '../../../components/code-block/code-highlight.js';
import '../../../components/code-block.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';
import './directives/for-demo.js';
import './directives/scope-demo.js';
import './directives/blink-demo.js';

@Directive({ selector: '[bounce]' })
export class Bounce {
    node!: RxElementLike;
    private animation: Animation | undefined;

    onInit(): void {
        this.animation = this.node.animate(
            [
                { transform: 'translateY(0)' },
                { transform: 'translateY(-10px)' },
                { transform: 'translateY(0)' },
            ],
            { duration: 900, iterations: Infinity, easing: 'ease-in-out' }
        );
    }

    onDestroy(): void {
        this.animation?.cancel();
    }
}

const BOUNCE_SOURCE = `import { Directive } from 'yaw';
import type { RxElementLike } from 'yaw';

@Directive({ selector: '[bounce]' })
export class Bounce {
    node!: RxElementLike;
    private animation: Animation | undefined;

    onInit(): void {
        this.animation = this.node.animate([
            { transform: 'translateY(0)' },
            { transform: 'translateY(-10px)' },
            { transform: 'translateY(0)' },
        ], { duration: 900, iterations: Infinity, easing: 'ease-in-out' });
    }

    onDestroy(): void {
        this.animation?.cancel();
    }
}`;

const SCROLL_REVEAL_SOURCE = `@Directive({ selector: '[scroll-reveal]' })
export class ScrollReveal {
    node!: RxElementLike;
    parsed?: ParsedExpr;
    private observer: IntersectionObserver | undefined;

    onInit(): void {
        const threshold = this.parsed?.expr ? parseFloat(this.parsed.expr) : 0.15;
        this.node.classList.add('reveal');
        this.observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        this.node.classList.add('revealed');
                        this.observer?.unobserve(this.node);
                    }
                }
            },
            { threshold }
        );
        this.observer.observe(this.node);
    }

    onDestroy(): void {
        this.observer?.disconnect();
    }
}`;

const USAGE_SOURCE = `@Component({
    selector: 'shelf',
    directives: [Bounce],
    template: \`
        <div>still</div>
        <div bounce>bouncing</div>
    \`,
})
export class Shelf extends RxElement {}`;

const BEFORE_AFTER_SNIPPET = `<div class="box">still</div>
<div class="box" bounce>bouncing</div>`;

const SCOPE_DEMO_SOURCE = `// item + index + destructure + nesting — one example covers all forms

<div rx-for="team, teamIdx of teams by id">
    <h3>{{teamIdx}}: {{team.name}}</h3>

    <ul rx-for="{ name, role }, i of team.members by id">
        <li>{{i}}: {{name}} ({{role}})</li>
    </ul>
</div>`;

const FOR_DEMO_SOURCE = `@Component({
    selector: 'for-demo',
    template: \`
        <div class="row" rx-for="cells by key">
            <span class="cell"></span>
        </div>
    \`,
})
export class ForDemo extends RxElement {
    get cells$(): Observable<readonly Cell[]> {
        return of([
            { key: 'a', textContent: 'alpha'   },
            { key: 'b', textContent: 'bravo'   },
            { key: 'c', textContent: 'charlie' },
        ]);
    }
}`;

@Component({
    selector: 'docs-directives',
    directives: [Bounce, TocSection],
    template: `
        <h1 id="directives" toc-section="directives">Directives</h1>
        <p class="lede">Directives are classes with an attribute selector. When
           the attribute appears on an element and the host component has declared
           the directive in its <code class="inline">directives</code> array (or
           it is registered globally), the framework instantiates the directive,
           sets <code class="inline">host</code> and the parsed expression, and
           calls <code class="inline">onInit</code>.</p>

        <section class="host" id="directives-a" toc-section="directives/example">
            <h2>A simple example</h2>
            <p class="note">A minimal directive that bounces its host element
               via the Web Animations API. Two hooks — start the animation on
               <code class="inline">onInit</code>, cancel it on
               <code class="inline">onDestroy</code>.</p>
            <code-block syntax="ts">${escape`${BOUNCE_SOURCE}`}</code-block>
        </section>

        <section class="host" id="directives-declaring" toc-section="directives/declaring">
            <h2>Declaring it on a host</h2>
            <p class="note">Add to the component's <code class="inline">directives</code>
               array. On mount, any matching child gets the directive
               instantiated against it. For app-wide directives (like
               <code class="inline">rx-if</code> / <code class="inline">rx-for</code>),
               pass them to <code class="inline">bootstrap()</code> as
               <code class="inline">globals.directives</code>.</p>
            <code-block syntax="ts">${escape`${USAGE_SOURCE}`}</code-block>
        </section>

        <section class="ex" id="directives-before-after" toc-section="directives/before-after">
            <h2>In action</h2>
            <p class="note">Same markup, one attribute difference. Add
               <code class="inline">bounce</code> to an element and the directive
               attaches on mount.</p>
            <div class="split">
                <code-block syntax="html">${escape`${BEFORE_AFTER_SNIPPET}`}</code-block>
                <div class="live">
                    <div class="box">still</div>
                    <div class="box" bounce>bouncing</div>
                </div>
            </div>
        </section>

        <section class="host" id="directives-scroll-reveal" toc-section="directives/scroll-reveal">
            <h2>Another: ScrollReveal</h2>
            <p class="note">A real directive from this project — fades its host
               in when it enters the viewport. Same shape, different hook: an
               IntersectionObserver swapped in for the animation.</p>
            <code-block syntax="ts">${escape`${SCROLL_REVEAL_SOURCE}`}</code-block>
        </section>

        <section class="host" id="directives-builtin" toc-section="directives/builtin">
            <h2>Built-in directives</h2>
            <p class="note">The framework ships two structural directives:
               <code class="inline">rx-if</code> for conditional rendering and
               <code class="inline">rx-for</code> for list rendering. Like
               everything else in the framework, they're optional — pass them
               to <code class="inline">bootstrap</code> as
               <code class="inline">globals.directives</code> if you want them,
               or leave them out entirely.</p>

            <section class="host" id="directives-rx-if" toc-section="directives/builtin/rx-if">
                <h3>rx-if</h3>
                <p class="note">Conditionally mounts and unmounts a subtree based
                   on a boolean observable. When the value goes falsy the children
                   are detached from the DOM; when it turns truthy again the original
                   nodes come back — no re-creation, no hidden
                   <code class="inline">display: none</code>.</p>
                <code-block syntax="html">${escape`<div rx-if="isLoggedIn">
    <p>Welcome back, {{name}}</p>
</div>`}</code-block>

                    <h3>A blink tag</h3>
                    <p class="note"><code class="inline">blink-demo</code> drives
                       <code class="inline">rx-if</code> from a two-second timer —
                       no button, no state toggle.
                       <code class="inline">timer(0, 2000)</code> emits 0 immediately
                       then increments every two seconds;
                       <code class="inline">map(n =&gt; n % 2 === 0)</code> turns that
                       into an alternating boolean. The element is removed and
                       reinserted by the framework on each flip.</p>
                    <code-block syntax="ts">${escape`@Component({
    selector: 'blink-demo',
    template: \`<p rx-if="isVisible">Now you see me</p>\`,
})
export class BlinkDemo extends RxElement {
    get isVisible$() {
        return timer(0, 2000).pipe(map(n => n % 2 === 0));
    }
}`}</code-block>
                    <section class="ex">
                        <h2>In action</h2>
                        <div class="split">
                            <code-block syntax="html">${escape`<blink-demo></blink-demo>`}</code-block>
                            <div class="live"><blink-demo></blink-demo></div>
                        </div>
                    </section>
                </section>

            <section id="directives-rx-for" toc-section="directives/builtin/rx-for">
                <h3>rx-for</h3>
            <p class="note"><code class="inline">rx-for</code> renders a list from
               an Observable that emits arrays. Two modes, determined by the
               presence of <code class="inline">of</code> in the expression. Without
               <code class="inline">of</code>, it's splat mode — each item's properties
               are assigned directly onto the child element. With
               <code class="inline">of</code>, it's scope mode — you declare loop
               variables that bindings inside the list can reference.</p>

            <section class="host" id="directives-rx-for-grammar" toc-section="directives/builtin/rx-for/grammar">
                <h3>Grammar</h3>
                <code-block syntax="text">${escape`Splat:  source by key
Scope:  item of source
        item of source by key
        item, index of source
        item, index of source by key
        { field, field } of source by key
        { field, field }, index of source by key`}</code-block>
                <p class="note">The <code class="inline">by key</code> part is optional in
                   both modes. Without it, items are matched by position. With it,
                   items are matched by the key field value — identity is preserved
                   across reorders.</p>
            </section>

            <section class="host" id="directives-rx-for-keyed" toc-section="directives/builtin/rx-for/keyed">
                <h3>Keyed vs keyless</h3>
                <p class="note"><strong>Keyed</strong>
                   (<code class="inline">by id</code>): items are matched by key value.
                   If the array reorders, DOM elements move to match — the element
                   that had <code class="inline">id: 1</code> keeps its state.
                   <strong>Keyless</strong> (no <code class="inline">by</code>): items
                   are matched by position. If the array reorders, position 0 gets
                   the new first item pushed into it — no DOM moves, elements update
                   in place.</p>
            </section>

            <section class="host" id="directives-rx-for-splat" toc-section="directives/builtin/rx-for/splat">
                <h3>Splat mode</h3>
                <p class="note"><code class="inline">rx-for="cells by key"</code>
                   — for each item in the array, rx-for creates a copy of its child
                   element and assigns every property from the item object directly
                   onto it. If the child is a component with
                   <code class="inline">@state</code> fields, setting a property
                   triggers the BehaviorSubject, which drives that component's template
                   bindings. If the child is a plain element,
                   <code class="inline">textContent</code> and other DOM properties work
                   directly.</p>
                <code-block syntax="ts">${escape`${FOR_DEMO_SOURCE}`}</code-block>
                <section class="ex">
                    <h2>In action</h2>
                    <p class="note">Three cells, keyed by
                    <code class="inline">key</code>. Each item's
                    <code class="inline">textContent</code> is written directly
                    onto the span.</p>
                    <div class="split">
                        <code-block syntax="html">${escape`<for-demo></for-demo>`}</code-block>
                        <div class="live"><for-demo></for-demo></div>
                    </div>
                </section>
            </section>

            <section class="host" id="directives-rx-for-scope" toc-section="directives/builtin/rx-for/scope">
                <h3>Scope mode</h3>
                <p class="note">Add <code class="inline">of</code> to declare loop variables.
                   <code class="inline">rx-for="row of rows by id"</code> — inside the
                   list, <code class="inline">row</code> is a name you introduced. Bindings
                   that start with <code class="inline">row</code> resolve through a per-item
                   BehaviorSubject owned by the directive. Bindings that don't match
                   a loop variable fall through to the host as normal — the host-is-scope
                   rule is unchanged.</p>
                <code-block syntax="html">${escape`${SCOPE_DEMO_SOURCE}`}</code-block>
                <section class="ex">
                    <h2>In action</h2>
                    <p class="note">Two teams, each with members. The outer rx-for
                    declares <code class="inline">team</code> and
                    <code class="inline">teamIdx</code>. The inner destructures
                    <code class="inline">{ name, role }</code> with index
                    <code class="inline">i</code>. Host fields still resolve
                    normally.</p>
                    <div class="split">
                        <code-block syntax="html">${escape`<scope-demo></scope-demo>`}</code-block>
                        <div class="live"><scope-demo></scope-demo></div>
                    </div>
                </section>
            </section>

            </section>
        </section>
    `,
    styles: `
        :host { display: block; }
        .box { width: 6rem; height: 6rem; background: #111;
               border: 1px solid #333; border-radius: 8px;
               display: flex; align-items: center; justify-content: center;
               color: #8af; font-family: monospace; font-size: 0.85rem;
               flex-shrink: 0; }
        ${DOC_STYLES}
        .live { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1rem; }
    `,
})
export class DocsDirectives extends RxElement {}

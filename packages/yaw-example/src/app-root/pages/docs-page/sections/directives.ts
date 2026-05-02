import { Component, Directive, RxElement } from '@yaw-rx/core';
import type { RxElementLike } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
import { RxIf } from '@yaw-rx/core/directives/rx-if';
import { TocSection } from '../directives/toc-section.js';
import { TocAnchor } from '../directives/toc-anchor.js';
import { escape } from '../../../components/code-block/code-highlight.js';
import '../../../components/code-block.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';
import './directives/for-demo.js';
import './directives/scope-demo.js';
import './directives/blink-demo.js';
import './directives/if-demo.js';

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

const BOUNCE_SOURCE = `import { Directive } from '@yaw-rx/core';
import type { RxElementLike } from '@yaw-rx/core';

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


const IF_DEMO_SOURCE = `import { map, type Observable } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';
import { RxIf } from '@yaw-rx/core/directives/rx-if';

@Component({
    selector: 'if-demo',
    directives: [RxIf],
    template: \`
        <button onclick="toggle">{{label}}</button>
        <div rx-if="isLoggedIn">
            <p>Welcome back, Jonathan</p>
        </div>
    \`,
})
export class IfDemo extends RxElement {
    @state isLoggedIn = false;

    toggle(): void {
        this.isLoggedIn = !this.isLoggedIn;
    }

    get label$(): Observable<string> {
        return this.isLoggedIn$.pipe(map((v) => v ? 'logout' : 'login'));
    }
}`;

const USAGE_SOURCE = `import { Component, RxElement } from '@yaw-rx/core';
import { Bounce } from './bounce.js';

@Component({
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

const FOR_DEMO_SOURCE = `import { Component, RxElement } from '@yaw-rx/core';
import { of, type Observable } from 'rxjs';

interface Cell { key: string; textContent: string; }

@Component({
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
    directives: [Bounce, TocSection, TocAnchor, RxFor, RxIf],
    template: `
        <h1 toc-anchor="directives">Directives</h1>
        <p class="lede">Directives are classes with an attribute selector. When
           the attribute appears on an element and the host component has declared
           the directive in its <code class="inline">directives</code> array (or
           it is registered globally), the framework instantiates the directive,
           sets <code class="inline">host</code> and the parsed expression, and
           calls <code class="inline">onInit</code>.</p>

        <section class="host" toc-section="directives/example">
            <h2 toc-anchor="directives/example">A simple example</h2>
            <p class="note">A minimal directive that bounces its host element
               via the Web Animations API. Two hooks — start the animation on
               <code class="inline">onInit</code>, cancel it on
               <code class="inline">onDestroy</code>.</p>
            <code-block syntax="ts">${escape`${BOUNCE_SOURCE}`}</code-block>
        </section>

        <section class="host" toc-section="directives/declaring">
            <h2 toc-anchor="directives/declaring">Declaring it on a host</h2>
            <p class="note">Add to the component's <code class="inline">directives</code>
               array. On mount, any matching child gets the directive
               instantiated against it. For app-wide directives (like
               <code class="inline">rx-if</code> / <code class="inline">rx-for</code>),
               pass them to <code class="inline">bootstrap()</code> as
               <code class="inline">globals.directives</code>.</p>
            <code-block syntax="ts">${escape`${USAGE_SOURCE}`}</code-block>
        </section>

        <section class="ex" toc-section="directives/before-after">
            <h2 toc-anchor="directives/before-after">In action</h2>
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

        <section class="host" toc-section="directives/blink">
            <h2 toc-anchor="directives/blink">Another: Blink</h2>
            <p class="note">Same shape, different animation — an opacity loop
               via the Web Animations API. Place
               <code class="inline">[blink]</code> on any element.</p>
            <code-block syntax="ts">${escape`import { Directive } from '@yaw-rx/core';
import type { RxElementLike } from '@yaw-rx/core';

@Directive({ selector: '[blink]' })
export class Blink {
    node!: RxElementLike;
    private animation: Animation | undefined;

    onInit(): void {
        this.animation = this.node.animate(
            [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }],
            { duration: 1000, iterations: Infinity },
        );
    }

    onDestroy(): void {
        this.animation?.cancel();
    }
}`}</code-block>
            <section class="ex">
                <h2>In action</h2>
                <div class="split">
                    <code-block syntax="html">${escape`<p blink>Now you see me</p>`}</code-block>
                    <div class="live"><blink-demo></blink-demo></div>
                </div>
            </section>
        </section>

        <section class="host" toc-section="directives/builtin">
            <h2 toc-anchor="directives/builtin">Built-in directives</h2>
            <p class="note">The framework ships two structural directives:
               <code class="inline">rx-if</code> for conditional rendering and
               <code class="inline">rx-for</code> for list rendering. Like
               everything else in the framework, they're optional — pass them
               to <code class="inline">bootstrap</code> as
               <code class="inline">globals.directives</code> if you want them,
               or leave them out entirely.</p>

            <section class="host" toc-section="directives/builtin/rx-if">
                <h3 toc-anchor="directives/builtin/rx-if">rx-if</h3>
                <p class="note">Conditionally mounts and unmounts a subtree based
                   on a boolean observable. When the value goes falsy the children
                   are detached from the DOM; when it turns truthy again the original
                   nodes come back — no re-creation, no hidden
                   <code class="inline">display: none</code>.</p>
                <code-block syntax="ts">${escape`${IF_DEMO_SOURCE}`}</code-block>
                <p class="note">The template reads naturally — place
                   <code class="inline">rx-if</code> on the element you
                   want to conditionally render. The expression points at
                   a boolean on the host.</p>
                <code-block syntax="html">${escape`<div rx-if="isLoggedIn">
    <p>Welcome back, {{name}}</p>
</div>`}</code-block>
                <p class="note">Click the button — the paragraph mounts
                   and unmounts. No fade, no hide. The DOM nodes are
                   physically removed and reinserted.</p>
                <section class="ex">
                    <h2>In action</h2>
                    <div class="split">
                        <code-block syntax="html">${escape`<if-demo></if-demo>`}</code-block>
                        <div class="live"><if-demo></if-demo></div>
                    </div>
                </section>
                </section>

            <section toc-section="directives/builtin/rx-for">
                <h3 toc-anchor="directives/builtin/rx-for">rx-for</h3>
            <p class="note"><code class="inline">rx-for</code> renders a list from
               an Observable that emits arrays. Two modes, determined by the
               presence of <code class="inline">of</code> in the expression. Without
               <code class="inline">of</code>, it's splat mode — each item's properties
               are assigned directly onto the child element. With
               <code class="inline">of</code>, it's scope mode — you declare loop
               variables that bindings inside the list can reference.</p>

            <section class="host" toc-section="directives/builtin/rx-for/grammar">
                <h3 toc-anchor="directives/builtin/rx-for/grammar">Grammar</h3>
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

            <section class="host" toc-section="directives/builtin/rx-for/keyed">
                <h3 toc-anchor="directives/builtin/rx-for/keyed">Keyed vs keyless</h3>
                <p class="note"><strong>Keyed</strong>
                   (<code class="inline">by id</code>): items are matched by key value.
                   If the array reorders, DOM elements move to match — the element
                   that had <code class="inline">id: 1</code> keeps its state.
                   <strong>Keyless</strong> (no <code class="inline">by</code>): items
                   are matched by position. If the array reorders, position 0 gets
                   the new first item pushed into it — no DOM moves, elements update
                   in place.</p>
            </section>

            <section class="host" toc-section="directives/builtin/rx-for/splat">
                <h3 toc-anchor="directives/builtin/rx-for/splat">Splat mode</h3>
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

            <section class="host" toc-section="directives/builtin/rx-for/scope">
                <h3 toc-anchor="directives/builtin/rx-for/scope">Scope mode</h3>
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

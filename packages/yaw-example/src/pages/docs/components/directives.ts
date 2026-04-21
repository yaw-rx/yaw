import 'reflect-metadata';
import { Component, Directive, RxElement } from 'yaw';
import type { RxElementLike } from 'yaw';
import { escape } from '../../../shared/lib/code-highlight.js';
import { DOC_STYLES } from '../../../shared/lib/doc-styles.js';

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
    directives: [Bounce],
    template: `
        <h1>Directives</h1>
        <p class="lede">Directives are classes with an attribute selector. When
           the attribute appears on an element and the host component has declared
           the directive in its <code class="inline">directives</code> array (or
           it is registered globally), the framework instantiates the directive,
           sets <code class="inline">host</code> and the parsed expression, and
           calls <code class="inline">onInit</code>.</p>

        <section class="host" id="directives-a" toc-section>
            <h2>A directive</h2>
            <p class="note">A minimal directive that bounces its host element
               via the Web Animations API. Two hooks — start the animation on
               <code class="inline">onInit</code>, cancel it on
               <code class="inline">onDestroy</code>.</p>
            <code-block lang="ts">${escape`${BOUNCE_SOURCE}`}</code-block>
        </section>

        <section class="ex" id="directives-before-after" toc-section>
            <h2>Before / after</h2>
            <p class="note">Same markup, one attribute difference. Add
               <code class="inline">bounce</code> to an element and the directive
               attaches on mount.</p>
            <div class="split">
                <code-block lang="html">${escape`${BEFORE_AFTER_SNIPPET}`}</code-block>
                <div class="live">
                    <div class="box">still</div>
                    <div class="box" bounce>bouncing</div>
                </div>
            </div>
        </section>

        <section class="host" id="directives-declaring" toc-section>
            <h2>Declaring it on a host</h2>
            <p class="note">Add to the component's <code class="inline">directives</code>
               array. On mount, any matching child gets the directive
               instantiated against it. For app-wide directives (like
               <code class="inline">rx-if</code> / <code class="inline">rx-for</code>),
               pass them to <code class="inline">bootstrap()</code> as
               <code class="inline">globalDirectives</code>.</p>
            <code-block lang="ts">${escape`${USAGE_SOURCE}`}</code-block>
        </section>

        <section class="host" id="directives-scroll-reveal" toc-section>
            <h2>Another: ScrollReveal</h2>
            <p class="note">A real directive from this project — fades its host
               in when it enters the viewport. Same shape, different hook: an
               IntersectionObserver swapped in for the animation.</p>
            <code-block lang="ts">${escape`${SCROLL_REVEAL_SOURCE}`}</code-block>
        </section>

        <section class="host" id="directives-builtin" toc-section>
            <h2>Built-in directives</h2>
            <p class="note"><code class="inline">DefaultGlobalDirectives</code> from
               <code class="inline">yaw</code> is <code class="inline">[RxIf, RxFor]</code> —
               the structural directives. Use them as attributes:
               <code class="inline">&lt;div rx-if="isReady"&gt;</code> and
               <code class="inline">&lt;li rx-for="rows by key"&gt;</code>. If you
               don't want them, don't pass them.</p>
        </section>

        <section class="host" id="directives-rx-for" toc-section>
            <h2>rx-for in practice</h2>
            <p class="note">A fixed array of three cells, keyed by
               <code class="inline">key</code>. For each item, <code class="inline">rx-for</code>
               stamps a clone of its single child element and assigns every item
               field onto that element as a property. Here
               <code class="inline">textContent</code> is a real DOM property, so
               the span gets its text written directly — no child component needed.</p>
            <code-block lang="ts">${escape`${FOR_DEMO_SOURCE}`}</code-block>
        </section>

        <section class="ex" id="directives-rx-for-live" toc-section>
            <h2>rx-for — live</h2>
            <div class="split">
                <code-block lang="html">${escape`<for-demo></for-demo>`}</code-block>
                <div class="live"><for-demo></for-demo></div>
            </div>
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

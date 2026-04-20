import 'reflect-metadata';
import { Component, RxElement, observable } from 'yaw';
import { escape } from '../../../shared/lib/code-highlight.js';
import { DOC_STYLES } from '../../../shared/lib/doc-styles.js';

const COUNTER_TEMPLATE = `
    <button onclick="dec">−</button>
    <span class="count">{{count}}</span>
    <button onclick="inc">+</button>
`;

const COUNTER_STYLES = `
    :host { display: inline-flex; align-items: center; gap: 0.6rem; }
    button { background: #111; border: 1px solid #333; color: #fff;
             width: 2rem; height: 2rem; font-size: 1rem; cursor: pointer;
             border-radius: 4px; padding: 0; line-height: 1;
             display: inline-flex; align-items: center; justify-content: center; }
    button:hover { border-color: #8af; color: #8af; }
    .count { color: #8af; font-family: monospace; font-size: 1.1rem; min-width: 2ch; text-align: center; }
`;

const COUNTER_SOURCE = `@Component({
    selector: 'hello-counter',
    template: \`${COUNTER_TEMPLATE}\`,
    styles: \`${COUNTER_STYLES}\`,
})
export class HelloCounter extends RxElement<{ count: number }> {
    @observable count = 0;
    inc(): void { this.count += 1; }
    dec(): void { this.count -= 1; }
}`;

@Component({
    selector: 'hello-counter',
    template: COUNTER_TEMPLATE,
    styles: COUNTER_STYLES,
})
export class HelloCounter extends RxElement<{ count: number }> {
    @observable count = 0;
    inc(): void { this.count += 1; }
    dec(): void { this.count -= 1; }
}

const BINDINGS_SNIPPET = `<!-- text: RxJS Observable or plain expression -->
<p>hello, {{name}}</p>

<!-- attribute: assigns the evaluated value to the attribute -->
<a [href]="profileUrl()">profile</a>

<!-- class toggle: truthy → class added -->
<li [class.active]="isSelected()">...</li>

<!-- style: whole cssText, driven by an observable -->
<div [style]="barStyle()"></div>

<!-- events: unprefixed method name, or inline call -->
<button onclick="submit">send</button>
<button onclick="increment(5)">+5</button>

<!-- template refs: grab the element for onInit -->
<canvas #surface></canvas>`;

@Component({
    selector: 'docs-components',
    template: `
        <h1>Components</h1>
        <p class="lede">A component is an <code class="inline">RxElement</code>
           subclass decorated with <code class="inline">@Component</code>. The
           decorator registers a real custom element; the class instance
           <em>is</em> the DOM node. <code class="inline">@observable</code>
           fields publish a hidden <code class="inline">*$</code> BehaviorSubject
           the template can subscribe to.</p>

        <section class="host" id="components-whole" toc-section>
            <h2>A whole component</h2>
            <p class="note">Two observables, two methods, three bindings. No
               reconciliation, no diff — the subject emits, the binding applies
               the new value.</p>
            <code-block lang="ts">${escape`${COUNTER_SOURCE}`}</code-block>
        </section>

        <section class="ex" id="components-use" toc-section>
            <h2>In use</h2>
            <p class="note">The source above, rendered live. Click the buttons.</p>
            <div class="split">
                <code-block lang="html">${escape`<hello-counter></hello-counter>`}</code-block>
                <div class="live"><hello-counter></hello-counter></div>
            </div>
        </section>

        <section class="host" id="components-bindings" toc-section>
            <h2>Template bindings</h2>
            <p class="note">The full vocabulary. Every binding compiles to a
               subscription on a resolved observable — no other runtime.</p>
            <code-block lang="html">${escape`${BINDINGS_SNIPPET}`}</code-block>
        </section>

        <section class="host" id="components-lifecycle" toc-section>
            <h2>Lifecycle</h2>
            <p class="note"><code class="inline">onInit</code> runs after the
               template has been rendered and the directives have attached —
               query refs here. <code class="inline">onDestroy</code> runs on
               <code class="inline">disconnectedCallback</code>, so return any
               subscriptions you own.</p>
            <code-block lang="ts">${escape`override onInit(): void {
    this.surface = this.querySelector('[data-rx-ref=surface]')!;
}
override onDestroy(): void {
    cancelAnimationFrame(this.raf);
}`}</code-block>
        </section>
    `,
    styles: `
        :host { display: block; }
        ${DOC_STYLES}
        .live { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1rem; }
    `,
})
export class DocsComponents extends RxElement {}

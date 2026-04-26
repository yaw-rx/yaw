import { Component, RxElement, state } from 'yaw';
import { TocSection } from '../directives/toc-section.js';
import { escape } from '../../../components/code-block/code-highlight.js';
import '../../../components/code-block.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';

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
export class HelloCounter extends RxElement {
    @state count = 0;
    inc(): void { this.count += 1; }
    dec(): void { this.count -= 1; }
}`;

@Component({
    selector: 'hello-counter',
    template: COUNTER_TEMPLATE,
    styles: COUNTER_STYLES,
})
export class HelloCounter extends RxElement {
    @state count = 0;
    inc(): void { this.count += 1; }
    dec(): void { this.count -= 1; }
}

const ESCAPE_SNIPPET = [
    "import { escape } from 'yaw-common';",
    '',
    '@Component({',
    '    template: `',
    '        <!-- show a mustache literal, without binding to it -->',
    '        <p>binding syntax: ${escape`{{ }}`}</p>',
    '',
    '        <!-- show an HTML tag, without parsing or mirroring it -->',
    '        <p>a custom element: ${escape`<my-el>`}</p>',
    '',
    '        <!-- render arbitrary source verbatim inside a code-block -->',
    '        <code-block syntax="ts">${escape`${SOURCE}`}</code-block>',
    '    `,',
    '})',
    'export class EscapeDemo extends RxElement {}',
].join('\n');

const BINDINGS_SNIPPET = `<!-- text: RxJS Observable or plain expression -->
<p>hello, {{name}}</p>

<!-- attribute: assigns the evaluated value to the attribute -->
<a [href]="profileUrl">profile</a>

<!-- class toggle: truthy → class added -->
<li [class.active]="isSelected">...</li>

<!-- style: whole cssText, driven by an observable -->
<div [style]="barStyle"></div>

<!-- events: unprefixed method name, or inline call -->
<button onclick="submit">send</button>
<button onclick="increment(5)">+5</button>

<!-- template refs: grab the element for onInit -->
<canvas #surface></canvas>`;

@Component({
    selector: 'docs-components',
    directives: [TocSection],
    template: `
        <h1 id="components" toc-section>Components</h1>
        <p class="lede">A component is an <code class="inline">RxElement</code>
           subclass decorated with <code class="inline">@Component</code>. The
           decorator registers a real custom element; the class instance
           <em>is</em> the DOM node. <code class="inline">@state</code>
           fields publish a hidden <code class="inline">*$</code> BehaviorSubject
           the template can subscribe to.</p>
            <code-block syntax="ts">${escape`@Component({
    selector: 'my-tag',      // custom element name — must contain a hyphen
    template: \`...\`,         // HTML template string
    styles: \`...\`,           // CSS — scoped to the selector
    providers: [...],        // DI providers scoped to this component
    directives: [...],       // directives available in this template
    attributeCodecs: {...},  // local codec registrations for attribute marshalling
})`}</code-block>

        <section class="host" id="components-whole" toc-section>
            <h2>A whole component</h2>
            <p class="note">Two observables, two methods, three bindings. No
               reconciliation, no diff — the subject emits, the binding applies
               the new value.</p>
            <code-block syntax="ts">${escape`${COUNTER_SOURCE}`}</code-block>
        </section>

        <section class="ex" id="components-use" toc-section>
            <h2>In use</h2>
            <p class="note">The source above, rendered live. Click the buttons.</p>
            <div class="split">
                <code-block syntax="html">${escape`<hello-counter></hello-counter>`}</code-block>
                <div class="live"><hello-counter></hello-counter></div>
            </div>
        </section>

        <section class="host" id="components-bindings" toc-section>
            <h2>Template bindings</h2>
            <p class="note">The full vocabulary. Every binding compiles to a
               subscription on a resolved observable — no other runtime.</p>
            <code-block syntax="html">${escape`${BINDINGS_SNIPPET}`}</code-block>
        </section>

        <section class="host" id="components-escape" toc-section>
            <h2>Escaping mustaches and HTML</h2>
            <p class="note">A template compiles its mustache expressions into
               observable bindings, and rewrites built-in HTML tags into their
               reactive mirrors. To show those characters as literal text --
               documenting the binding syntax, naming a tag without rendering
               it, or dumping source verbatim into a
               <code class="inline">code-block</code> -- wrap the content with
               <code class="inline">escape</code> from
               <code class="inline">yaw-common</code>. It escapes HTML entities
               and marks the subtree so the compiler leaves it alone. An empty
               or whitespace-only mustache that survives compilation throws
               <code class="inline">TemplateWalkError</code>, pointing you
               here.</p>
            <code-block syntax="ts">${escape`${ESCAPE_SNIPPET}`}</code-block>
        </section>

        <section class="host" id="components-lifecycle" toc-section>
            <h2>Lifecycle</h2>
            <p class="note"><code class="inline">onInit</code> fires after
               the element is fully wired — dependencies are injected,
               attributes are hydrated, bindings are live, and the template
               is in the DOM. <code class="inline">onDestroy</code> fires on
               removal after the framework has torn down its own bindings
               and directives — you only clean up what you own.</p>
            <code-block syntax="ts">${escape`@Component({
    selector: 'tick-counter',
    template: \`<span>{{elapsed}}s</span>\`,
})
export class TickCounter extends RxElement {
    @state elapsed = 0;
    private sub!: Subscription;

    override onInit(): void {
        this.sub = interval(1000).subscribe(() => this.elapsed++);
    }

    override onDestroy(): void {
        this.sub.unsubscribe();
    }
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

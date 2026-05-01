import { Component, RxElement, state } from 'yaw';
import { TocSection } from '../directives/toc-section.js';
import { TocAnchor } from '../directives/toc-anchor.js';
import { escape } from '../../../components/code-block/code-highlight.js';
import '../../../components/code-block.js';
import './components/weather-card.js';
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

const WEATHER_SOURCE = `import { Component, Inject, RxElement, state } from 'yaw';
import { RxFor } from 'yaw/directives/rx-for';
import { type Subscription } from 'rxjs';
import { WeatherService } from './weather-service.js';

@Component({
    selector: 'weather-card',
    providers: [WeatherService],
    directives: [RxFor],
    template: \`
        <span class="icon">{{svc.icon}}</span>
        <h2>{{svc.city}}</h2>
        <p class="temp">{{svc.temp}}°C</p>
        <p class="wind">💨 {{svc.wind}} km/h</p>
        <ul rx-for="hour of svc.hours">
            <li>{{hour.icon}} {{hour.time}} — {{hour.temp}}°C</li>
        </ul>
    \`,
    styles: \`
        :host { display: block; text-align: center; }
        .icon { font-size: 3.5rem; }
        ul { list-style: none; padding: 0; text-align: left; }
        li { padding: 0.3rem 0; }
    \`,
})
export class WeatherCard extends RxElement {
    @Inject(WeatherService) svc!: WeatherService;
    @state lat = 52.52;
    @state lon = 13.41;
    private subs: Subscription[] = [];

    override onInit(): void {
        this.subs.push(
            this.lat$.subscribe((v) => { this.svc.lat = v; }),
            this.lon$.subscribe((v) => { this.svc.lon = v; }),
        );
    }

    override onDestroy(): void {
        for (const sub of this.subs) sub.unsubscribe();
    }
}`;

const ESCAPE_SNIPPET = [
    "import { Component, RxElement } from 'yaw';",
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

const REACTIVE_SNIPPET = `<!-- text (mustache) -->
<p>hello, {{name}}</p>

<!-- property -->
<input [value]="query">

<!-- attribute -->
<a [href]="profileUrl">profile</a>

<!-- class toggle -->
<li [class.active]="isSelected">...</li>

<!-- style -->
<div [style]="barStyle"></div>

<!-- model (two-way) -->
<input [(value)]="query">`;

const IMPERATIVE_SNIPPET = `<!-- event -->
<button onclick="submit">send</button>
<button onclick="increment(5)">+5</button>

<!-- ref -->
<canvas #surface></canvas>`;

@Component({
    selector: 'docs-components',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="components">Components</h1>
        <p class="lede">You write a class that extends
           <code class="inline">RxElement</code> and decorate it
           with <code class="inline">@Component</code>. The
           decorator takes a selector — the HTML tag name — along
           with the template, styles, and any directives, services,
           or codecs the component needs.</p>
            <code-block syntax="ts">${escape`import { Component, RxElement } from 'yaw';

@Component({
    selector: 'my-tag',      // custom element name — must contain a hyphen
    template: \`...\`,         // HTML template string
    styles: \`...\`,           // CSS — scoped to the selector
    providers: [...],        // DI providers scoped to this component
    directives: [...],       // directives available in this template
    attributeCodecs: {...},  // local codec registrations for attribute marshalling
})`}</code-block>

        <section class="host" toc-section="components/example">
            <h2 toc-anchor="components/example">An example component</h2>
            <p class="note">A weather card backed by a weather service,
               a directive that repeats the forecast list, and template
               bindings that wire it all to the DOM.</p>
            <code-block syntax="ts">${escape`${WEATHER_SOURCE}`}</code-block>
        </section>

        <section class="ex" toc-section="components/live">
            <h2 toc-anchor="components/live">Example component live</h2>
            <p class="note">The component above, rendered with live data from
               <code class="inline">open-meteo.com</code>.</p>
            <div class="split">
                <code-block syntax="html">${escape`<weather-card lat="52.52" lon="13.41"></weather-card>`}</code-block>
                <div class="live"><weather-card lat="52.52" lon="13.41"></weather-card></div>
            </div>
        </section>

        <section class="host" toc-section="components/bindings">
            <h2 toc-anchor="components/bindings">Template bindings</h2>
            <p class="note">Templates support several kinds of bindings.
               There are two groups: reactive bindings that subscribe
               and stay in sync, and imperative bindings that fire
               once.</p>
            <h3>Reactive</h3>
            <p class="note">Subscribe to an observable and update the
               DOM whenever it emits.
               <code class="inline">@state</code> promotes a field to
               an observable; any property that returns an observable
               works too.</p>
            <table class="binding-table">
                <thead>
                    <tr><th>Binding</th><th>Syntax</th><th>Description</th></tr>
                </thead>
                <tbody>
                    <tr><td>text (mustache)</td><td><code>${escape`{{expr}}`}</code></td><td>Subscribes to an observable and writes its value as the element's text content whenever it emits</td></tr>
                    <tr><td>property</td><td><code>[prop]="expr"</code></td><td>Subscribes and sets a JavaScript property on the element, like <code>.value</code> on an input</td></tr>
                    <tr><td>attribute</td><td><code>[attr]="expr"</code></td><td>Subscribes and sets an HTML attribute on the element</td></tr>
                    <tr><td>class</td><td><code>[class.name]="expr"</code></td><td>Subscribes and adds or removes a CSS class based on whether the value is truthy</td></tr>
                    <tr><td>style</td><td><code>[style]="expr"</code></td><td>Subscribes and sets an inline CSS style property on the element</td></tr>
                    <tr><td>model</td><td><code>[(prop)]="expr"</code></td><td>Pushes observable values to the DOM and writes DOM changes back to the observable, keeping both in sync</td></tr>
                </tbody>
            </table>
            <code-block syntax="html">${escape`${REACTIVE_SNIPPET}`}</code-block>
            <h3>Imperative</h3>
            <p class="note">Respond to user actions or wire up element references.</p>
            <table class="binding-table">
                <thead>
                    <tr><th>Binding</th><th>Syntax</th><th>Description</th></tr>
                </thead>
                <tbody>
                    <tr><td>event</td><td><code>onclick="method"</code></td><td>Listens for a DOM event and calls a method on the component or an ancestor</td></tr>
                    <tr><td>ref</td><td><code>#name</code></td><td>Captures the DOM element as a property so you can use it in <code>onInit</code> or methods</td></tr>
                </tbody>
            </table>
            <code-block syntax="html">${escape`${IMPERATIVE_SNIPPET}`}</code-block>
        </section>

        <section class="host" toc-section="components/projection">
            <h2 toc-anchor="components/projection">Content projection</h2>
            <p class="note">Place a <code class="inline">${escape`<slot>`}</code>
               in a component's template. When the component renders,
               any children passed to it replace the slot element.</p>
            <code-block syntax="ts">${escape`@Component({
    selector: 'my-card',
    template: \`
        <div class="card">
            <slot></slot>
        </div>
    \`,
})`}</code-block>
            <code-block syntax="html">${escape`<!-- children replace the <slot> -->
<my-card>
    <p>This paragraph appears inside the card.</p>
</my-card>`}</code-block>
        </section>

        <section class="host" toc-section="components/escape">
            <h2 toc-anchor="components/escape">Escaping mustaches and HTML</h2>
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

        <section class="host" toc-section="components/lifecycle">
            <h2 toc-anchor="components/lifecycle">Lifecycle</h2>
            <p class="note"><code class="inline">onInit</code> fires after
               the element is fully wired — dependencies are injected,
               attributes are hydrated, bindings are live, and the template
               is in the DOM. <code class="inline">onDestroy</code> fires on
               removal after the framework has torn down its own bindings
               and directives — you only clean up what you own.</p>
            <code-block syntax="ts">${escape`import { Component, RxElement, state } from 'yaw';
import { interval, type Subscription } from 'rxjs';

@Component({
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
        .binding-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin: 0.5rem 0 1.5rem; }
        .binding-table th { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid #333; color: #aaa; font-weight: 600; }
        .binding-table td { padding: 0.4rem 0.75rem; border-bottom: 1px solid #1a1a1a; vertical-align: top; }
        .binding-table td:first-child { white-space: nowrap; font-weight: 600; color: #fff; }
        .binding-table td:nth-child(2) { white-space: nowrap; }
        .binding-table code { color: #8af; }
        h3 { color: #ccc; font-size: 1rem; margin: 1.5rem 0 0.25rem; }
    `,
})
export class DocsComponents extends RxElement {}

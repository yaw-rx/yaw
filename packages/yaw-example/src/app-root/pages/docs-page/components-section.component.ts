import { Component, RxElement, state } from '@yaw-rx/core';
import { DocSection } from '../../components/doc-section.component.js';
import { TocSection } from '../../directives/toc-section.directive.js';
import { TocAnchor } from '../../directives/toc-anchor.directive.js';
import { escape } from '../../components/code-block/code-block-highlight.component.js';
import '../../components/code-block.component.js';
import './components-section/weather-card.component.js';
import './reactive-state-section/touch-demo.component.js';
import './reactive-state-section/date-ticker.component.js';
import './reactive-state-section/decimal-demo.component.js';
import './reactive-state-section/address-demo.component.js';
import './reactive-state-section/plaindate-demo.component.js';
import './reactive-state-section/dayjs-demo.component.js';

const COUNTER_TEMPLATE = `
    <button onclick="dec">−</button>
    <span class="count">{{count}}</span>
    <button onclick="inc">+</button>
`;

const COUNTER_STYLES = `
    :host { display: inline-flex; align-items: center; gap: 0.6rem; }
    button { background: var(--bg-3); border: var(--border-width) solid var(--border); color: var(--white);
             width: 2rem; height: 2rem; font-size: 1rem; cursor: pointer;
             border-radius: var(--radius-sm); padding: 0; line-height: 1;
             display: inline-flex; align-items: center; justify-content: center; }
    button:hover { border-color: var(--accent); color: var(--accent); }
    .count { color: var(--accent); font-family: var(--font-mono); font-size: 1.1rem; min-width: 2ch; text-align: center; }
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

const STATE_DECORATOR_SOURCE = `import { Component, RxElement, state } from '@yaw-rx/core';

@Component({ selector: 'my-thing', template: '...', styles: '...' })
export class MyThing extends RxElement {
    @state count = 0;

    increment(): void {
        this.count += 1;    // emits on the underlying StateSubject
    }
}

// @state does three things:
// 1. Replaces the field with a getter/setter backed by a StateSubject
// 2. Creates a count$ getter returning StateSubject<number>
// 3. Registers the field for attribute marshalling`;

const STATE_DOLLAR_SOURCE = `import { Component, RxElement, state } from '@yaw-rx/core';
import { map, type Observable } from 'rxjs';

@Component({
    selector: 'my-thing',
    template: \`<span>count: {{count}}</span><span>doubled: {{doubled}}</span>\`,
})
export class MyThing extends RxElement {
    @state count = 0;

    override onInit(): void {
        this.count$.subscribe((n) => console.log('count:', n));
    }

    get doubled(): Observable<number> {
        return this.count$.pipe(map((n) => n * 2));
    }
}`;

const PLUGIN_SOURCE = `// tsconfig.json — one line
{
    "compilerOptions": {
        "plugins": [{ "name": "@yaw-rx/ts-plugin" }]
    }
}`;

const PLUGIN_WHAT_SOURCE = `import { Component, RxElement, state } from '@yaw-rx/core';

@Component({ selector: 'my-thing', template: '...', styles: '...' })
export class MyThing extends RxElement {
    @state count = 0;
    @state created: Date = new Date();
    @state items: Map<string, number> = new Map();

    // the plugin injects (invisible to you):
    //   declare count$: StateSubject<number>;
    //   declare created$: StateSubject<Date>;
    //   declare items$: StateSubject<Map<string, number>>;

    // full types, autocomplete, go-to-definition — no generics needed
}`;

const TOUCH_DEMO_SOURCE = `import { Component, RxElement, state } from '@yaw-rx/core';
import { map, type Observable } from 'rxjs';

interface Settings {
    theme: string;
    fontSize: number;
}

@Component({
    selector: 'touch-demo',
    template: \`
        <div class="preview" [style.background]="bg" [style.color]="fg" [style.font-size]="fs">
            {{summary}}
        </div>
        <div class="controls">
            <button onclick="toggleTheme">toggle theme</button>
            <button onclick="bumpFont">+ font size</button>
        </div>
    \`,
})
export class TouchDemo extends RxElement {
    @state settings: Settings = { theme: 'dark', fontSize: 14 };

    get summary(): Observable<string> {
        return this.settings$.pipe(
            map((s) => \\\`\\\${s.theme} / \\\${s.fontSize}px\\\`),
        );
    }

    get bg(): Observable<string> {
        return this.settings$.pipe(map((s) => s.theme === 'dark' ? '#111' : '#eee'));
    }

    get fg(): Observable<string> {
        return this.settings$.pipe(map((s) => s.theme === 'dark' ? '#ccc' : '#111'));
    }

    get fs(): Observable<string> {
        return this.settings$.pipe(map((s) => \\\`\\\${s.fontSize}px\\\`));
    }

    toggleTheme(): void {
        this.settings.theme = this.settings.theme === 'dark' ? 'light' : 'dark';
        this.settings$.touch();
    }

    bumpFont(): void {
        this.settings.fontSize += 1;
        this.settings$.touch();
    }
}`;

const WEATHER_SOURCE = `import { Component, Inject, RxElement, state } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
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
    "import { Component, RxElement } from '@yaw-rx/core';",
    "import { escape } from '@yaw-rx/common';",
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
<!-- interpolate name from this host -->
<p>hello, {{name}}</p>
<!-- interpolate greeting from the parent host -->
<p>{{^greeting}}</p>
<!-- interpolate title from the grandparent host -->
<p>{{^^title}}</p>

<!-- ---------------------------------------- -->

<!-- property -->
<!-- set value from this host's query -->
<input [value]="query">
<!-- set value from the parent host's query -->
<input [value]="^query">
<!-- set value from the grandparent host's query -->
<input [value]="^^query">

<!-- ---------------------------------------- -->

<!-- attribute -->
<!-- set href from this host's profileUrl -->
<a [href]="profileUrl">profile</a>
<!-- set href from the parent host's profileUrl -->
<a [href]="^profileUrl">profile</a>
<!-- set href from the grandparent host's profileUrl -->
<a [href]="^^profileUrl">profile</a>

<!-- ---------------------------------------- -->

<!-- class toggle -->
<!-- toggle active from this host's isSelected -->
<li [class.active]="isSelected">...</li>
<!-- toggle active from the parent host's isSelected -->
<li [class.active]="^isSelected">...</li>
<!-- toggle active from the grandparent host's isSelected -->
<li [class.active]="^^isSelected">...</li>

<!-- ---------------------------------------- -->

<!-- style -->
<!-- set style from this host's barStyle -->
<div [style]="barStyle"></div>
<!-- set style from the parent host's barStyle -->
<div [style]="^barStyle"></div>
<!-- set style from the grandparent host's barStyle -->
<div [style]="^^barStyle"></div>

<!-- ---------------------------------------- -->

<!-- tap -->
<!-- write this element's value to the host's volume -->
<my-slider [(value)]="volume"></my-slider>
<!-- write this element's value to the parent host's volume -->
<my-slider [(value)]="^volume"></my-slider>
<!-- write this element's value to the grandparent host's volume -->
<my-slider [(value)]="^^volume"></my-slider>`;

const IMPERATIVE_SNIPPET = `<!-- event -->
<!-- call a method on this host -->
<button onclick="submit">send</button>
<!-- call a method on the parent host -->
<button onclick="^submit">send</button>
<!-- call a method on the grandparent host -->
<button onclick="^^submit">send</button>

<!-- ---------------------------------------- -->

<!-- event with static arguments (only literals, no reactive values) -->
<!-- call a method on this host -->
<button onclick="increment(5)">+5</button>
<!-- call a method on the parent host -->
<button onclick="^increment(-1)">-1</button>
<!-- call a method on the grandparent host -->
<button onclick="^^increment(10)">+10</button>

<!-- ---------------------------------------- -->

<!-- event with $event (passes the native DOM event to the method) -->
<!-- call a method on this host -->
<div onpointerdown="grab($event)"></div>
<!-- call a method on the parent host -->
<div onpointermove="^drag($event)"></div>
<!-- call a method on the grandparent host -->
<div onpointerup="^^release($event)"></div>

<!-- ---------------------------------------- -->

<!-- ref -->
<canvas #surface></canvas>`;

const ATTRIBUTE_SNIPPET = `<!-- static — read once on connect, decoded by the field's codec -->
<weather-card lat="52.52" lon="13.41"></weather-card>

<!-- ---------------------------------------- -->

<!-- reactive — subscribe to this host's observable -->
<weather-card [lat]="lat" [lon]="lon"></weather-card>
<!-- reactive (nested) — write into a sub-property on the element's @state field -->
<form-field [field.disabled]="isSubmitting" [field.error]="serverError"></form-field>

<!-- ---------------------------------------- -->

<!-- reactive — subscribe to the parent host's observable -->
<weather-card [lat]="^lat" [lon]="^lon"></weather-card>
<!-- reactive — subscribe to the grandparent host's observable -->
<weather-card [lat]="^^lat" [lon]="^^lon"></weather-card>`;

const BUILTIN_CODECS_SOURCE = `// every native JS type has a built-in codec:
string    // passthrough
number    // Number(s), String(v)
boolean   // s !== 'false', String(v)
bigint    // BigInt(s), String(v)
Date      // new Date(s), toISOString()
URL       // new URL(s), href
RegExp    // new RegExp(s), source
Map       // JSON.parse → new Map(entries)
Set       // JSON.parse → new Set(items)
Array     // JSON.parse / JSON.stringify
Object    // JSON.parse / JSON.stringify
Uint8Array, Int8Array, Float32Array, ...  // JSON array`;

const DATE_TICKER_SOURCE = `import { Component, RxElement, state } from '@yaw-rx/core';

@Component({
    selector: 'date-ticker',
    template: \`
        <span class="label">Date</span>
        <code class="value">{{now}}</code>
    \`,
})
export class DateTicker extends RxElement {
    @state now!: Date;
}`;

const DECIMAL_SOURCE = `import Decimal from 'decimal.js';
import { Component, RxElement, state } from '@yaw-rx/core';

@Component({
    selector: 'decimal-demo',
    attributeCodecs: {
        Decimal: {
            encode: (v: Decimal) => v.toString(),
            decode: (s: string) => new Decimal(s),
        },
    },
    template: \`
        <code class="value">{{total}}</code>
        <button onclick="add('0.1')">+ 0.1</button>
        <button onclick="add('0.2')">+ 0.2</button>
        <p>0.1 + 0.2 = {{sum}} — no floating point drift</p>
    \`,
})
export class DecimalDemo extends RxElement {
    @state total!: Decimal;

    add(n: string): void { this.total = this.total.plus(n); }
    reset(): void { this.total = new Decimal('0.00'); }
}`;

const ADDRESS_SOURCE = `import { getAddress, type Address } from 'viem';
import { Component, RxElement, state } from '@yaw-rx/core';

@Component({
    selector: 'address-demo',
    attributeCodecs: {
        Address: {
            encode: (v: Address) => v,
            decode: (s: string) => getAddress(s),
        },
    },
    template: \`
        <code class="value">{{wallet}}</code>
        <button onclick="setVitalik">vitalik.eth</button>
        <button onclick="setZero">zero address</button>
    \`,
})
export class AddressDemo extends RxElement {
    @state wallet!: Address;

    setVitalik(): void {
        this.wallet = getAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
    }
    setZero(): void {
        this.wallet = getAddress('0x0000000000000000000000000000000000000000');
    }
}`;

const PLAINDATE_SOURCE = `import { Component, RxElement, state } from '@yaw-rx/core';

// Temporal is native — no import, no polyfill
@Component({
    selector: 'plaindate-demo',
    attributeCodecs: {
        PlainDate: {
            encode: (v: Temporal.PlainDate) => v.toString(),
            decode: (s: string) => Temporal.PlainDate.from(s),
        },
    },
    template: \`
        <code class="value">{{birthday}}</code>
        <button onclick="nextDay">+ day</button>
        <button onclick="nextMonth">+ month</button>
    \`,
})
export class PlainDateDemo extends RxElement {
    @state birthday!: Temporal.PlainDate;

    nextDay(): void { this.birthday = this.birthday.add({ days: 1 }); }
    nextMonth(): void { this.birthday = this.birthday.add({ months: 1 }); }
}`;

const DAYJS_SOURCE = `import dayjs, { type Dayjs } from 'dayjs';
import { Component, RxElement, state } from '@yaw-rx/core';

@Component({
    selector: 'dayjs-demo',
    attributeCodecs: {
        Dayjs: {
            encode: (v: Dayjs) => v.toISOString(),
            decode: (s: string) => dayjs(s),
        },
    },
    template: \`
        <code class="value">{{due}}</code>
        <button onclick="addWeek">+ week</button>
        <button onclick="addMonth">+ month</button>
    \`,
})
export class DayjsDemo extends RxElement {
    @state due!: Dayjs;

    addWeek(): void { this.due = this.due.add(7, 'day'); }
    addMonth(): void { this.due = this.due.add(1, 'month'); }
}`;

const ERROR_SOURCE = `// if a codec throws, the framework wraps it:
AttributeMarshalError
  attribute "count": failed to decode as number — value was "not-a-number"
  cause: Error: not a number

// field name, type name, direction (encode/decode), raw value, cause`;

@Component({
    selector: 'components-section',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="components">Components</h1>
        <p class="lede">You write a class that extends
           <code class="inline">RxElement</code> and decorate it
           with <code class="inline">@Component</code>. The
           decorator takes a selector — the HTML tag name — along
           with the template, styles, and any directives, services,
           or codecs the component needs.</p>
        <p class="lede">A class decorated with
           <code class="inline">@Component</code> is a <em>host</em>
           — it owns a template and provides the scope that bindings
           resolve against: its <code class="inline">@state</code>
           fields, methods, and injected services. Vanilla HTML tags
           like <code class="inline">${escape`<div>`}</code> or
           <code class="inline">${escape`<span>`}</code> are not
           hosts. When a binding needs to reach beyond the nearest
           host, a <code class="inline">^</code> prefix targets the
           next host up the DOM tree,
           <code class="inline">^^</code> the one above that, and
           so on.</p>
            <code-block syntax="ts">${escape`import { Component, RxElement } from '@yaw-rx/core';

@Component({
    selector: 'my-tag',      // custom element name — must contain a hyphen
    template: \`...\`,         // HTML template string
    styles: \`...\`,           // CSS — scoped to the selector
    providers: [...],        // DI providers scoped to this component
    directives: [...],       // directives available in this template
    attributeCodecs: {...},  // local codec registrations for attribute marshalling
})`}</code-block>

        <section class="host" toc-section="components/state">
            <h2 toc-anchor="components/state">Reactive state</h2>
            <p class="note">
               The <code class="inline">@state</code> decorator — a standard
               (TC39) <code class="inline">ClassAccessorDecorator</code> — turns a class field into a reactive primitive.
               Under the hood it replaces the field with an
               <code class="inline">accessor</code> backed by a
               <code class="inline">StateSubject</code> (a <code class="inline">BehaviorSubject</code>),
               exposed as <code class="inline">fieldName$</code> on the class. Reading the field
               returns the subject's current value. When you write to it, it simply nexts the subject
               <code class="inline">fieldName$.next(newValue)</code>.
               That's all it does. There is nothing else up our sleeves.
            </p>
            <p class="note">
               A transformer, the
               codec registry, and the IDE plugin work together so nothing is
               stringly-typed and nothing is <code class="inline">any</code>.
            </p>
            <code-block class="install" syntax="bash">${escape`npm install @yaw-rx/transformer @yaw-rx/ts-plugin ts-patch --save-dev`}</code-block>

            <section class="host" toc-section="components/state/decorator">
                <h2 toc-anchor="components/state/decorator">@state</h2>
                <p class="note">No manual subject creation, no
                   <code class="inline">.getValue()</code>, no boilerplate.
                   Declare the field, use it like a property — the decorator
                   handles the rest.</p>
                <code-block syntax="ts">${escape`${STATE_DECORATOR_SOURCE}`}</code-block>
            </section>

            <section class="host" toc-section="components/state/dollar">
                <h2 toc-anchor="components/state/dollar">The reactive stream ($)</h2>
                <p class="note">Subscribe to it, pipe it, pass it to a
                   template binding. The template compiler resolves binding
                   paths to observables — so
                   <code class="inline">${escape`{{doubled}}`}</code> subscribes automatically.</p>
                <code-block syntax="ts">${escape`${STATE_DOLLAR_SOURCE}`}</code-block>
            </section>

            <section class="host" toc-section="components/state/touch">
                <h2 toc-anchor="components/state/touch">touch()</h2>
                <p class="note">
                    When <code class="inline">@state field: ${escape`<type>`}</code> holds a
                    complex type — a nested object <code class="inline">{nested:{a: number}}</code>, a <code class="inline">Set</code>, <code class="inline">Array</code>, <code class="inline">Map</code>, etc
                    — mutating a member e.g. <code class="inline">this.field.nested.a = 'foo'</code> does not invoke the setter on <code class="inline">field</code>,
                    so the <code class="inline">field$</code> subject will not fire.
                </p>
                <p class="note">
                    <code class="inline">StateSubject</code> provides
                    <code class="inline">this.field$.touch()</code> to force a re-emit after an in-place mutation:
                </p>
                <code-block syntax="ts">${escape`this.field.nested.a = 'foo';\nthis.field$.touch();`}</code-block>
                <p class="note">When performing multiple batch updates — touch at the end so subscribers see only one emission:</p>
                <code-block syntax="ts">${escape`this.items.push(a, b, c);\nthis.items.sort(compareFn);\nthis.items$.touch();`}</code-block>
                <p class="note">Here's a full component that mutates a nested
                   <code class="inline">Settings</code> object and calls
                   <code class="inline">touch()</code> to push the change:</p>
                <code-block syntax="ts">${escape`${TOUCH_DEMO_SOURCE}`}</code-block>
                <section class="ex">
                    <h2>Mutate, touch, re-emit</h2>
                    <p class="note">Toggle the theme or bump the font size — each
                       mutates a property on the same <code class="inline">Settings</code>
                       object and calls <code class="inline">touch()</code> to re-emit.
                       The summary line updates because the stream fires, not because
                       the reference changed.</p>
                    <div class="split">
                        <code-block syntax="html">${escape`<touch-demo></touch-demo>`}</code-block>
                        <div class="live"><touch-demo></touch-demo></div>
                    </div>
                </section>
            </section>

            <section class="host" toc-section="components/state/plugin">
                <h2 toc-anchor="components/state/plugin">IDE plugin</h2>
                <p class="note"><code class="inline">@yaw-rx/ts-plugin</code> is a
                   TypeScript language service plugin. It intercepts the source
                   before type-checking and injects
                   <code class="inline">declare</code> property declarations for
                   every <code class="inline">$</code> getter — with the full
                   generic type, including parameterised types like
                   <code class="inline">Map&lt;string, number&gt;</code>.
                   Autocomplete, hover, go-to-definition, syntax colouring — all
                   correct.</p>
                <code-block syntax="json">${escape`${PLUGIN_SOURCE}`}</code-block>
                <code-block syntax="ts">${escape`${PLUGIN_WHAT_SOURCE}`}</code-block>
            </section>
        </section>

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

        <section class="host" toc-section="components/paths">
            <h2 toc-anchor="components/paths">Binding paths</h2>
            <p class="note">Every binding — attributes, template interpolations,
               event handlers — takes a <strong>path</strong> that points at a
               member on a component instance. There are no operators, no
               ternaries, no pipes. Logic lives in getters and observables on
               the class (where it always belonged), never in the template.
               The goal of a path is to resolve a value.</p>

            <section class="host" toc-section="components/paths/static">
                <h3 toc-anchor="components/paths/static">Static values</h3>
                <p class="note">The simplest form. A plain HTML attribute with a
                   string value. Read once when the element connects — a codec
                   decodes the string into the typed value of the matching
                   <code class="inline">@state</code> field.</p>
                <code-block syntax="html">${escape`<!-- lat and lon are @state fields on weather-card -->
<!-- the string "52.52" is decoded to the number 52.52 on connect -->
<weather-card lat="52.52" lon="13.41"></weather-card>`}</code-block>
            </section>

            <section class="host" toc-section="components/paths/fields">
                <h3 toc-anchor="components/paths/fields">Fields</h3>
                <p class="note">A single identifier that names a member on the
                   host component. The system checks three things in order:
                   is the member itself an Observable — subscribe. Does a
                   <code class="inline">$</code> sibling exist (e.g.
                   <code class="inline">count$</code> from
                   <code class="inline">@state</code>) — subscribe to that.
                   Neither — read the plain value once.</p>
                <code-block syntax="html">${escape`<!-- count is @state — system finds count$ (StateSubject), subscribes -->
<span>{{count}}</span>

<!-- doubled is a getter returning Observable<number> — subscribes -->
<span>{{doubled}}</span>

<!-- title is a plain string property — read once -->
<span>{{title}}</span>`}</code-block>
            </section>

            <section class="host" toc-section="components/paths/dotted">
                <h3 toc-anchor="components/paths/dotted">Dotted paths</h3>
                <p class="note">Dot-separated segments walk into an object.
                   Each segment is resolved independently — if a segment is
                   observable, the binding subscribes to it and reads the
                   next segment off each emission. If a segment is plain, it
                   is read once and the chain continues. Any mix of observable
                   and plain segments works. When an observable segment emits
                   a new value, everything downstream re-evaluates.</p>
                <code-block syntax="ts">${escape`// given these members on the host:
@state config: { theme: string };
@state user: { profile: { name: string; avatar: string } };
@state dashboard: { stats: Observable<{ total: number }> };
@state app: { session: Observable<{ prefs: { lang: string } }> };
get latency(): Observable<{ p99: number }> { ... }
`}</code-block>
                <code-block syntax="html">${escape`<!-- config is an @state field, as it's an observable subscribes to
     config$, reads .theme off each emission -->
<span>{{config.theme}}</span>

<!-- user is an @state field, as it's an observable subscribes to
     user$, reads .profile, as profile is a plain object reads
     .name off that -->
<span>{{user.profile.name}}</span>

<!-- dashboard is an @state field, as it's an observable subscribes
     to dashboard$, reads .stats, as stats is itself an observable
     subscribes again, reads .total off each emission -->
<span>{{dashboard.stats.total}}</span>

<!-- app is an @state field, as it's an observable subscribes to
     app$, reads .session, as session is itself an observable
     subscribes again, reads .prefs, as prefs is a plain object
     reads .lang off that -->
<span>{{app.session.prefs.lang}}</span>

<!-- latency is a getter, as it returns an observable subscribes
     to it, reads .p99 off each emission -->
<span>{{latency.p99}}</span>`}</code-block>
            </section>

            <section class="host" toc-section="components/paths/carets">
                <h3 toc-anchor="components/paths/carets">Carets — scope hopping</h3>
                <p class="note">By default a path resolves against the component
                   whose template it appears in. Prefix with
                   <code class="inline">^</code> to resolve against the parent
                   host instead, <code class="inline">^^</code> for the
                   grandparent, and so on. Each caret hops one host boundary
                   in the DOM tree. The rest of the path — fields, dotted
                   segments, observable resolution — works identically.</p>
                <code-block syntax="html">${escape`<!-- read count from the parent host -->
<span>{{^count}}</span>

<!-- read count from the grandparent host -->
<span>{{^^count}}</span>

<!-- dotted path on the parent host -->
<span>{{^weather.temp}}</span>`}</code-block>
            </section>

            <section class="host" toc-section="components/paths/methods">
                <h3 toc-anchor="components/paths/methods">Methods</h3>
                <p class="note">Event bindings resolve the path to a method
                   and call it. Without parentheses the method receives the
                   DOM event as its sole argument. With parentheses you pass
                   literal values — strings, numbers, booleans, null — or
                   <code class="inline">$event</code> to forward the event
                   explicitly. Arguments must be static — no reactive
                   values, no paths. Carets work here too.</p>
                <code-block syntax="html">${escape`<!-- called with the DOM event -->
<button onclick="submit">send</button>

<!-- called with a literal argument -->
<button onclick="increment(5)">+5</button>

<!-- explicit $event forwarding -->
<div onpointerdown="grab($event)"></div>

<!-- method on the parent host -->
<button onclick="^submit">send</button>`}</code-block>
            </section>
        </section>

        <section class="host" toc-section="components/attributes">
            <h2 toc-anchor="components/attributes">Attributes</h2>
            <p class="note">Data flows into an element via HTML attributes.
               A static literal like <code class="inline">lat="52.52"</code> is
               read on connect — a codec decodes the string into the
               typed value of the matching <code class="inline">@state</code> field.
               A reactive binding like <code class="inline">[lat]="lat"</code>
               subscribes to the host's <code class="inline">lat</code>
               observable and pushes each emission into the element.</p>
            <table class="binding-table">
                <thead>
                    <tr><th>Form</th><th>Syntax</th><th>Description</th></tr>
                </thead>
                <tbody>
                    <tr><td>static</td><td><code>attr="value"</code></td><td>Read once when the element connects, decoded via the element's <code>@state</code> field codec into its typed value</td></tr>
                    <tr><td>reactive</td><td><code>[attr]="path"</code></td><td>Subscribes to the host's observable and pushes each emission into the respective <code>@state</code> field on the element</td></tr>
                    <tr><td>reactive (nested)</td><td><code>[attr.prop]="path"</code></td><td>Subscribes to the host's observable and writes each emission into a nested property on the element's <code>@state</code> field, re-emitting the subject</td></tr>
                    <tr><td>reactive (parent)</td><td><code>[attr]="^path"</code></td><td>Subscribes to the parent of the host's observable and pushes each emission into the respective <code>@state</code> field on the element</td></tr>
                    <tr><td>reactive (grandparent)</td><td><code>[attr]="^^path"</code></td><td>Same, but reads from the grandparent of the host</td></tr>
                </tbody>
            </table>
            <code-block syntax="html">${escape`${ATTRIBUTE_SNIPPET}`}</code-block>
        </section>

        <section class="host" toc-section="components/bindings">
            <h2 toc-anchor="components/bindings">Template bindings</h2>
            <p class="note">Templates support several kinds of bindings.
               There are two groups: data bindings that resolve a path
               on the host and push values to the DOM, and imperative
               bindings that respond to events or capture refs.</p>
            <section toc-section="components/bindings/data">
            <h3 toc-anchor="components/bindings/data">Data</h3>
            <p class="note">Paths resolve against the component
               whose template you are writing in — an
               <code class="inline">@state</code> field like
               <code class="inline">count</code>, an observable
               getter, or a plain property.
               Prefix with <code class="inline">^</code> to read
               from the parent host, or
               <code class="inline">^^</code> the grandparent
               (see the
               <a href="/examples/nesting-example">Nesting example</a>).
               Mustaches (<code class="inline">${escape`{{path}}`}</code>)
               write text content; bracket bindings target a specific
               property, attribute, class, or style on the element.</p>
            <p class="note">The tap binding writes in the opposite
               direction. When you place
               <code class="inline">[(value)]="count"</code> on a
               component in your template, that component's
               <code class="inline">value</code> state writes into
               your <code class="inline">count</code>
               (see the
               <a href="/examples/custom-slider">Custom slider</a>).
               Carets work the same way —
               <code class="inline">[(value)]="^count"</code>
               writes to your parent host's
               <code class="inline">count</code> instead of
               yours.</p>
            <table class="binding-table">
                <thead>
                    <tr><th>Binding</th><th>Syntax</th><th>Description</th></tr>
                </thead>
                <tbody>
                    <tr><td>text (mustache)</td><td><code>${escape`{{path}}`}</code></td><td>Subscribes to an observable and updates the element's <code>textContent</code> whenever it emits, or reads a plain value once</td></tr>
                    <tr><td>property</td><td><code>[prop]="path"</code></td><td>Subscribes and sets a JavaScript property on the element, or reads a plain value once</td></tr>
                    <tr><td>attribute</td><td><code>[attr]="path"</code></td><td>Subscribes and calls <code>setAttribute</code> on the element whenever it emits, or reads a plain value once</td></tr>
                    <tr><td>class</td><td><code>[class.name]="path"</code></td><td>Subscribes and toggles a CSS class on the element's <code>classList</code> based on truthiness, or reads a plain value once</td></tr>
                    <tr><td>style</td><td><code>[style.prop]="path"</code></td><td>Subscribes and sets an inline style property on the element via <code>element.style</code>, or reads a plain value once</td></tr>
                    <tr><td>tap</td><td><code>[(prop)]="path"</code></td><td>Subscribes to the element's own <code>@state</code> field and writes each new value to a property on the host (<code>hostProp</code>) or an ancestor host (<code>^parentHostProp</code>)</td></tr>
                </tbody>
            </table>
            <code-block syntax="html">${escape`${REACTIVE_SNIPPET}`}</code-block>
            </section>
            <section toc-section="components/bindings/imperative">
            <h3 toc-anchor="components/bindings/imperative">Imperative</h3>
            <p class="note">Respond to user actions or wire up element references.</p>
            <table class="binding-table">
                <thead>
                    <tr><th>Binding</th><th>Syntax</th><th>Description</th></tr>
                </thead>
                <tbody>
                    <tr><td>event</td><td><code>onclick="method"</code></td><td>Listens for a DOM event and calls a method on the host or an ancestor host</td></tr>
                    <tr><td>ref</td><td><code>#name</code></td><td>Captures the DOM element as a property so you can use it in <code>onRender</code> or methods</td></tr>
                </tbody>
            </table>
            <code-block syntax="html">${escape`${IMPERATIVE_SNIPPET}`}</code-block>
            </section>
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

        <section class="host" toc-section="components/lifecycle">
            <h2 toc-anchor="components/lifecycle">Lifecycle</h2>
            <p class="note"><code class="inline">onInit</code> fires after
               the element is fully wired — dependencies are injected,
               attributes are hydrated, bindings are live, and the template
               is in the DOM. <code class="inline">onRender</code> fires
               one microtask later, after the template's children have
               had their own bindings established — so
               <code class="inline">#ref</code> elements are available.
               Use it when you need to work with child elements captured
               via refs. <code class="inline">onDestroy</code> fires on
               removal after the framework has torn down its own bindings
               and directives — you only clean up what you own.</p>
            <code-block syntax="ts">${escape`import { Component, RxElement, state } from '@yaw-rx/core';
import { interval, type Subscription } from 'rxjs';

@Component({
    selector: 'tick-counter',
    template: \`<span>{{elapsed}}s</span><canvas #graph></canvas>\`,
})
export class TickCounter extends RxElement {
    @state elapsed = 0;
    graph!: HTMLCanvasElement;
    private sub!: Subscription;

    override onInit(): void {
        this.sub = interval(1000).subscribe(() => this.elapsed++);
    }

    override onRender(): void {
        // refs are available here — graph is the <canvas> element
        const ctx = this.graph.getContext('2d');
    }

    override onDestroy(): void {
        this.sub.unsubscribe();
    }
}`}</code-block>
        </section>

        <section class="host" toc-section="components/marshalling">
            <h2 toc-anchor="components/marshalling">Attribute marshalling</h2>
            <p class="note">HTML attributes are strings. The attribute codec
               registry turns them into typed values on connect. A parent
               component passes <code class="inline">count="42"</code> as a
               string attribute; the element's
               <code class="inline">@state count = 0</code> field receives
               <code class="inline">42</code> as a number. Dates, URLs,
               maps — same story.</p>

            <section class="host" toc-section="components/marshalling/builtin-codecs">
                <h3 toc-anchor="components/marshalling/builtin-codecs">Built-in codecs</h3>
                <p class="note">The attribute codec registry ships with encoders
                   and decoders for every native JS type. When a component connects,
                   <code class="inline">readAttributes()</code> looks up the codec
                   by type name and deserialises the HTML attribute string into the
                   correct runtime value.</p>
                <code-block syntax="ts">${escape`${BUILTIN_CODECS_SOURCE}`}</code-block>
            </section>

            <section class="host" toc-section="components/marshalling/date">
                <h3 toc-anchor="components/marshalling/date">Date — built-in codec</h3>
                <p class="note"><code class="inline">Date</code> is handled by
                   the built-in codec. The codec serialises via
                   <code class="inline">toISOString()</code> and deserialises
                   via <code class="inline">new Date(s)</code>.</p>
                <code-block syntax="ts">${escape`${DATE_TICKER_SOURCE}`}</code-block>
                <section class="ex">
                    <h2>In action</h2>
                    <div class="split">
                        <code-block syntax="html">${escape`<date-ticker now="2026-04-24T12:00:00.000Z"></date-ticker>`}</code-block>
                        <div class="live"><date-ticker now="2026-04-24T12:00:00.000Z"></date-ticker></div>
                    </div>
                </section>
            </section>

            <section class="host" toc-section="components/marshalling/custom-codecs">
                <h3 toc-anchor="components/marshalling/custom-codecs">Custom codecs</h3>
                <p class="note">The built-in codecs cover native JS types, but real
                   applications use domain types — arbitrary-precision decimals,
                   checksummed blockchain addresses, calendar dates without time
                   zones. For any type outside the built-in set, register an
                   <code class="inline">AttributeCodec&lt;T&gt;</code> in
                   <code class="inline">bootstrap()</code>. A codec is two
                   functions: <code class="inline">encode</code> turns a value
                   into a string for the attribute, and
                   <code class="inline">decode</code> turns the attribute string
                   back into a typed value. The key in the map is the type name
                   the transformer emits in
                   <code class="inline">__stateTypes</code> — so a field declared
                   as <code class="inline">@state total: Decimal</code> looks up
                   the <code class="inline">'Decimal'</code> codec automatically.
                   No manual wiring per field, no type assertions.</p>

                <section class="host" toc-section="components/marshalling/custom-codecs/decimal">
                    <h3 toc-anchor="components/marshalling/custom-codecs/decimal">Decimal</h3>
                    <p class="note">Arbitrary-precision arithmetic via
                       <code class="inline">decimal.js</code>. Click
                       <code class="inline">+ 0.1</code> and
                       <code class="inline">+ 0.2</code> — no floating-point drift.</p>
                    <code-block syntax="ts">${escape`${DECIMAL_SOURCE}`}</code-block>
                    <section class="ex">
                        <h2>In action</h2>
                        <div class="split">
                            <code-block syntax="html">${escape`<decimal-demo total="99.95"></decimal-demo>`}</code-block>
                            <div class="live"><decimal-demo total="99.95"></decimal-demo></div>
                        </div>
                    </section>
                </section>

                <section class="host" toc-section="components/marshalling/custom-codecs/address">
                    <h3 toc-anchor="components/marshalling/custom-codecs/address">Ethereum address</h3>
                    <p class="note">Checksummed address via
                       <code class="inline">viem</code>.
                       <code class="inline">getAddress()</code> validates and
                       checksums on decode — an invalid address throws at
                       connect time, not at render time.</p>
                    <code-block syntax="ts">${escape`${ADDRESS_SOURCE}`}</code-block>
                    <section class="ex">
                        <h2>In action</h2>
                        <div class="split">
                            <code-block syntax="html">${escape`<address-demo wallet="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"></address-demo>`}</code-block>
                            <div class="live"><address-demo wallet="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"></address-demo></div>
                        </div>
                    </section>
                </section>

                <section class="host" toc-section="components/marshalling/custom-codecs/plaindate">
                    <h3 toc-anchor="components/marshalling/custom-codecs/plaindate">Temporal.PlainDate</h3>
                    <p class="note">TC39 <code class="inline">Temporal</code> — native
                       in browsers, no polyfill. Date-only, no time zone ambiguity.
                       <code class="inline">.add()</code> returns a new immutable value.</p>
                    <code-block syntax="ts">${escape`${PLAINDATE_SOURCE}`}</code-block>
                    <section class="ex">
                        <h2>In action</h2>
                        <div class="split">
                            <code-block syntax="html">${escape`<plaindate-demo birthday="1990-01-01"></plaindate-demo>`}</code-block>
                            <div class="live"><plaindate-demo birthday="1990-01-01"></plaindate-demo></div>
                        </div>
                    </section>
                </section>

                <section class="host" toc-section="components/marshalling/custom-codecs/dayjs">
                    <h3 toc-anchor="components/marshalling/custom-codecs/dayjs">Dayjs</h3>
                    <p class="note"><code class="inline">dayjs</code> — the 2kB
                       <code class="inline">Date</code> replacement everyone already
                       uses. Immutable, chainable, locale-aware.</p>
                    <code-block syntax="ts">${escape`${DAYJS_SOURCE}`}</code-block>
                    <section class="ex">
                        <h2>In action</h2>
                        <div class="split">
                            <code-block syntax="html">${escape`<dayjs-demo due="2026-05-01T00:00:00.000Z"></dayjs-demo>`}</code-block>
                            <div class="live"><dayjs-demo due="2026-05-01T00:00:00.000Z"></dayjs-demo></div>
                        </div>
                    </section>
                </section>
            </section>

            <section class="host" toc-section="components/marshalling/errors">
                <h3 toc-anchor="components/marshalling/errors">Error handling</h3>
                <p class="note">If a codec's <code class="inline">decode</code> or
                   <code class="inline">encode</code> throws, the framework wraps
                   the error in an
                   <code class="inline">AttributeMarshalError</code> with the field
                   name, the type name, the direction, the raw string, and the
                   original cause.</p>
                <code-block syntax="ts">${escape`${ERROR_SOURCE}`}</code-block>
            </section>
        </section>

        <section class="host" toc-section="components/escape">
            <h2 toc-anchor="components/escape">Escaping mustaches and HTML</h2>
            <p class="note">A template compiles its mustache paths into
               observable bindings. To show those characters as literal text --
               documenting the binding syntax, naming a tag without rendering
               it, or dumping source verbatim into a
               <code class="inline">code-block</code> -- wrap the content with
               <code class="inline">escape</code> from
               <code class="inline">@yaw-rx/common</code>. It escapes HTML entities
               and marks the subtree so the compiler leaves it alone. An empty
               or whitespace-only mustache that survives compilation throws
               <code class="inline">TemplateWalkError</code>, pointing you
               here.</p>
            <code-block syntax="ts">${escape`${ESCAPE_SNIPPET}`}</code-block>
        </section>
    `,
    styles: `
        :host { display: block; }
        .install { margin-bottom: 2rem; }
        .live { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1rem; }
        .live > * { width: 100%; }
        .binding-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin: 0.5rem 0 1.5rem; }
        .binding-table th { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid var(--border); color: var(--subtle); font-weight: 600; }
        .binding-table td { padding: 0.4rem 0.5rem; border-bottom: var(--border-width) solid var(--bg-5); vertical-align: top; }
        .binding-table td:first-child { white-space: nowrap; font-weight: 600; color: var(--white); }
        .binding-table td:nth-child(2) { white-space: nowrap; font-size: 0.8rem; }
        .binding-table code { color: var(--accent); }
        h3 { color: var(--text); font-size: 1rem; margin: 1.5rem 0 0.25rem; }
        @media (max-width: 640px) {
            .binding-table { font-size: 0.8rem; }
            .binding-table td:nth-child(2) { font-size: 0.72rem; }
            .binding-table td { padding: 0.3rem 0.3rem; }
        }
        @media (max-width: 420px) {
            .binding-table { font-size: 0.6rem; }
            .binding-table td:nth-child(2) { font-size: 0.52rem; }
            .binding-table td { padding: 0.15rem 0.15rem; }
            .binding-table th { padding: 0.2rem 0.15rem; font-size: 0.6rem; }
        }
    `,
})
export class DocsComponents extends DocSection {}

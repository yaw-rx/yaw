import { Component, RxElement } from '@yaw-rx/core';
import { TocSection } from '../directives/toc-section.js';
import { TocAnchor } from '../directives/toc-anchor.js';
import { escape } from '../../../components/code-block/code-highlight.js';
import '../../../components/code-block.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';
import './reactive-state/date-ticker.js';
import './reactive-state/decimal-demo.js';
import './reactive-state/address-demo.js';
import './reactive-state/plaindate-demo.js';
import './reactive-state/dayjs-demo.js';

const STATE_DECORATOR_SOURCE = `import { Component, RxElement, state } from '@yaw-rx/core';

@Component({ selector: 'my-thing', template: '...', styles: '...' })
export class MyThing extends RxElement {
    @state count = 0;

    increment(): void {
        this.count += 1;    // emits on the underlying BehaviorSubject
    }
}

// @state does three things:
// 1. Replaces the field with a getter/setter backed by a BehaviorSubject
// 2. Creates a count$ getter returning BehaviorSubject<number>
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
    //   declare count$: BehaviorSubject<number>;
    //   declare created$: BehaviorSubject<Date>;
    //   declare items$: BehaviorSubject<Map<string, number>>;

    // full types, autocomplete, go-to-definition — no generics needed
}`;

const ERROR_SOURCE = `// if a codec throws, the framework wraps it:
AttributeMarshalError
  attribute "count": failed to decode as number — value was "not-a-number"
  cause: Error: not a number

// field name, type name, direction (encode/decode), raw value, cause`;

@Component({
    selector: 'docs-reactive-state',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="reactive-state">Reactive state</h1>
        <p class="lede">
           One of the main concepts in this framework you need to understand is
           reactive state. The <code class="inline">@state</code> decorator a standard
           (TC39) <code class="inline">ClassAccessorDecorator</code> turns a class field into a reactive primitive.
           Under the hood it replaces the field with an
           <code class="inline">accessor</code> backed by the
           <code class="inline">StateSubject</code> which is a <code class="inline">BehaviourSubject</code>, 
           exposed as <code class="inline">fieldName$</code> on the class. Reading the field
           returns the subject's current value. When you write to it
           using a plain property set it does a whole entity replacement
           and calls <code class="inline">fieldName$.next(newValue)</code>.
           That's all it does. There is nothing else up our sleeves.
        </p>

        <p class="lede">
            Due to the simplicity of the implementation (which was done for performance reasons) there is an edge case you
            need to be aware of... When <code class="inline">@state field: ${escape`<type>`}</code> relates to a
            complex type e.g. a nested object <code class="inline">{nested:{a: number}}</code> or a <code class="inline">Set</code>, <code class="inline">Array</code>, <code class="inline">Map</code> etc, etc
            ...mutating a member on this e.g. <code class="inline">this.field.nested.a = 'foo'</code> does not invoke the setter on <code class="inline">field</code>
            and thus the <code class="inline">field$</code> subject will not fire!
        </p>

        <p class="lede">
            To deal with the lack of subject firing, during complex mutations, <code class="inline">StateSubject</code> provides
            a method <code class="inline">this.field$.touch()</code> which you can use to force an update:
        </p>

        <code-block syntax="ts">${escape`this.field.nested.a = 'foo';\nthis.field$.touch();`}</code-block>

        <p class="lede">
           A transformer, the
           codec registry, and the IDE plugin work together so nothing is
           stringly-typed and nothing is <code class="inline">any</code>.
        </p>

        <code-block class="install" syntax="bash">${escape`npm install @yaw-rx/transformer @yaw-rx/ts-plugin ts-patch --save-dev`}</code-block>

        <section class="host" toc-section="reactive-state/decorator">
            <h2 toc-anchor="reactive-state/decorator">@state</h2>
            <p class="note">Decorate a field with
               <code class="inline">@state</code> and it becomes observable.
               The decorator replaces the field with a getter/setter pair
               backed by a <code class="inline">BehaviorSubject</code>. Writes
               go through <code class="inline">.next()</code>; reads return the
               current <code class="inline">.value</code>. No manual subject
               creation, no <code class="inline">.getValue()</code>, no
               boilerplate.</p>
            <code-block syntax="ts">${escape`${STATE_DECORATOR_SOURCE}`}</code-block>
        </section>

        <section class="host" toc-section="reactive-state/dollar">
            <h2 toc-anchor="reactive-state/dollar">The $ getter</h2>
            <p class="note">Every <code class="inline">@state</code> field gets
               a sibling getter ending in <code class="inline">$</code> that
               returns the underlying
               <code class="inline">BehaviorSubject&lt;T&gt;</code>. Subscribe to
               it, pipe it, pass it to a template binding. The template compiler
               resolves method-call expressions to observables — so
               <code class="inline">${escape`{{doubled}}`}</code> subscribes automatically.</p>
            <code-block syntax="ts">${escape`${STATE_DOLLAR_SOURCE}`}</code-block>
        </section>

        <section class="host" toc-section="reactive-state/plugin">
            <h2 toc-anchor="reactive-state/plugin">IDE plugin</h2>
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

        <section class="host" toc-section="reactive-state/attribute-marshalling">
            <h2 toc-anchor="reactive-state/attribute-marshalling">Attribute marshalling</h2>
            <p class="note">HTML attributes are strings. The attribute codec
               registry turns them into typed values on connect. A parent
               component passes <code class="inline">count="42"</code> as a
               string attribute; the child's
               <code class="inline">@state count = 0</code> field receives
               <code class="inline">42</code> as a number. Dates, URLs,
               maps — same story.</p>

            <section class="host" toc-section="reactive-state/attribute-marshalling/builtin-codecs">
                <h3 toc-anchor="reactive-state/attribute-marshalling/builtin-codecs">Built-in codecs</h3>
                <p class="note">The attribute codec registry ships with encoders
                   and decoders for every native JS type. When a component connects,
                   <code class="inline">readAttributes()</code> looks up the codec
                   by type name and deserialises the HTML attribute string into the
                   correct runtime value.</p>
                <code-block syntax="ts">${escape`${BUILTIN_CODECS_SOURCE}`}</code-block>
            </section>

            <section class="host" toc-section="reactive-state/attribute-marshalling/date">
                <h3 toc-anchor="reactive-state/attribute-marshalling/date">Date — built-in codec</h3>
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

            <section class="host" toc-section="reactive-state/attribute-marshalling/custom-codecs">
                <h3 toc-anchor="reactive-state/attribute-marshalling/custom-codecs">Custom codecs</h3>
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

                <section class="host" toc-section="reactive-state/attribute-marshalling/custom-codecs/decimal">
                    <h3 toc-anchor="reactive-state/attribute-marshalling/custom-codecs/decimal">Decimal</h3>
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

                <section class="host" toc-section="reactive-state/attribute-marshalling/custom-codecs/address">
                    <h3 toc-anchor="reactive-state/attribute-marshalling/custom-codecs/address">Ethereum address</h3>
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

                <section class="host" toc-section="reactive-state/attribute-marshalling/custom-codecs/plaindate">
                    <h3 toc-anchor="reactive-state/attribute-marshalling/custom-codecs/plaindate">Temporal.PlainDate</h3>
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

                <section class="host" toc-section="reactive-state/attribute-marshalling/custom-codecs/dayjs">
                    <h3 toc-anchor="reactive-state/attribute-marshalling/custom-codecs/dayjs">Dayjs</h3>
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

            <section class="host" toc-section="reactive-state/attribute-marshalling/errors">
                <h3 toc-anchor="reactive-state/attribute-marshalling/errors">Error handling</h3>
                <p class="note">If a codec's <code class="inline">decode</code> or
                   <code class="inline">encode</code> throws, the framework wraps
                   the error in an
                   <code class="inline">AttributeMarshalError</code> with the field
                   name, the type name, the direction, the raw string, and the
                   original cause.</p>
                <code-block syntax="ts">${escape`${ERROR_SOURCE}`}</code-block>
            </section>
        </section>

    `,
    styles: `
        :host { display: block; }
        ${DOC_STYLES}
        .install { margin-bottom: 2rem; }
        .live { display: flex; align-items: center; justify-content: center; }
        .live > * { width: 100%; }
    `,
})
export class DocsReactiveState extends RxElement {}

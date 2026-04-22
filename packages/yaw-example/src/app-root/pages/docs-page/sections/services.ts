import 'reflect-metadata';
import { BehaviorSubject } from 'rxjs';
import { Component, Inject, Injectable, RxElement, observable } from 'yaw';
import { escape } from '../../../components/code-block/code-highlight.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';

@Injectable()
export class Clock {
    readonly tick$ = new BehaviorSubject<string>(new Date().toLocaleTimeString());
    constructor() {
        setInterval(() => { this.tick$.next(new Date().toLocaleTimeString()); }, 1000);
    }
}

@Component({
    selector: 'clock-readout',
    template: `<span class="tick">{{now}}</span>`,
    styles: `
        :host { display: inline-block; padding: 0.6rem 1rem;
                background: #050505; border: 1px solid #1a1a1a; border-radius: 6px; }
        .tick { color: #8af; font-family: monospace; font-size: 1.25rem;
                letter-spacing: 0.06em; }
    `,
})
export class ClockReadout extends RxElement<{ now: string }> {
    @observable now = '';
    @Inject(Clock) private readonly clock!: Clock;

    override onInit(): void {
        this.clock.tick$.subscribe((t) => { this.now = t; });
    }
}

const SERVICE_SOURCE = `import { BehaviorSubject } from 'rxjs';
import { Injectable } from 'yaw';

@Injectable()
export class Clock {
    readonly tick$ = new BehaviorSubject<string>(new Date().toLocaleTimeString());
    constructor() {
        setInterval(() => { this.tick$.next(new Date().toLocaleTimeString()); }, 1000);
    }
}`;

const PROVIDE_SOURCE = `// per-component — one instance per host, scoped to its subtree
@Component({
    selector: 'docs-services',
    providers: [Clock],
    ...
})
export class DocsServices extends RxElement {}

// or at bootstrap — global singleton, one instance for the whole app
bootstrap({
    root: AppRoot,
    providers: [Clock, Router, ...],
});`;

const RESOLVE_SOURCE = `// components: @Inject(Token) on a field
@Component({
    selector: 'clock-readout',
    template: '<span>{{now}}</span>',
})
export class ClockReadout extends RxElement<{ now: string }> {
    @observable now = '';
    @Inject(Clock) private readonly clock!: Clock;

    override onInit(): void {
        this.clock.tick$.subscribe((t) => { this.now = t; });
    }
}

// services & directives: @Injectable([Tokens]) + constructor args
@Injectable([Clock])
export class Analytics {
    constructor(private readonly clock: Clock) {}
}`;

const LIVE_USAGE = `<clock-readout></clock-readout>`;

@Component({
    selector: 'docs-services',
    providers: [Clock],
    template: `
        <h1>Services</h1>
        <p class="lede">A service is any class registered with an
           <code class="inline">Injector</code>. Decorate it with
           <code class="inline">@Injectable</code>, put it in a
           <code class="inline">providers</code> array, declare the dependency and
           the framework wires it — constructor args for services and directives,
           <code class="inline">@Inject()</code> on a field for components. The
           injector tree walks up the DOM; child providers shadow parents.</p>

        <section class="host" id="services-a" toc-section>
            <h2>A service</h2>
            <p class="note">Plain class, decorated. A <code class="inline">BehaviorSubject</code>
               that ticks once a second.</p>
            <code-block lang="ts">${escape`${SERVICE_SOURCE}`}</code-block>
        </section>

        <section class="host" id="services-register" toc-section>
            <h2>Registering it</h2>
            <p class="note">Two places. A component's
               <code class="inline">providers</code> array creates a child injector
               scoped to that subtree. <code class="inline">bootstrap()</code> puts
               it at the root injector — one instance, everywhere.</p>
            <code-block lang="ts">${escape`${PROVIDE_SOURCE}`}</code-block>
        </section>

        <section class="host" id="services-resolve" toc-section>
            <h2>Injecting it</h2>
            <p class="note">Two shapes, both token-driven. Services and directives
               list their deps in <code class="inline">@Injectable([...])</code>
               and the injector passes them as constructor arguments. Components
               can't use ctor args (the browser constructs custom elements), so
               declare a field and tag it with
               <code class="inline">@Inject(Token)</code> — the framework assigns
               it before <code class="inline">onInit</code> runs. Explicit tokens
               because Vite/esbuild doesn't emit TypeScript decorator metadata;
               no magic, no build-time plugin needed.</p>
            <code-block lang="ts">${escape`${RESOLVE_SOURCE}`}</code-block>
        </section>

        <section class="ex" id="services-live" toc-section>
            <h2>Live</h2>
            <p class="note">This section registers <code class="inline">Clock</code>
               in its own <code class="inline">providers</code>. The readout below
               declares <code class="inline">@Inject() clock!: Clock</code> and
               subscribes in <code class="inline">onInit</code>. A single service
               emitting to a single observer — no global state, no singleton module.</p>
            <div class="split">
                <code-block lang="html">${escape`${LIVE_USAGE}`}</code-block>
                <div class="live"><clock-readout></clock-readout></div>
            </div>
        </section>
    `,
    styles: `
        :host { display: block; }
        ${DOC_STYLES}
        .live { display: flex; align-items: center; justify-content: center; }
    `,
})
export class DocsServices extends RxElement {}

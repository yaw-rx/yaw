import 'reflect-metadata';
import { BehaviorSubject } from 'rxjs';
import { Component, Injectable, RxElement, observable } from 'yaw';
import { escape } from '../../../shared/lib/code-highlight.js';
import { DOC_STYLES } from '../../../shared/lib/doc-styles.js';

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

    override onInit(): void {
        const clock = RxElement.resolveInjector(this).resolve(Clock);
        clock.tick$.subscribe((t) => { this.now = t; });
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

const RESOLVE_SOURCE = `@Component({
    selector: 'clock-readout',
    template: '<span>{{now}}</span>',
})
export class ClockReadout extends RxElement<{ now: string }> {
    @observable now = '';

    override onInit(): void {
        const clock = RxElement.resolveInjector(this).resolve(Clock);
        clock.tick$.subscribe((t) => { this.now = t; });
    }
}`;

const LIVE_USAGE = `<clock-readout></clock-readout>`;

@Component({
    selector: 'docs-services',
    providers: [Clock],
    template: `
        <h1>Services</h1>
        <p class="lede">A service is any class registered with an
           <code class="inline">Injector</code>. Decorate it with
           <code class="inline">@Injectable</code>, declare it in a
           <code class="inline">providers</code> array, resolve it from any
           element with <code class="inline">RxElement.resolveInjector(el).resolve(Token)</code>.
           The injector tree walks up the DOM — child providers shadow parents.</p>

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
            <h2>Resolving it</h2>
            <p class="note"><code class="inline">RxElement.resolveInjector(this)</code>
               walks <code class="inline">parentElement</code> until it finds an
               injector. Resolution is lazy: services are instantiated on first
               <code class="inline">.resolve()</code>.</p>
            <code-block lang="ts">${escape`${RESOLVE_SOURCE}`}</code-block>
        </section>

        <section class="ex" id="services-live" toc-section>
            <h2>Live</h2>
            <p class="note">This section registers <code class="inline">Clock</code>
               in its own <code class="inline">providers</code>. The readout below
               resolves it and subscribes. A single service emitting to a single
               observer — no global state, no singleton module.</p>
            <div class="split">
                <code-block lang="html">${escape`${LIVE_USAGE}`}</code-block>
                <div class="live"><clock-readout></clock-readout></div>
            </div>
        </section>
    `,
    styles: `
        :host { display: block; }
        .live { display: flex; align-items: center; justify-content: center;
                padding: 1.5rem; background: #050505;
                border: 1px solid #1a1a1a; border-radius: 8px; }
        ${DOC_STYLES}
    `,
})
export class DocsServices extends RxElement {}

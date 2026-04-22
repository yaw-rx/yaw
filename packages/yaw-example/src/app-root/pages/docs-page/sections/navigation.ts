import 'reflect-metadata';
import { Component, Inject, RxElement, Router, observable } from 'yaw';
import { escape } from '../../../components/code-block/code-highlight.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';

@Component({
    selector: 'route-display',
    template: `
        <div class="panel">
            <div class="row">
                <span class="label">current route</span>
                <code class="path">{{route}}</code>
            </div>
            <div class="buttons">
                <button onclick="go('/')">/</button>
                <button onclick="go('/examples')">/examples</button>
                <button onclick="go('/docs')">/docs</button>
            </div>
        </div>
    `,
    styles: `
        :host { display: block; width: 100%; }
        .panel { display: flex; flex-direction: column; gap: 0.9rem; }
        .row { display: flex; align-items: center; gap: 0.75rem;
               justify-content: space-between; }
        .label { color: #888; font-family: monospace; font-size: 0.75rem;
                 text-transform: uppercase; letter-spacing: 0.08em; }
        .path { color: #8af; font-family: monospace; font-size: 1rem;
                background: #0a0a0a; padding: 0.35rem 0.7rem;
                border: 1px solid #1a1a1a; border-radius: 4px; }
        .buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        button { background: #111; border: 1px solid #333; color: #fff;
                 padding: 0.4rem 0.8rem; font: inherit; font-family: monospace;
                 font-size: 0.8rem; cursor: pointer; border-radius: 4px; }
        button:hover { border-color: #8af; color: #8af; }
    `,
})
export class RouteDisplay extends RxElement<{ route: string }> {
    @observable route = '/';
    @Inject(Router) private readonly router!: Router;

    override onInit(): void {
        this.router.route$.subscribe((r) => { this.route = r; });
    }

    go(path: string): void {
        this.router.navigate(path);
    }
}

const ROUTE_CONFIG_SOURCE = `bootstrap({
    root: AppRoot,
    providers: [
        { provide: ROUTES, useValue: [
            { path: '/',         component: ManifestoPage },
            { path: '/examples', component: ExamplesPage },
            { path: '/docs',     component: DocsPage },
            { path: '*',         component: NotFoundPage },
        ] },
        Router,
    ],
});`;

const OUTLET_SOURCE = `@Component({
    selector: 'app-root',
    template: \`
        <nav-bar></nav-bar>
        <rx-router-outlet></rx-router-outlet>
    \`,
})
export class AppRoot extends RxElement {}`;

const NAVIGATE_SOURCE = `@Component({ selector: 'route-display', ... })
export class RouteDisplay extends RxElement<{ route: string }> {
    @observable route = '/';
    @Inject(Router) private readonly router!: Router;

    override onInit(): void {
        this.router.route$.subscribe((r) => { this.route = r; });
    }

    go(path: string): void { this.router.navigate(path); }
}`;

const API_SOURCE = `class Router {
    readonly route$: BehaviorSubject<string>;
    navigate(path: string): void;
    resolve(path: string): CustomElementConstructor | undefined;
}`;

const LIVE_USAGE = `<route-display></route-display>`;

@Component({
    selector: 'docs-navigation',
    template: `
        <h1>Navigation</h1>
        <p class="lede">Routing is one service and one element.
           <code class="inline">Router</code> owns a
           <code class="inline">route$</code> BehaviorSubject of the current path;
           <code class="inline">&lt;rx-router-outlet&gt;</code> subscribes to it
           and swaps in the component for the matching route. Everything else —
           highlighting active links, driving transitions, lazy-loading routes —
           is just reading the subject.</p>

        <section class="host" id="navigation-routes" toc-section>
            <h2>Declaring routes</h2>
            <p class="note">An array of <code class="inline">{ path, component }</code>,
               plus an optional <code class="inline">{ path: '*', component }</code>
               wildcard. Provided through the <code class="inline">ROUTES</code>
               symbol so <code class="inline">Router</code> can depend on it.</p>
            <code-block lang="ts">${escape`${ROUTE_CONFIG_SOURCE}`}</code-block>
        </section>

        <section class="host" id="navigation-outlet" toc-section>
            <h2>The outlet</h2>
            <p class="note"><code class="inline">&lt;rx-router-outlet&gt;</code>
               renders the component whose path matches
               <code class="inline">route$</code>. Put it once in your app
               shell.</p>
            <code-block lang="ts">${escape`${OUTLET_SOURCE}`}</code-block>
        </section>

        <section class="host" id="navigation-navigate" toc-section>
            <h2>Navigating</h2>
            <p class="note">Declare <code class="inline">@Inject() router!: Router</code>
               on a field, subscribe to <code class="inline">route$</code> in
               <code class="inline">onInit</code>, call
               <code class="inline">navigate(path)</code> when you want to move.
               That's the whole API.</p>
            <code-block lang="ts">${escape`${NAVIGATE_SOURCE}`}</code-block>
        </section>

        <section class="ex" id="navigation-live" toc-section>
            <h2>Live</h2>
            <p class="note">Press a button — the path updates, the URL changes,
               and the outlet swaps the page. Watch the nav bar at the top pick
               up the active-link class, because it's subscribed to the same
               <code class="inline">route$</code>.</p>
            <div class="split">
                <code-block lang="html">${escape`${LIVE_USAGE}`}</code-block>
                <div class="live"><route-display></route-display></div>
            </div>
        </section>

        <section class="host" id="navigation-api" toc-section>
            <h2>Router API</h2>
            <code-block lang="ts">${escape`${API_SOURCE}`}</code-block>
        </section>
    `,
    styles: `
        :host { display: block; }
        ${DOC_STYLES}
        .live { display: flex; align-items: center; justify-content: center; }
        .live > * { width: 100%; }
    `,
})
export class DocsNavigation extends RxElement {}

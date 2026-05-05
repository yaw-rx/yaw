import { Component, Inject, RxElement, state } from '@yaw-rx/core';
import { Router } from '@yaw-rx/core/router';
import { TocSection } from '../../directives/toc-section.directive.js';
import { TocAnchor } from '../../directives/toc-anchor.directive.js';
import { escape } from '../../components/code-block/code-block-highlight.component.js';
import '../../components/code-block.component.js';
import { DOC_STYLES } from '../../utils/doc-styles.util.js';

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
        .label { color: var(--secondary); font-family: var(--font-mono); font-size: 0.75rem;
                 text-transform: uppercase; letter-spacing: var(--tracking); }
        .path { color: var(--accent); font-family: var(--font-mono); font-size: 1rem;
                background: var(--bg-2); padding: 0.35rem 0.7rem;
                border: var(--border-width) solid var(--bg-5); border-radius: var(--radius-sm); }
        .buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        button { background: var(--bg-3); border: var(--border-width) solid var(--border); color: var(--white);
                 padding: 0.4rem 0.8rem; font: inherit; font-family: var(--font-mono);
                 font-size: 0.8rem; cursor: pointer; border-radius: var(--radius-sm); }
        button:hover { border-color: var(--accent); color: var(--accent); }
    `,
})
export class RouteDisplay extends RxElement {
    @state route = '/';
    @Inject(Router) private readonly router!: Router;

    override onInit(): void {
        this.router.route$.subscribe((r) => { this.route = r; });
    }

    go(path: string): void {
        this.router.navigate(path);
    }
}

const ROUTE_CONFIG_SOURCE = `import { bootstrap } from '@yaw-rx/core';
import { Router, ROUTES } from '@yaw-rx/core/router';
import { AppRoot } from './app-root.js';

bootstrap({
    root: AppRoot,
    providers: [
        { provide: ROUTES, useValue: [
            { path: '/',         load: () => import('./pages/manifesto-page.js').then(m => m.ManifestoPage) },
            { path: '/examples', load: () => import('./pages/examples-page.js').then(m => m.ExamplesPage) },
            { path: '/docs',     load: () => import('./pages/docs-page.js').then(m => m.DocsPage) },
            { path: '*',         load: () => import('./pages/not-found-page.js').then(m => m.NotFoundPage) },
        ] },
        Router,
    ],
});`;

const OUTLET_SOURCE = `import { Component, RxElement } from '@yaw-rx/core';

@Component({
    selector: 'app-root',
    template: \`
        <nav-bar></nav-bar>
        <rx-router-outlet></rx-router-outlet>
    \`,
})
export class AppRoot extends RxElement {}`;

const NAVIGATE_SOURCE = `import { Component, Inject, RxElement, state } from '@yaw-rx/core';
import { Router } from '@yaw-rx/core/router';

@Component({ selector: 'route-display', ... })
export class RouteDisplay extends RxElement {
    @state route = '/';
    @Inject(Router) private readonly router!: Router;

    override onInit(): void {
        this.router.route$.subscribe((r) => { this.route = r; });
    }

    go(path: string): void { this.router.navigate(path); }
}`;

const API_SOURCE = `import { BehaviorSubject } from 'rxjs';

class Router {
    readonly route$: BehaviorSubject<string>;
    navigate(path: string): void;
    async resolve(path: string): Promise<CustomElementConstructor | undefined>;  // DOM global
}`;

const LIVE_USAGE = `<route-display></route-display>`;

@Component({
    selector: 'navigation-section',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="navigation">Navigation</h1>
        <p class="lede">Routing is one service and one element.
           <code class="inline">Router</code> owns a
           <code class="inline">route$</code> BehaviorSubject of the current path;
           <code class="inline">&lt;rx-router-outlet&gt;</code> subscribes to it
           and swaps in the component for the matching route. Everything else —
           highlighting active links, driving transitions, lazy-loading routes —
           is just reading the subject.</p>

        <section class="host" toc-section="navigation/routes">
            <h2 toc-anchor="navigation/routes">Declaring routes</h2>
            <p class="note">An array of <code class="inline">{ path, load }</code>,
               plus an optional <code class="inline">{ path: '*', load }</code>
               wildcard. Provided through the <code class="inline">ROUTES</code>
               symbol so <code class="inline">Router</code> can depend on it.</p>
            <code-block syntax="ts">${escape`${ROUTE_CONFIG_SOURCE}`}</code-block>
        </section>

        <section class="host" toc-section="navigation/outlet">
            <h2 toc-anchor="navigation/outlet">The outlet</h2>
            <p class="note"><code class="inline">&lt;rx-router-outlet&gt;</code>
               renders the component whose path matches
               <code class="inline">route$</code>. Put it once in your app
               shell.</p>
            <code-block syntax="ts">${escape`${OUTLET_SOURCE}`}</code-block>
        </section>

        <section class="host" toc-section="navigation/navigate">
            <h2 toc-anchor="navigation/navigate">Navigating</h2>
            <p class="note">Declare <code class="inline">@Inject() router!: Router</code>
               on a field, subscribe to <code class="inline">route$</code> in
               <code class="inline">onInit</code>, call
               <code class="inline">navigate(path)</code> when you want to move.
               That's the whole API.</p>
            <code-block syntax="ts">${escape`${NAVIGATE_SOURCE}`}</code-block>
        </section>

        <section class="ex" toc-section="navigation/live">
            <h2 toc-anchor="navigation/live">Live</h2>
            <p class="note">Press a button — the path updates, the URL changes,
               and the outlet swaps the page. Watch the nav bar at the top pick
               up the active-link class, because it's subscribed to the same
               <code class="inline">route$</code>.</p>
            <div class="split">
                <code-block syntax="html">${escape`${LIVE_USAGE}`}</code-block>
                <div class="live"><route-display></route-display></div>
            </div>
        </section>

        <section class="host" toc-section="navigation/api">
            <h2 toc-anchor="navigation/api">Router API</h2>
            <code-block syntax="ts">${escape`${API_SOURCE}`}</code-block>
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

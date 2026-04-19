import 'reflect-metadata';
import { Component, RxElement } from 'yaw';
import { escape } from '../../../shared/lib/code-highlight.js';
import { DOC_STYLES } from '../../../shared/lib/doc-styles.js';

const HTML_SOURCE = `<!doctype html>
<html>
    <head><meta charset="utf-8"><title>YAW</title></head>
    <body>
        <app-root></app-root>
        <script type="module" src="/src/main.ts"></script>
    </body>
</html>`;

const MAIN_SOURCE = `import 'reflect-metadata';
import { bootstrap, Router, ROUTES, DefaultGlobalDirectives } from 'yaw';
import { AppRoot } from './components/app-root.js';
import { ManifestoPage } from './components/manifesto-page.js';
import { ExamplesPage } from './components/examples-page.js';
import './components/nav-bar.js';

bootstrap({
    root: AppRoot,
    providers: [
        { provide: ROUTES, useValue: [
            { path: '/',         component: ManifestoPage },
            { path: '/examples', component: ExamplesPage },
        ] },
        Router,
    ],
    globalDirectives: DefaultGlobalDirectives,
});`;

const APP_ROOT_SOURCE = `@Component({
    selector: 'app-root',
    template: \`
        <nav-bar></nav-bar>
        <rx-router-outlet></rx-router-outlet>
    \`,
})
export class AppRoot extends RxElement {}`;

@Component({
    selector: 'docs-bootstrap',
    template: `
        <h1>Bootstrap</h1>
        <p class="lede">One call. A root component, a flat provider list, and the
           built-in global directives. <code class="inline">bootstrap()</code> creates
           the root injector, registers every imported <code class="inline">@Component</code>
           as a custom element, and upgrades <code class="inline">&lt;app-root&gt;</code>
           in the DOM. No modules, no zones.</p>

        <section class="host" id="bootstrap-html" toc-section>
            <h2>index.html</h2>
            <p class="note">The HTML entry. One root element, one module script —
               the browser does the rest.</p>
            <code-block lang="html">${escape`${HTML_SOURCE}`}</code-block>
        </section>

        <section class="host" id="bootstrap-main" toc-section>
            <h2>main.ts</h2>
            <p class="note"><code class="inline">providers</code> is a flat array —
               values, classes, or <code class="inline">{ provide, useValue }</code>
               tuples. <code class="inline">Router</code> is registered by class token;
               <code class="inline">ROUTES</code> is a symbol fed a value.
               <code class="inline">DefaultGlobalDirectives</code> is the built-in pair —
               <code class="inline">rx-if</code> and <code class="inline">rx-for</code>.</p>
            <code-block lang="ts">${escape`${MAIN_SOURCE}`}</code-block>
        </section>

        <section class="host" id="bootstrap-root" toc-section>
            <h2>The root component</h2>
            <p class="note">Usually nothing but a shell: navigation and the outlet
               the router fills. Nothing special about it — it's just the first
               component mounted.</p>
            <code-block lang="ts">${escape`${APP_ROOT_SOURCE}`}</code-block>
        </section>
    `,
    styles: `:host { display: block; }\n${DOC_STYLES}`,
})
export class DocsBootstrap extends RxElement {}

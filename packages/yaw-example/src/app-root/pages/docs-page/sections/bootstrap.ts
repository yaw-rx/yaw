import { Component, RxElement } from 'yaw';
import { TocSection } from '../directives/toc-section.js';
import { TocAnchor } from '../directives/toc-anchor.js';
import { escape } from '../../../components/code-block/code-highlight.js';
import '../../../components/code-block.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';

const HTML_SOURCE = `<!doctype html>
<html>
    <head><meta charset="utf-8"><title>YAW</title></head>
    <body>
        <script type="module" src="/src/main.ts"></script>
    </body>
</html>`;

const MAIN_SOURCE = `import { bootstrap } from 'yaw';
import { Router, ROUTES } from 'yaw/router';
import { RxIf } from 'yaw/directives/rx-if';
import { RxFor } from 'yaw/directives/rx-for';
import Decimal from 'decimal.js';
import { AppRoot } from './components/app-root.js';
import globalStyles from './main.css';

await bootstrap({
    root: AppRoot,
    // Anything statically imported here lands in the entry chunk.
    // Providers that pull in heavy dependencies can use dynamic
    // import() inside useFactory to keep them in separate chunks.
    providers: [
        { provide: ROUTES, useValue: [
            { path: '/',         load: () => import('./pages/home-page.js').then(m => m.HomePage) },
            { path: '/examples', load: () => import('./pages/examples-page.js').then(m => m.ExamplesPage) },
        ] },
        Router,
    ],
    // Everything under globals lands in the entry chunk and cannot
    // be tree-shaken or split into lazy chunks. Prefer per-component
    // registration where possible.
    globals: {
        directives: [RxIf, RxFor],
        styles: globalStyles,
        attributeCodecs: {
            Decimal: {
                encode: (v) => v.toString(),
                decode: (s) => new Decimal(s),
            },
        },
    },
});`;

const APP_ROOT_SOURCE = `import { Component, RxElement } from 'yaw';

@Component({
    selector: 'app-root',
    template: \`
        <nav-bar></nav-bar>
        <rx-router-outlet></rx-router-outlet>
    \`,
})
export class AppRoot extends RxElement {}`;

@Component({
    selector: 'docs-bootstrap',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="bootstrap">Bootstrap</h1>
        <p class="lede">One async call starts the application.
           <code class="inline">await bootstrap()</code> takes a
           configuration object and mounts your app on
           <code class="inline">document.body</code>.</p>

        <section class="host" toc-section="bootstrap/html">
            <h2 toc-anchor="bootstrap/html">index.html</h2>
            <p class="note">The HTML entry is empty — just a module script.
               <code class="inline">bootstrap()</code> creates and
               appends the root element; you don't place it by hand.</p>
            <code-block syntax="html">${escape`${HTML_SOURCE}`}</code-block>
        </section>

        <section class="host" toc-section="bootstrap/main">
            <h2 toc-anchor="bootstrap/main">main.ts</h2>
            <p class="note"><code class="inline">root</code> is the top-level
               element that gets added to the page.
               <code class="inline">providers</code> lists shared
               services — here a router and its route table.
               <code class="inline">globals.directives</code> lists
               reusable behaviours available everywhere in the app.
               <code class="inline">globals.styles</code> is CSS applied
               to the whole page.
               <code class="inline">globals.attributeCodecs</code>
               tells the runtime how to convert rich types like
               <code class="inline">Decimal</code> to and from strings.
               Each of these is covered in detail in later sections.</p>
            <code-block syntax="ts">${escape`${MAIN_SOURCE}`}</code-block>
        </section>

        <section class="host" toc-section="bootstrap/root">
            <h2 toc-anchor="bootstrap/root">The root component</h2>
            <p class="note">The root is usually a thin shell — navigation
               and a placeholder the router fills with page content.
               <code class="inline">bootstrap()</code> reads the
               selector from the decorator and appends it to
               <code class="inline">document.body</code>.</p>
            <code-block syntax="ts">${escape`${APP_ROOT_SOURCE}`}</code-block>
        </section>
    `,
    styles: `:host { display: block; }\n${DOC_STYLES}`,
})
export class DocsBootstrap extends RxElement {}

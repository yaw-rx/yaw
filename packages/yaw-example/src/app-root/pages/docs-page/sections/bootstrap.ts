import { Component, RxElement } from 'yaw';
import { TocSection } from '../directives/toc-section.js';
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
import { Decimal } from 'decimal.js';
import { AppRoot } from './components/app-root.js';

bootstrap({
    root: AppRoot,
    providers: [
        { provide: ROUTES, useValue: [
            { path: '/',         load: () => import('./pages/manifesto-page.js').then(m => m.ManifestoPage) },
            { path: '/examples', load: () => import('./pages/examples-page.js').then(m => m.ExamplesPage) },
        ] },
        Router,
    ],
    globals: {
        directives: [RxIf, RxFor],
        attributeCodecs: {
            Decimal: {
                encode: (v) => v.toString(),
                decode: (s) => new Decimal(s),
            },
        },
    },
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
    directives: [TocSection],
    template: `
        <h1 id="bootstrap" toc-section>Bootstrap</h1>
        <p class="lede">One call. A root component, a flat provider list, and the
           built-in global directives. <code class="inline">bootstrap()</code> creates
           the root injector, registers every imported <code class="inline">@Component</code>
           as a custom element, then mounts the root component on
           <code class="inline">document.body</code> itself. No modules, no zones.</p>

        <section class="host" id="bootstrap-html" toc-section>
            <h2>index.html</h2>
            <p class="note">The HTML entry is empty — just a module script.
               <code class="inline">bootstrap()</code> creates and appends the root
               element from the component's selector; you don't place it by hand.</p>
            <code-block syntax="html">${escape`${HTML_SOURCE}`}</code-block>
        </section>

        <section class="host" id="bootstrap-main" toc-section>
            <h2>main.ts</h2>
            <p class="note"><code class="inline">providers</code> is a flat array —
               values, classes, or <code class="inline">{ provide, useValue }</code>
               tuples. <code class="inline">Router</code> is registered by class token;
               <code class="inline">ROUTES</code> is a symbol fed a value.
               Global directives are listed explicitly —
               <code class="inline">RxIf</code> and <code class="inline">RxFor</code>
               from <code class="inline">yaw/directives/*</code>.
               <code class="inline">globals.attributeCodecs</code> teaches
               <code class="inline">readAttributes()</code> how to deserialise
               non-primitive types from HTML attribute strings.</p>
            <code-block syntax="ts">${escape`${MAIN_SOURCE}`}</code-block>
        </section>

        <section class="host" id="bootstrap-root" toc-section>
            <h2>The root component</h2>
            <p class="note">An ordinary <code class="inline">@Component</code> — no
               flag, no magic. <code class="inline">bootstrap()</code> reads its selector,
               does <code class="inline">document.body.appendChild(document.createElement(selector))</code>,
               and the custom-element upgrade path takes over. Usually nothing but a
               shell: navigation and the outlet the router fills.</p>
            <code-block syntax="ts">${escape`${APP_ROOT_SOURCE}`}</code-block>
        </section>
    `,
    styles: `:host { display: block; }\n${DOC_STYLES}`,
})
export class DocsBootstrap extends RxElement {}

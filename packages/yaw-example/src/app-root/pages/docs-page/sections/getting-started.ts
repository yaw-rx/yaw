import { Component, RxElement } from 'yaw';
import { escape } from '../../../components/code-block/code-highlight.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';

const INSTALL_SOURCE = `npm install yaw rxjs
npm install yaw-transformer yaw-ts-plugin ts-patch --save-dev`;

const PACKAGE_JSON_SOURCE = `{
    "name": "my-app",
    "type": "module",
    "scripts": {
        "prepare": "ts-patch install",
        "dev": "vite",
        "build": "vite build"
    },
    "dependencies": {
        "rxjs": "^7.8.1",
        "yaw": "*"
    },
    "devDependencies": {
        "ts-patch": "^3.3.0",
        "vite": "^5.0.0",
        "yaw-transformer": "*",
        "yaw-ts-plugin": "*"
    }
}`;

const TSCONFIG_SOURCE = `{
    "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "lib": ["ES2022", "DOM"],
        "experimentalDecorators": true,
        "useDefineForClassFields": false,
        "plugins": [
            { "name": "yaw-ts-plugin" },
            { "transform": "yaw-transformer", "type": "program" }
        ]
    }
}`;

@Component({
    selector: 'docs-getting-started',
    template: `
        <h1 id="getting-started" toc-section>Getting started</h1>
        <p class="lede">Install the runtime, the compiler plugin, and the
           IDE plugin. The <code class="inline">prepare</code> script
           patches <code class="inline">tsc</code> so the transformer
           runs before type-checking — the
           <code class="inline">$</code> getters and
           <code class="inline">__stateTypes</code> metadata are
           available at compile time.</p>

        <section class="host" id="getting-started-install" toc-section>
            <h2>Install</h2>
            <code-block syntax="bash">${escape`${INSTALL_SOURCE}`}</code-block>
        </section>

        <section class="host" id="getting-started-package-json" toc-section>
            <h2>package.json</h2>
            <p class="note">The <code class="inline">prepare</code> script
               runs <code class="inline">ts-patch install</code> after
               every <code class="inline">npm install</code> — it patches
               the local <code class="inline">tsc</code> binary so the
               transformer plugin in
               <code class="inline">tsconfig.json</code> is picked up
               during compilation.</p>
            <code-block syntax="json">${escape`${PACKAGE_JSON_SOURCE}`}</code-block>
        </section>

        <section class="host" id="getting-started-tsconfig" toc-section>
            <h2>tsconfig.json</h2>
            <p class="note">Two plugins.
               <code class="inline">yaw-ts-plugin</code> gives the IDE
               full type information for reactive state.
               <code class="inline">yaw-transformer</code> runs at
               build time via <code class="inline">ts-patch</code> and
               emits the metadata the runtime needs.
               <code class="inline">useDefineForClassFields: false</code>
               is required for decorators to work correctly.</p>
            <code-block syntax="json">${escape`${TSCONFIG_SOURCE}`}</code-block>
        </section>
    `,
    styles: `:host { display: block; }\n${DOC_STYLES}`,
})
export class DocsGettingStarted extends RxElement {}

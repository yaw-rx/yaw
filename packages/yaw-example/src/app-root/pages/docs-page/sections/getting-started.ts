import { Component, RxElement } from 'yaw';
import { TocSection } from '../directives/toc-section.js';
import { TocAnchor } from '../directives/toc-anchor.js';
import { escape } from '../../../components/code-block/code-highlight.js';
import '../../../components/code-block.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';

const INSTALL_SOURCE = `npm install yaw rxjs
npm install yaw-transformer yaw-ts-plugin ts-patch --save-dev`;

const PACKAGE_JSON_SOURCE = `{
    "name": "my-app",
    "type": "module",
    "scripts": {
        "prepare": "ts-patch install",
        "typecheck": "tsc --build"
    },
    "dependencies": {
        "rxjs": "^7.8.1",
        "yaw": "*"
    },
    "devDependencies": {
        "ts-patch": "^3.3.0",
        "yaw-transformer": "*",
        "yaw-ts-plugin": "*"
    }
}`;

const TSCONFIG_SOURCE = `{
    "compilerOptions": {
        "target": "ES2022",
        "module": "ES2022",
        "moduleResolution": "bundler",
        "lib": ["ES2022", "DOM"],
        "experimentalDecorators": true,
        "useDefineForClassFields": false,
        "plugins": [
            { "name": "yaw-ts-plugin" },
            { "transform": "yaw-transformer", "import": "programTransformer", "transformProgram": true }
        ]
    }
}`;

const VITE_INSTALL = `npm install vite --save-dev`;

const VITE_CONFIG_SOURCE = `import { defineConfig } from 'vite';
import { vitePlugin } from 'yaw-transformer';

export default defineConfig({
    plugins: [vitePlugin()],
    server: { port: 3000 },
    build: { outDir: 'dist', target: 'es2022' },
});`;

const ROLLUP_INSTALL = `npm install rollup rollup-plugin-esbuild @rollup/plugin-node-resolve @rollup/plugin-commonjs --save-dev`;

const ROLLUP_CONFIG_SOURCE = `import { rollupPlugin } from 'yaw-transformer';
import esbuild from 'rollup-plugin-esbuild';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'src/main.ts',
    output: { dir: 'dist', format: 'es' },
    plugins: [
        rollupPlugin(),
        resolve(),
        commonjs(),
        esbuild({ target: 'es2022' }),
    ],
};`;

const ESBUILD_INSTALL = `npm install esbuild --save-dev`;

const ESBUILD_CONFIG_SOURCE = `import { esbuildPlugin } from 'yaw-transformer';
import { build } from 'esbuild';

await build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    outdir: 'dist',
    format: 'esm',
    target: 'es2022',
    plugins: [esbuildPlugin()],
});`;

const WEBPACK_INSTALL = `npm install webpack webpack-cli esbuild-loader html-webpack-plugin --save-dev`;

const WEBPACK_CONFIG_SOURCE = `import path from 'node:path';
import { fileURLToPath } from 'node:url';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    mode: 'production',
    entry: './src/main.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.js',
    },
    resolve: {
        extensions: ['.ts', '.js'],
        extensionAlias: { '.js': ['.ts', '.js'] },
    },
    module: {
        rules: [{
            test: /\\.ts$/,
            exclude: /node_modules/,
            use: [
                { loader: 'esbuild-loader', options: { target: 'es2022' } },
                { loader: 'yaw-transformer/webpackLoader' },
            ],
        }],
    },
    plugins: [new HtmlWebpackPlugin({ template: './index.html' })],
};`;

@Component({
    selector: 'docs-getting-started',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="getting-started">Getting started</h1>
        <p class="lede">Install the runtime, the compiler plugin, and the
           IDE plugin. The <code class="inline">prepare</code> script
           patches <code class="inline">tsc</code> so the transformer
           runs before type-checking — the
           <code class="inline">$</code> getters and
           <code class="inline">__stateTypes</code> metadata are
           available at compile time.</p>

        <section class="host" toc-section="getting-started/install">
            <h2 toc-anchor="getting-started/install">Install</h2>
            <code-block syntax="bash">${escape`${INSTALL_SOURCE}`}</code-block>
        </section>

        <section class="host" toc-section="getting-started/package-json">
            <h2 toc-anchor="getting-started/package-json">package.json</h2>
            <p class="note">The <code class="inline">prepare</code> script
               runs <code class="inline">ts-patch install</code> after
               every <code class="inline">npm install</code> — it patches
               the local <code class="inline">tsc</code> binary so the
               transformer plugin in
               <code class="inline">tsconfig.json</code> is picked up
               during compilation. Add your bundler's dev and build
               scripts alongside these.</p>
            <code-block syntax="json">${escape`${PACKAGE_JSON_SOURCE}`}</code-block>
        </section>

        <section class="host" toc-section="getting-started/tsconfig">
            <h2 toc-anchor="getting-started/tsconfig">tsconfig.json</h2>
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

        <section class="host" toc-section="getting-started/bundler-config">
            <h2 toc-anchor="getting-started/bundler-config">Bundler config</h2>
            <p class="note">Each bundler has a plugin or loader that runs
               the yaw transform at bundle time. Pick one and drop the
               config file in your project root.</p>

            <details>
                <summary>
                    <h3>Vite</h3>
                    <p class="note">Single plugin. Vite's dev server
                       transforms each module as it's served.</p>
                </summary>
                <code-block syntax="bash">${escape`${VITE_INSTALL}`}</code-block>
                <p class="note">Scripts:
                   <code class="inline">"dev": "vite"</code>,
                   <code class="inline">"build": "vite build"</code></p>
                <code-block syntax="ts">${escape`${VITE_CONFIG_SOURCE}`}</code-block>
            </details>

            <details>
                <summary>
                    <h3>Rollup</h3>
                    <p class="note">The Rollup plugin runs the transform
                       during the build phase.
                       <code class="inline">rollup-plugin-esbuild</code>
                       handles TypeScript transpilation.</p>
                </summary>
                <code-block syntax="bash">${escape`${ROLLUP_INSTALL}`}</code-block>
                <p class="note">Script:
                   <code class="inline">"build": "rollup -c rollup.config.js"</code></p>
                <code-block syntax="js">${escape`${ROLLUP_CONFIG_SOURCE}`}</code-block>
            </details>

            <details>
                <summary>
                    <h3>esbuild</h3>
                    <p class="note">An esbuild plugin that transforms each
                       <code class="inline">.ts</code> file through the
                       yaw compiler before bundling.</p>
                </summary>
                <code-block syntax="bash">${escape`${ESBUILD_INSTALL}`}</code-block>
                <p class="note">Script:
                   <code class="inline">"build": "node esbuild.config.js"</code></p>
                <code-block syntax="js">${escape`${ESBUILD_CONFIG_SOURCE}`}</code-block>
            </details>

            <details>
                <summary>
                    <h3>Webpack</h3>
                    <p class="note">A webpack loader that runs before
                       <code class="inline">esbuild-loader</code> in the
                       chain. Loader order is bottom-up, so
                       <code class="inline">yaw-transformer/webpackLoader</code>
                       runs first.</p>
                </summary>
                <code-block syntax="bash">${escape`${WEBPACK_INSTALL}`}</code-block>
                <p class="note">Script:
                   <code class="inline">"build": "webpack --config webpack.config.js"</code></p>
                <code-block syntax="js">${escape`${WEBPACK_CONFIG_SOURCE}`}</code-block>
            </details>
        </section>
    `,
    styles: `
        :host { display: block; }
        ${DOC_STYLES}
        details { margin-bottom: 0.75rem; border: 1px solid #1a1a1a;
                  border-radius: 6px; overflow: hidden; }
        summary { cursor: pointer; padding: 0.75rem 1rem;
                  background: #0a0a0a; list-style: none; }
        summary::-webkit-details-marker { display: none; }
        summary::marker { display: none; }
        summary h3 { color: #fff; font-size: 0.95rem; font-weight: 600;
                     margin: 0 0 0.25rem; }
        summary .note { margin: 0; }
        details[open] > summary { border-bottom: 1px solid #1a1a1a; }
        details > code-block { margin: 0.75rem 1rem; }
        details > .note { margin: 0.75rem 1rem; }
    `,
})
export class DocsGettingStarted extends RxElement {}

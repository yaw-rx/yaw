import { Component, RxElement } from '@yaw-rx/core';
import { TocSection } from '../directives/toc-section.js';
import { TocAnchor } from '../directives/toc-anchor.js';
import { escape } from '../../../components/code-block/code-highlight.js';
import '../../../components/code-block.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';

const INSTALL_SOURCE = `npm install yaw rxjs
npm install @yaw-rx/transformer @yaw-rx/ts-plugin @yaw-rx/ssg ts-patch --save-dev
# bundler integration — pick one:
npm install @yaw-rx/vite --save-dev
# npm install @yaw-rx/rollup --save-dev
# npm install @yaw-rx/esbuild --save-dev
# npm install @yaw-rx/webpack --save-dev`;

const PACKAGE_JSON_SOURCE = `{
    "name": "my-app",
    "type": "module",
    "scripts": {
        "prepare": "ts-patch install",
        "typecheck": "tsc --build",
        "lint": "eslint src/",
        "lint:fix": "eslint src/ --fix",
        "format": "prettier --check src/",
        "format:fix": "prettier --write src/"
    },
    "dependencies": {
        "rxjs": "^7.8.1",
        "yaw": "*"
    },
    "devDependencies": {
        "ts-patch": "^3.3.0",
        "@yaw-rx/transformer": "*",
        "@yaw-rx/ts-plugin": "*",
        "@yaw-rx/ssg": "*",
        "@eslint/js": "^9.39.0",
        "eslint": "^9.39.0",
        "typescript-eslint": "^8.59.0",
        "prettier": "^3.8.0"
    }
}`;

const TSCONFIG_SOURCE = `{
    "compilerOptions": {
        "target": "ES2022",
        "module": "ES2022",
        "moduleResolution": "bundler",
        "lib": ["ES2022", "DOM"],
        "plugins": [
            { "name": "@yaw-rx/ts-plugin" },
            { "transform": "@yaw-rx/transformer", "import": "programTransformer", "transformProgram": true }
        ]
    }
}`;

const ESLINT_CONFIG_SOURCE = `import tseslint from 'typescript-eslint';
import eslint from '@eslint/js';

export default tseslint.config(
    { ignores: ['**/dist/**', 'node_modules/**', '*.config.js', '*.config.ts'] },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                projectService: {
                    loadTypeScriptPlugins: true,
                },
                tsconfigRootDir: import.meta.dirname,
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        },
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/switch-exhaustiveness-check': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'error',
            '@typescript-eslint/consistent-type-exports': 'error',
            '@typescript-eslint/only-throw-error': 'error',
            'eqeqeq': ['error', 'always'],
            'no-var': 'error',
            'prefer-const': 'error',
        },
    },
    { files: ['**/*.js', '**/*.mjs'], ...tseslint.configs.disableTypeChecked },
);`;

const PRETTIER_CONFIG_SOURCE = `{
    "tabWidth": 4,
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "arrowParens": "always",
    "endOfLine": "lf"
}`;

const VITE_INSTALL = `npm install vite @yaw-rx/vite --save-dev`;

const VITE_CONFIG_SOURCE = `import { defineConfig } from 'vite';
import { viteTransform, viteAssets } from '@yaw-rx/vite';

export default defineConfig({
    plugins: [viteAssets(['.css', '.html', '.wgsl']), viteTransform()],
    esbuild: { target: 'es2022' },
    resolve: { dedupe: ['rxjs'] },
    server: { port: 3000 },
    build: { outDir: 'dist', target: 'es2022' },
});`;

const ROLLUP_INSTALL = `npm install rollup @yaw-rx/rollup rollup-plugin-esbuild @rollup/plugin-node-resolve @rollup/plugin-commonjs --save-dev`;

const ROLLUP_CONFIG_SOURCE = `import { rollupTransform, rollupAssets } from '@yaw-rx/rollup';
import esbuild from 'rollup-plugin-esbuild';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'src/main.ts',
    output: { dir: 'dist', format: 'es' },
    plugins: [
        rollupAssets(['.css', '.html', '.wgsl']),
        rollupTransform(),
        resolve({ dedupe: ['rxjs'] }),
        commonjs(),
        esbuild({ target: 'es2022', minify: true }),
    ],
};`;

const ESBUILD_INSTALL = `npm install esbuild @yaw-rx/esbuild --save-dev`;

const ESBUILD_CONFIG_SOURCE = `import { esbuildTransform, esbuildAssets } from '@yaw-rx/esbuild';
import { build } from 'esbuild';

await build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    outdir: 'dist',
    format: 'esm',
    splitting: true,
    minify: true,
    target: 'es2022',
    plugins: [esbuildAssets(['.css', '.html', '.wgsl']), esbuildTransform()],
});`;

const WEBPACK_INSTALL = `npm install webpack webpack-cli @yaw-rx/webpack esbuild-loader html-webpack-plugin --save-dev`;

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
        rules: [
            {
                test: /\\.(css|html|wgsl)$/,
                include: path.resolve(__dirname, 'src'),
                type: 'asset/source',
            },
            {
                test: /\\.ts$/,
                exclude: /node_modules/,
                use: [
                    { loader: 'esbuild-loader', options: { target: 'es2022' } },
                    { loader: '@yaw-rx/webpack/loader' },
                ],
            },
        ],
    },
    plugins: [new HtmlWebpackPlugin({ template: './index.html' })],
};`;

@Component({
    selector: 'docs-getting-started',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="getting-started">Getting started</h1>
        <p class="lede">Install the runtime, the compiler plugin, a
           bundler integration, and the IDE plugin.</p>

        <section class="host" toc-section="getting-started/install">
            <h2 toc-anchor="getting-started/install">Install</h2>
            <code-block syntax="bash">${escape`${INSTALL_SOURCE}`}</code-block>
        </section>

        <section class="host" toc-section="getting-started/package-json">
            <h2 toc-anchor="getting-started/package-json">package.json</h2>
            <p class="note">The <code class="inline">prepare</code> script
               runs <code class="inline">ts-patch install</code> after
               every <code class="inline">npm install</code> — it patches
               the local <code class="inline">tsc</code> binary so our
               transformer plugin in
               <code class="inline">tsconfig.json</code> is picked up
               during compilation. Add your bundler's dev and build
               scripts alongside these.</p>
            <code-block syntax="json">${escape`${PACKAGE_JSON_SOURCE}`}</code-block>
        </section>

        <section class="host" toc-section="getting-started/tsconfig">
            <h2 toc-anchor="getting-started/tsconfig">tsconfig.json</h2>
            <p class="note">Two plugins.
               <code class="inline">@yaw-rx/ts-plugin</code> gives the IDE
               full type information for reactive state.
               <code class="inline">@yaw-rx/transformer</code> runs at
               build time via <code class="inline">ts-patch</code> and
               emits metadata the runtime needs.</p>
            <code-block syntax="json">${escape`${TSCONFIG_SOURCE}`}</code-block>
        </section>

        <section class="host" toc-section="getting-started/bundler-config">
            <h2 toc-anchor="getting-started/bundler-config">Bundler config</h2>
            <p class="note">Each bundler has a dedicated package with a
               transform plugin and a raw-asset plugin. The transform
               runs the yaw compiler at bundle time; the asset plugin
               lets you import <code class="inline">.css</code>,
               <code class="inline">.html</code>, and other text files
               as strings. Pick a bundler and drop the config in your
               project root.</p>

            <details>
                <summary>
                    <h3>Vite</h3>
                    <p class="note">Vite's dev server transforms each
                       module as it's served. <code class="inline">dedupe</code>
                       prevents duplicate rxjs copies across chunks.</p>
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
                    <p class="note"><code class="inline">rollup-plugin-esbuild</code>
                       handles TypeScript transpilation and minification.
                       <code class="inline">dedupe</code> on the resolve
                       plugin prevents rxjs duplication across chunks.</p>
                </summary>
                <code-block syntax="bash">${escape`${ROLLUP_INSTALL}`}</code-block>
                <p class="note">Script:
                   <code class="inline">"build": "rollup -c rollup.config.js"</code></p>
                <code-block syntax="js">${escape`${ROLLUP_CONFIG_SOURCE}`}</code-block>
            </details>

            <details>
                <summary>
                    <h3>esbuild</h3>
                    <p class="note"><code class="inline">splitting</code>
                       enables code splitting so dynamic
                       <code class="inline">import()</code> calls produce
                       separate chunks.</p>
                </summary>
                <code-block syntax="bash">${escape`${ESBUILD_INSTALL}`}</code-block>
                <p class="note">Script:
                   <code class="inline">"build": "node esbuild.config.js"</code></p>
                <code-block syntax="js">${escape`${ESBUILD_CONFIG_SOURCE}`}</code-block>
            </details>

            <details>
                <summary>
                    <h3>Webpack</h3>
                    <p class="note">Loader order is bottom-up —
                       <code class="inline">@yaw-rx/webpack/loader</code>
                       runs first, then
                       <code class="inline">esbuild-loader</code>
                       transpiles. Webpack's native
                       <code class="inline">asset/source</code> rule
                       handles raw imports.</p>
                </summary>
                <code-block syntax="bash">${escape`${WEBPACK_INSTALL}`}</code-block>
                <p class="note">Script:
                   <code class="inline">"build": "webpack --config webpack.config.js"</code></p>
                <code-block syntax="js">${escape`${WEBPACK_CONFIG_SOURCE}`}</code-block>
            </details>
        </section>

        <section class="host" toc-section="getting-started/linting">
            <h2 toc-anchor="getting-started/linting">Linting</h2>
            <p class="note">The compiler plugins in your tsconfig
               generate types that eslint needs to see.
               <code class="inline">projectService</code> delegates to
               the patched compiler instead of creating a bare program,
               and <code class="inline">loadTypeScriptPlugins</code>
               tells it to load the tsconfig plugins. Without both,
               eslint will report false positives.</p>
            <code-block syntax="js">${escape`${ESLINT_CONFIG_SOURCE}`}</code-block>
        </section>

        <section class="host" toc-section="getting-started/formatting">
            <h2 toc-anchor="getting-started/formatting">Formatting</h2>
            <p class="note">A <code class="inline">.prettierrc.json</code>
               in the project root. Four-space indent, single quotes,
               trailing commas — adjust to taste.</p>
            <code-block syntax="json">${escape`${PRETTIER_CONFIG_SOURCE}`}</code-block>
        </section>
    `,
    styles: `
        :host { display: block; }
        ${DOC_STYLES}
        details { margin-bottom: 0.75rem; border: 1px solid #1a1a1a;
                  border-radius: 6px; overflow: hidden; }
        summary { cursor: pointer; padding: 0.75rem 1rem;
                  background: #0a0a0a; list-style: none;
                  transition: background 0.15s; }
        summary:hover { background: #151515; }
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

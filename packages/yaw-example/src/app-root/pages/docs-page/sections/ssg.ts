import { Component, RxElement } from 'yaw';
import { TocSection } from '../directives/toc-section.js';
import { TocAnchor } from '../directives/toc-anchor.js';
import { escape } from '../../../components/code-block/code-highlight.js';
import '../../../components/code-block.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';

@Component({
    selector: 'docs-ssg',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="ssg">Static Site Generation</h1>
        <p class="lede">Build your app with Vite (or any bundler), then
           run <code class="inline">yaw-ssg</code> on the output. It
           launches a headless browser, visits every route, captures the
           fully rendered DOM, and writes static HTML files. On load,
           the framework hydrates from the captured state — no flash,
           no re-render.</p>

        <section class="host" toc-section="ssg/cli">
            <h2 toc-anchor="ssg/cli">The CLI</h2>
            <p class="note">Install it as a dev dependency.</p>
            <code-block syntax="bash">${escape`npm install yaw-ssg --save-dev`}</code-block>
            <p class="note">It takes two arguments: the directory your
               bundler wrote to, and the directory to write the static
               output to.</p>
            <code-block syntax="bash">${escape`yaw-ssg <dist-dir> <out-dir>`}</code-block>
            <p class="note">A typical workflow: build, then capture.</p>
            <code-block syntax="bash">${escape`npm run build
npm run build:ssg`}</code-block>
            <p class="note">Where <code class="inline">build:ssg</code> is
               defined in your <code class="inline">package.json</code>:</p>
            <code-block syntax="json">${escape`{
    "scripts": {
        "build": "vite build",
        "build:ssg": "yaw-ssg dist public"
    }
}`}</code-block>
        </section>

        <section class="host" toc-section="ssg/browser">
            <h2 toc-anchor="ssg/browser">Browser resolution</h2>
            <p class="note">On your local machine,
               <code class="inline">yaw-ssg</code> finds and uses
               whatever Chromium-based browser you already have
               installed — Chrome, Brave, Edge, Chromium, Vivaldi,
               Arc. Nothing to install, nothing to configure.</p>
            <p class="note">In server environments — Docker, CI,
               Lambda — there is no browser. Install
               <code class="inline">@sparticuz/chromium</code> and
               <code class="inline">yaw-ssg</code> picks it up
               automatically. It ships a stripped-down Chromium
               binary built for headless environments.</p>
            <code-block syntax="bash">${escape`npm install @sparticuz/chromium --save-dev`}</code-block>
        </section>

        <section class="host" toc-section="ssg/docker">
            <h2 toc-anchor="ssg/docker">Docker</h2>
            <p class="note">A multi-stage Dockerfile that builds the app,
               captures static HTML with
               <code class="inline">@sparticuz/chromium</code>, and
               serves the output from nginx.</p>
            <code-block syntax="dockerfile">${escape`FROM node:24-slim AS ssg-base

RUN apt-get update \\
 && apt-get install -y --no-install-recommends \\
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \\
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \\
    libgbm1 libasound2 libpango-1.0-0 libcairo2 libxshmfence1 \\
 && rm -rf /var/lib/apt/lists/*

FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# SSG capture
FROM ssg-base AS ssg

WORKDIR /app
COPY --from=build /app /app
RUN npm install @sparticuz/chromium
RUN npm run build:ssg

FROM nginx:alpine
COPY --from=ssg /app/public /usr/share/nginx/html
EXPOSE 80`}</code-block>
            <p class="note">The <code class="inline">ssg-base</code> stage
               installs the native libraries that Chromium needs to run.
               Alpine doesn't have them, so the capture stage uses
               <code class="inline">node:24-slim</code> (Debian). The
               final image is just nginx serving static files.</p>
        </section>

        <section class="host" toc-section="ssg/hydration">
            <h2 toc-anchor="ssg/hydration">Hydration</h2>
            <p class="note">During capture, the CLI serializes every
               component's <code class="inline">@state</code> and every
               service's observable state into a JSON blob embedded in
               the HTML. On load, the framework reads the blob, restores
               state into each component and service, and wires up
               bindings — the DOM is already correct so nothing visually
               changes. The user sees the static page instantly and
               interactivity kicks in once the JS loads.</p>
        </section>

        <section class="host" toc-section="ssg/routes">
            <h2 toc-anchor="ssg/routes">Route discovery</h2>
            <p class="note">The CLI loads the root page and reads the
               route table from the framework's router. Every registered
               route is captured as its own
               <code class="inline">index.html</code>. No configuration
               needed — if you registered a route, it gets captured.</p>
        </section>
    `,
    styles: `
        :host { display: block; }
        ${DOC_STYLES}
    `,
})
export class DocsSsg extends RxElement {}

import { Component } from '@yaw-rx/core';
import { DocSection } from '../../components/doc-section.component.js';
import screenshot from './assets/ystate-studio.webp';

@Component({
    selector: 'ystate-studio-section',
    template: `
        <h1>YState Studio</h1>
        <p class="lede">Every system that does more than one thing has logic hiding inside
           it: rules about what can happen, in what order, and what's forbidden. Most of
           the time that logic never becomes a picture. It lives scattered across
           conditionals, tribal knowledge, and a diagram from a meeting six months ago that
           nobody's touched since.</p>
        <p class="lede">A state machine turns that logic into one object: a finite set of
           states and the exact rules for moving between them. YState Studio makes that
           object visible and keeps it live — the diagram isn't a record of the logic, it
           <em>is</em> the logic. And because the studio holds the complete topology, not
           just whichever corner you're currently editing, it can reason about the whole
           graph at once: a state nothing can reach, a transition nobody handles, a branch
           that dead-ends. Those stop being bugs you find in production and become shapes
           you see on screen while you're still writing.</p>
        <p class="lede">Run a machine and that same graph stops being a diagram and becomes
           an interactive demo: the current state lit up, every transition traced live as
           events fire. That's useful as the canonical example on a lecture slide, as the
           thing a manager can watch animate through exactly what their team shipped, or as
           the object an engineer steps through — topology errors and all — before any of
           it reaches production.</p>

        <p class="note credits"><strong>Built on</strong> <code class="inline">@yaw-rx/ystate</code>
            <a class="icon-link" href="https://github.com/yaw-rx/ystate" target="_blank" rel="noopener noreferrer">
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.93.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.03a9.4 9.4 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.94.36.31.68.92.68 1.85v2.75c0 .26.18.58.69.48A10 10 0 0 0 12 2Z"/>
                </svg>
                <span>GitHub</span>
            </a>
            <a class="icon-link" href="https://www.npmjs.com/package/@yaw-rx/ystate" target="_blank" rel="noopener noreferrer">
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="1" y="6" width="22" height="12" rx="2"/>
                    <text x="12" y="15" text-anchor="middle" font-size="7" font-weight="700" fill="var(--bg-1)">npm</text>
                </svg>
                <span>npm</span>
            </a>
        </p>

        <section class="ex">
            <h2><a href="https://ystate.github.io/" target="_blank" rel="noopener noreferrer">Open the studio</a></h2>
            <p class="note"><a href="https://ystate.github.io/" target="_blank" rel="noopener noreferrer">ystate.github.io</a>
               is the studio itself, running entirely in your browser. Design a state machine
               there, then build a form on top of it — interactive widgets wired straight to
               its underlying RxJS observables — and it stops being a diagram and becomes a
               working, interactive demo. Export the whole thing as a library with the
               download button, send someone the <code class="inline">library.json</code>,
               and they can drag it straight onto the same site to open it and pick up where
               you left off — no account required.</p>
            <div class="live"><img class="shot" src="${screenshot}" alt="YState Studio showing a live state machine graph" /></div>
        </section>
    `,
    styles: `
        :host { display: block; }
        .lede { max-width: 86ch; }
        .ex { margin-top: 2rem; }
        .shot { display: block; width: 100%; height: auto; border-radius: var(--radius-lg); }
        .credits { display: flex; align-items: center; gap: 1rem; margin-top: 0.75rem; margin-bottom: 0; }
        .icon-link { display: inline-flex; align-items: center; gap: 0.35rem; color: var(--secondary); }
        .icon-link:hover { color: var(--accent); }
        .icon-link .icon { width: 1.1em; height: 1.1em; fill: currentColor; }
    `,
})
export class YState extends DocSection {}

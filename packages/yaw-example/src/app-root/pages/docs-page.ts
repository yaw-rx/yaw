import { Component, RxElement } from '@yaw-rx/core';
import { TocSection } from './docs-page/directives/toc-section.js';
import { TocAnchor } from './docs-page/directives/toc-anchor.js';
import { SidebarDrawer } from '../directives/sidebar-drawer.js';
import { TocService } from './docs-page/services/toc-service.js';
import './docs-page/sidebar.js';
import './docs-page/sections/core-concepts.js';
import './docs-page/sections/getting-started.js';
import './docs-page/sections/bootstrap.js';
import './docs-page/sections/components.js';
import './docs-page/sections/directives.js';
import './docs-page/sections/services.js';
import './docs-page/sections/navigation.js';
import './docs-page/sections/ssg.js';

@Component({
    selector: 'docs-page',
    providers: [TocService],
    directives: [TocSection, TocAnchor, SidebarDrawer],
    template: `
        <docs-sidebar sidebar-drawer></docs-sidebar>
        <main class="content">
            <header class="intro" toc-section="docs">
                <h1 toc-anchor="docs">Docs</h1>
                <p class="lede">The whole framework on one page. Bootstrap, components,
                   directives, services, navigation — each section is the full story
                   of that primitive, with the real source right next to a live example
                   where it makes sense.</p>
            </header>

            <docs-core-concepts toc-section="core-concepts"></docs-core-concepts>
            <docs-getting-started toc-section="getting-started"></docs-getting-started>
            <docs-bootstrap toc-section="bootstrap"></docs-bootstrap>
            <docs-components toc-section="components"></docs-components>
            <docs-directives toc-section="directives"></docs-directives>
            <docs-services toc-section="services"></docs-services>
            <docs-navigation toc-section="navigation"></docs-navigation>
            <docs-ssg toc-section="ssg"></docs-ssg>

        </main>
    `,
    styles: `
        :host { display: flex; background: var(--black); min-height: 100vh;
                color: var(--text); box-sizing: border-box; }
        .content { flex: 1 1 0; min-width: 0; box-sizing: border-box;
                   padding: 6rem 1.25rem 4rem 1.25rem; }
        .content > [id] { scroll-margin-top: 5rem; display: block; }
        [toc-section] { margin-left: calc(var(--toc-depth, 0) * 0.6rem); }
        h1[toc-section] { margin-left: 0; }
        [toc-section][style*="--toc-depth"]::before {
            content: '';
            display: block;
            border-top: calc(min(var(--toc-depth, 0), 1) * 1px) solid var(--white);
            margin-bottom: calc(min(var(--toc-depth, 0), 1) * 1.5rem);
        }
        [toc-section] + [toc-section]::before {
            border-top: none;
            margin-bottom: 0;
        }
        .intro { margin-bottom: 2.5rem; }
        h1 { color: var(--white); font-size: 2.5rem; font-weight: 900;
             letter-spacing: -1px; margin: 0 0 1rem; }
        .lede { color: var(--secondary); line-height: 1.7; max-width: 72ch; margin: 0; }
        @media (max-width: 640px) {
            [toc-section] { margin-left: calc(var(--toc-depth, 0) * 0.5rem); }
        }
        @media (max-width: 500px) {
            [toc-section] { margin-left: calc(var(--toc-depth, 0) * 0.4rem); }
        }
    `,
})
export class DocsPage extends RxElement {}

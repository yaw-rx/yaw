import { Component, RxElement } from '@yaw-rx/core';
import { TocSection } from '../directives/toc-section.directive.js';
import { TocAnchor } from '../directives/toc-anchor.directive.js';
import { TocMenuCollapse } from '../directives/toc-menu-collapse.directive.js';
import { TocMenuItemsService } from '../services/toc-menu-items.service.js';
import '../components/toc-menu.component.js';
import './docs-page/core-concepts-section.component.js';
import './docs-page/getting-started-section.component.js';
import './docs-page/bootstrap-section.component.js';
import './docs-page/components-section.component.js';
import './docs-page/directives-section.component.js';
import './docs-page/services-section.component.js';
import './docs-page/navigation-section.component.js';
import './docs-page/ssg-section.component.js';

@Component({
    selector: 'docs-page',
    providers: [TocMenuItemsService],
    directives: [TocSection, TocAnchor, TocMenuCollapse],
    template: `
        <toc-menu toc-menu-collapse></toc-menu>
        <main class="content">
            <header class="intro" toc-section="docs">
                <h1 toc-anchor="docs">Docs</h1>
                <p class="lede">The whole framework on one page. Bootstrap, components,
                   directives, services, navigation — each section is the full story
                   of that primitive, with the real source right next to a live example
                   where it makes sense.</p>
            </header>

            <core-concepts-section toc-section="core-concepts"></core-concepts-section>
            <getting-started-section toc-section="getting-started"></getting-started-section>
            <bootstrap-section toc-section="bootstrap"></bootstrap-section>
            <components-section toc-section="components"></components-section>
            <directives-section toc-section="directives"></directives-section>
            <services-section toc-section="services"></services-section>
            <navigation-section toc-section="navigation"></navigation-section>
            <ssg-section toc-section="ssg"></ssg-section>

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

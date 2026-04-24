import { Component, RxElement } from 'yaw';
import { TocService } from './docs-page/services/toc-service.js';

@Component({
    selector: 'docs-page',
    providers: [TocService],
    template: `
        <docs-sidebar></docs-sidebar>
        <main class="content">
            <header class="intro" id="docs" toc-section>
                <h1>Docs</h1>
                <p class="lede">The whole framework on one page. Bootstrap, components,
                   directives, services, navigation — each section is the full story
                   of that primitive, with the real source right next to a live example
                   where it makes sense.</p>
            </header>

            <docs-bootstrap id="bootstrap" toc-section></docs-bootstrap>
            <docs-components id="components" toc-section></docs-components>
            <docs-reactive-state id="reactive-state" toc-section></docs-reactive-state>
            <docs-directives id="directives" toc-section></docs-directives>
            <docs-services id="services" toc-section></docs-services>
            <docs-navigation id="navigation" toc-section></docs-navigation>
        </main>
    `,
    styles: `
        :host { display: flex; background: #000; min-height: calc(100vh / 1.75);
                color: #ccc; box-sizing: border-box; }
        .content { flex: 1 1 0; min-width: 0; box-sizing: border-box;
                   padding: 6rem 2rem 4rem 2rem; }
        .content > [id] { scroll-margin-top: 5rem; display: block; }
        [toc-section] { margin-left: calc(var(--toc-depth, 0) * 1.5rem); }
        h1[toc-section] { margin-left: 0; }
        [toc-section][style*="--toc-depth"]::before {
            content: '';
            display: block;
            border-top: calc(min(var(--toc-depth, 0), 1) * 1px) solid #fff;
            margin-bottom: calc(min(var(--toc-depth, 0), 1) * 1.5rem);
        }
        [toc-section] + [toc-section]::before {
            border-top: none;
            margin-bottom: 0;
        }
        .intro { margin-bottom: 2.5rem; }
        h1 { color: #fff; font-size: 2.5rem; font-weight: 900;
             letter-spacing: -1px; margin: 0 0 1rem; }
        .lede { color: #888; line-height: 1.7; max-width: 72ch; margin: 0; }
    `,
})
export class DocsPage extends RxElement {}

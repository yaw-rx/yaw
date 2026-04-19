import 'reflect-metadata';
import { Component, RxElement } from 'yaw';
import { ScrollReveal } from '../../shared/directives/scroll-reveal.js';
import { TocService } from './toc.js';

@Component({
    selector: 'docs-page',
    directives: [ScrollReveal],
    providers: [TocService],
    template: `
        <docs-sidebar></docs-sidebar>
        <main class="content">
            <header class="intro">
                <h1>Docs</h1>
                <p class="lede">The whole framework on one page. Bootstrap, components,
                   directives, services, navigation — each section is the full story
                   of that primitive, with the real source right next to a live example
                   where it makes sense.</p>
            </header>

            <docs-bootstrap id="bootstrap" toc-section scroll-reveal></docs-bootstrap>
            <docs-components id="components" toc-section scroll-reveal></docs-components>
            <docs-directives id="directives" toc-section scroll-reveal></docs-directives>
            <docs-services id="services" toc-section scroll-reveal></docs-services>
            <docs-navigation id="navigation" toc-section scroll-reveal></docs-navigation>
        </main>
    `,
    styles: `
        :host { display: flex; background: #000; min-height: 100vh;
                color: #ccc; box-sizing: border-box; }
        .content { flex: 1 1 0; min-width: 0; box-sizing: border-box;
                   padding: 6rem 2rem 4rem 2rem; }
        .content > [id] { scroll-margin-top: 5rem; display: block; }
        .intro { margin-bottom: 2.5rem; }
        h1 { color: #fff; font-size: 2.5rem; font-weight: 900;
             letter-spacing: -1px; margin: 0 0 1rem; }
        .lede { color: #888; line-height: 1.7; max-width: 72ch; margin: 0; }
        .reveal { opacity: 0; transform: translateY(24px);
                  transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal.revealed { opacity: 1; transform: none; }
    `,
})
export class DocsPage extends RxElement {}

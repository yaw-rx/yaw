import 'reflect-metadata';
import { Component, RxElement } from 'yaw';
import { ScrollReveal } from '../directives/scroll-reveal.js';

@Component({
    selector: 'examples-page',
    directives: [ScrollReveal],
    template: `
        <div class="page">
            <header class="intro">
                <h1>Examples</h1>
                <p class="lede">Small, real components — each exercising one piece of the
                   framework. Source strings are the same strings the browser renders, so
                   every code block you see is the truth of what's running beside it.</p>
            </header>

            <slider-example scroll-reveal></slider-example>
            <color-playground scroll-reveal></color-playground>
            <signal-meter scroll-reveal></signal-meter>
            <row-firehose scroll-reveal></row-firehose>
            <nesting-example scroll-reveal></nesting-example>
        </div>
    `,
    styles: `
        :host { display: block; background: #000; min-height: 100vh;
                padding: 6rem 1.25rem 4rem; color: #ccc; box-sizing: border-box; }
        .page { max-width: 1200px; margin: 0 auto; }
        .intro { margin-bottom: 2.5rem; }
        h1 { color: #fff; font-size: 2.5rem; font-weight: 900;
             letter-spacing: -1px; margin: 0 0 1rem; }
        .lede { color: #888; line-height: 1.7; max-width: 72ch; margin: 0; }
        .reveal { opacity: 0; transform: translateY(24px);
                  transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal.revealed { opacity: 1; transform: none; }
    `,
})
export class ExamplesPage extends RxElement {}

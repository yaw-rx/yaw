import 'reflect-metadata';
import { Component, RxElement } from 'yaw';
import { ScrollReveal } from '../directives/scroll-reveal.js';

@Component({
    selector: 'showcase-page',
    directives: [ScrollReveal],
    template: `
        <div class="page">
            <header class="intro">
                <h1>Showcase</h1>
                <p class="lede">Real applications built with YAW.</p>
            </header>

            <drum-sequencer scroll-reveal></drum-sequencer>
        </div>
    `,
    styles: `
        :host { display: block; background: #000; min-height: calc(100vh / 1.75);
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
export class ShowcasePage extends RxElement {}

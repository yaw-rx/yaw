import 'reflect-metadata';
import { Component, RxElement, observable } from 'yaw';
import { escape } from './code-highlight.js';
import { SLIDER_SOURCE } from './yaw-slider.js';

const USAGE = `<yaw-slider for="value" min="0" max="100"></yaw-slider>
<p>value = {{value}}</p>`;

@Component({
    selector: 'slider-example',
    template: `
        <h1>Custom slider</h1>
        <p class="lede">Native form controls can't survive the mirror walk, so we build our
           own. One component, <code class="inline">pointerdown</code> /
           <code class="inline">move</code> / <code class="inline">up</code>, plus two
           <code class="inline">[style]</code> bindings for the fill and the thumb. Two-way
           binding to an <code class="inline">@observable</code> on the parent is the whole
           of the public API — <code class="inline">for="propName"</code>.</p>

        <section class="host">
            <h2>The slider component</h2>
            <p class="note">The primitive itself. The template lives in
               <code class="inline">SLIDER_TEMPLATE</code> and is reused verbatim by this
               code block — the string rendered below is the same string the browser
               parses at runtime.</p>
            <code-block lang="ts">${escape`${SLIDER_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>In use</h2>
            <p class="note">Declare an <code class="inline">@observable</code> on the parent,
               point the slider at it with <code class="inline">for</code>, and read the
               value back through the usual <code class="inline">{{ }}</code> binding —
               pointer gestures push into the parent's subject, so everything reading it
               updates for free.</p>
            <div class="split">
                <code-block lang="html">${escape`${USAGE}`}</code-block>
                <div class="live">
                    <yaw-slider for="value" min="0" max="100"></yaw-slider>
                    <p class="state">value = <span class="status">{{value}}</span></p>
                </div>
            </div>
        </section>
    `,
    styles: `
        slider-example { display: block; color: #ccc; }
        slider-example h1 { color: #fff; font-size: 2rem; font-weight: 900;
                            letter-spacing: -1px; margin: 0 0 0.75rem; }
        slider-example .lede { color: #888; line-height: 1.7; margin-bottom: 2rem; max-width: 72ch; }
        slider-example .inline { background: #111; padding: 0.1rem 0.4rem;
                                 border-radius: 3px; font-size: 0.9em; color: #8af; }
        slider-example h2 { color: #fff; font-size: 1.1rem; font-weight: 700;
                            margin: 0 0 1rem; letter-spacing: 0.02em; }
        slider-example .host, slider-example .ex { margin-bottom: 1.5rem; padding: 1.25rem;
                                                   background: #0a0a0a; border: 1px solid #1a1a1a;
                                                   border-radius: 8px; }
        slider-example .note { color: #888; font-size: 0.9rem; line-height: 1.6;
                               margin: 0 0 1rem; max-width: 72ch; }
        slider-example .split { display: grid;
                                grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
                                gap: 1rem; align-items: stretch; }
        slider-example .split > * { min-width: 0; }
        slider-example .live { display: flex; flex-direction: column; gap: 1rem;
                               justify-content: center; padding: 1.5rem; background: #050505;
                               border: 1px solid #1a1a1a; border-radius: 8px; }
        slider-example .state { margin: 0; font-family: monospace; color: #888; font-size: 0.85rem; }
        slider-example .state .status { color: #8af; }
    `,
})
export class SliderExample extends RxElement<{ value: number }> {
    @observable value = 50;
}

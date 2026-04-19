import 'reflect-metadata';
import { Component, RxElement, observable } from 'yaw';
import { escape } from '../../../shared/lib/code-highlight.js';
import { SLIDER_SOURCE } from './yaw-slider.js';
import { DOC_STYLES } from '../../../shared/lib/doc-styles.js';

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
        :host { display: block; }
        .live { display: flex; flex-direction: column; gap: 1rem;
                justify-content: center; padding: 1.5rem; background: #050505;
                border: 1px solid #1a1a1a; border-radius: 8px; }
        .state { margin: 0; font-family: monospace; color: #888; font-size: 0.85rem; }
        .state .status { color: #8af; }
        ${DOC_STYLES}
    `,
})
export class SliderExample extends RxElement<{ value: number }> {
    @observable value = 50;
}

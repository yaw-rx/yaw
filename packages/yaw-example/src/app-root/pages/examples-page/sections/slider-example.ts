import { Component, RxElement, state } from 'yaw';
import { escape } from '../../../components/code-block/code-highlight.js';
import { SLIDER_SOURCE } from '../components/yaw-slider.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';

const USAGE = `<yaw-slider [(value)]="value" min="0" max="100"></yaw-slider>
<p>value = {{value}}</p>`;

@Component({
    selector: 'slider-example',
    template: `
        <h1>Custom slider</h1>
        <p class="lede">Native form controls can't survive the mirror walk, so we build our
           own. One component, <code class="inline">pointerdown</code> /
           <code class="inline">move</code> / <code class="inline">up</code>, plus two
           <code class="inline">[style]</code> bindings for the fill and the thumb. Two-way
           model binding — <code class="inline">[(value)]="propName"</code> — is the
           whole of the public API.</p>

        <section class="host">
            <h2>The slider component</h2>
            <p class="note">The primitive itself. The template lives in
               <code class="inline">SLIDER_TEMPLATE</code> and is reused verbatim by this
               code block — the string rendered below is the same string the browser
               parses at runtime.</p>
            <code-block syntax="ts">${escape`${SLIDER_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>In use</h2>
            <p class="note">Declare an <code class="inline">@state</code> on the parent,
               bind it with <code class="inline">[(value)]="prop"</code>, and read the
               value back through the usual <code class="inline">${escape`{{ }}`}</code> binding —
               pointer gestures push into the parent's subject, so everything reading it
               updates for free.</p>
            <div class="split">
                <code-block syntax="html">${escape`${USAGE}`}</code-block>
                <div class="live">
                    <yaw-slider [(value)]="value" min="0" max="100"></yaw-slider>
                    <p class="state">value = <span class="status">{{value}}</span></p>
                </div>
            </div>
        </section>
    `,
    styles: `
        :host { display: block; }
        ${DOC_STYLES}
        .live { display: flex; flex-direction: column; gap: 1rem; }
        .state { margin: 0; font-family: monospace; color: #888; font-size: 0.85rem; }
        .state .status { color: #8af; }
    `,
})
export class SliderExample extends RxElement<{ value: number }> {
    @state value = 50;
}

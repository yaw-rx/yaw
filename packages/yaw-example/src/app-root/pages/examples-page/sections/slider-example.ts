import { Component, RxElement, state } from '@yaw-rx/core';
import { escape } from '@yaw-rx/common';
import '../../../components/code-block.js';
import { SLIDER_SOURCE } from '../components/yaw-slider.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';
import { TocSection } from '../../docs-page/directives/toc-section.js';
import { TocAnchor } from '../../docs-page/directives/toc-anchor.js';

const USAGE = `<yaw-slider [(value)]="value" min="0" max="100"></yaw-slider>
<p>value = {{value}}</p>`;

@Component({
    selector: 'slider-example',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="custom-slider">Custom slider</h1>
        <p class="lede">A custom slider built from DOM pointer events —
           <code class="inline">pointerdown</code>,
           <code class="inline">pointermove</code>, and
           <code class="inline">pointerup</code> track the user's drag gesture.
           Two CSS <code class="inline">[style]</code> bindings position the fill
           and the thumb. The parent communicates with the slider through
           a single <a href="/docs/components/bindings/data">tap binding</a>,
           <code class="inline">${escape`[(value)]="propName"`}</code>, which pushes
           the slider's value into the parent's field whenever it changes.</p>

        <section class="host">
            <h2>The slider component</h2>
            <p class="note">Three <a href="/docs/components/state"><code class="inline">@state</code></a> fields —
               <code class="inline">value</code>,
               <code class="inline">min</code>, and
               <code class="inline">max</code>.
               <code class="inline">grab</code> captures the pointer,
               <code class="inline">drag</code> normalises the cursor position into
               a value between min and max, and
               <code class="inline">release</code> lets go. Two derived getters
               (<code class="inline">fillStyle$</code> and
               <code class="inline">thumbStyle$</code>) map the current value to
               CSS <code class="inline">width</code> and
               <code class="inline">left</code> percentages that the template's
               <a href="/docs/components/bindings">[style] bindings</a> apply
               directly to the track elements.</p>
            <code-block syntax="ts">${escape`${SLIDER_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>In use</h2>
            <p class="note">Declare an <code class="inline">@state</code> field on the
               parent and bind it with
               <code class="inline">${escape`[(value)]="prop"`}</code>. Drag the
               thumb and the text binding below updates in real time.</p>
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
        .state { margin: 0; font-family: monospace; color: var(--secondary); font-size: 0.85rem; }
        .state .status { color: var(--accent); }
    `,
})
export class SliderExample extends RxElement {
    @state value = 50;
}

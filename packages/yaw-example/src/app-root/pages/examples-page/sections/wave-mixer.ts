import { Component, RxElement } from '@yaw-rx/core';
import { escape } from '@yaw-rx/common';
import '../../../components/code-block.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';
import { TocSection } from '../../docs-page/directives/toc-section.js';
import { TocAnchor } from '../../docs-page/directives/toc-anchor.js';
import { WAVE_MIXER_SOURCE } from '../components/wave-mixer.js';

const WRAPPER_STYLES = `
    .live { padding: 1.25rem; background: #050505;
            border: 1px solid #1a1a1a; border-radius: 8px; }
`;

@Component({
    selector: 'wave-mixer-example',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="wave-mixer">Wave mixer</h1>
        <p class="lede">Three sine waves at different frequencies, mixed into a
           summed wave and drawn on a single
           <code class="inline">${escape`<rx-graph>`}</code>. Each slider controls
           one frequency through a
           <a href="/docs/components/bindings/data">tap binding</a>, and the graph
           receives all four observable streams through a
           <a href="/docs/components/bindings">[series] property binding</a>.</p>

        <section class="host">
            <h2>The wave mixer component</h2>
            <p class="note">Three
               <a href="/docs/components/state"><code class="inline">@state</code></a>
               frequency fields —
               <code class="inline">freq1</code>,
               <code class="inline">freq2</code>, and
               <code class="inline">freq3</code>. Each slider writes one of them
               through a tap binding. In
               <code class="inline">onInit</code>, each field's
               <a href="/docs/components/state/dollar"><code class="inline">$</code> stream</a>
               is piped through a <code class="inline">sine</code> function that
               generates a 200-point array. A
               <code class="inline">combineLatest</code> of all three produces the
               summed wave. The resulting four observable streams are written into
               the <code class="inline">graphSeries</code> record that the template
               binds to
               <code class="inline">${escape`<rx-graph>`}</code>.</p>
            <code-block syntax="ts">${escape`${WAVE_MIXER_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>Drag to modulate</h2>
            <p class="note">Each slider controls one frequency. Drag it and the
               corresponding sine wave recomputes, the sum recalculates, and the
               graph redraws all four lines.</p>
            <div class="split">
                <code-block syntax="html">${escape`<wave-mixer></wave-mixer>`}</code-block>
                <div class="live"><wave-mixer></wave-mixer></div>
            </div>
        </section>
    `,
    styles: `${WRAPPER_STYLES}\n${DOC_STYLES}`,
})
export class WaveMixerExample extends RxElement {}

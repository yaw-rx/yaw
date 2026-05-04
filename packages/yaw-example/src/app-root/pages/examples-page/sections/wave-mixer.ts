import { Component, RxElement } from '@yaw-rx/core';
import { escape } from '../../../components/code-block/code-highlight.js';
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
        <p class="lede">Three sine waves at different frequencies, mixed into a sum.
           Each slider drives an <code class="inline">@state</code> field. Each field's
           <code class="inline">$</code> observable is <code class="inline">pipe</code>d
           into a point array. A <code class="inline">combineLatest</code> joins all three
           into the summed wave. Four observable streams passed into one
           <code class="inline">rx-graph</code> — the graph subscribes to all of them
           and redraws on every emission.</p>

        <section class="host">
            <h2>The wave mixer component</h2>
            <p class="note">Three <code class="inline">@state</code> frequencies, four
               derived observable series. The graph receives them as property bindings —
               observables as first-class values flowing through the component tree.</p>
            <code-block syntax="ts">${escape`${WAVE_MIXER_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>Drag to modulate</h2>
            <p class="note">Each slider changes a frequency. The individual waves and
               their sum update instantly — no diff, no reconciliation, just observable
               streams pushing new arrays into the graph's canvas.</p>
            <div class="split">
                <code-block syntax="html">${escape`<wave-mixer></wave-mixer>`}</code-block>
                <div class="live"><wave-mixer></wave-mixer></div>
            </div>
        </section>
    `,
    styles: `${WRAPPER_STYLES}\n${DOC_STYLES}`,
})
export class WaveMixerExample extends RxElement {}

import { Component, RxElement, state } from '@yaw-rx/core';
import { escape } from '../../../components/code-block/code-highlight.js';
import '../../../components/code-block.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';
import { TocSection } from '../../docs-page/directives/toc-section.js';
import { TocAnchor } from '../../docs-page/directives/toc-anchor.js';
import { SIGNAL_METER_SOURCE } from '../components/signal-meter.js';

const WRAPPER_STYLES = `
    .live { display: flex; flex-direction: column; align-items: center;
            gap: 1.25rem; padding: 1.75rem; background: #050505;
            border: 1px solid #1a1a1a; border-radius: 8px; }
    .live yaw-slider { width: 100%; max-width: 22rem; }
`;

@Component({
    selector: 'signal-meter-example',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="signal-meter">SVG signal meter</h1>
        <p class="lede">Five <code class="inline">@state</code> fields, one
           <code class="inline">[style]</code> binding. The slider writes
           <code class="inline">strength</code>,
           <code class="inline">hueStart</code> /
           <code class="inline">hueEnd</code> set the colour range,
           <code class="inline">lightness</code> controls brightness, and
           <code class="inline">glow</code> controls the drop-shadow intensity.
           A <code class="inline">combineLatest</code> joins them into
           <code class="inline">--pct</code>,
           <code class="inline">--hue</code>,
           <code class="inline">--lit</code>, and
           <code class="inline">--glow</code> custom properties, and SVG
           <code class="inline">stroke-dashoffset</code> plus
           <code class="inline">stroke</code> are driven entirely from
           CSS — no animation loop, no per-frame JS, no
           reconciliation.</p>

        <section class="host">
            <h2>The meter component</h2>
            <p class="note">Template and class in full. Everything visual — the sweep, the
               colour shift, the glow — is downstream of the same
               <code class="inline">--pct</code>,
               <code class="inline">--hue</code>,
               <code class="inline">--lit</code>, and
               <code class="inline">--glow</code>.</p>
            <code-block syntax="ts">${escape`${SIGNAL_METER_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>Drag to modulate</h2>
            <p class="note">Drag the slider: the ring sweeps, the hue rotates through the
               spectrum, the glow chases the stroke. The only thing the JS writes is the
               percentage.</p>
            <div class="split">
                <code-block syntax="html">${escape`<signal-meter strength="65" hueStart="140" hueEnd="340" lightness="62" glow="14"></signal-meter>`}</code-block>
                <div class="live">
                    <signal-meter [strength]="strength"></signal-meter>
                    <yaw-slider [(value)]="strength" min="0" max="100"></yaw-slider>
                </div>
            </div>
        </section>
    `,
    styles: `${WRAPPER_STYLES}\n${DOC_STYLES}`,
})
export class SignalMeterExample extends RxElement {
    @state strength = 65;
}

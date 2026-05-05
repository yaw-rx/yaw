import { Component, RxElement, state } from '@yaw-rx/core';
import { escape } from '@yaw-rx/common';
import '../../../components/code-block.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';
import { TocSection } from '../../docs-page/directives/toc-section.js';
import { TocAnchor } from '../../docs-page/directives/toc-anchor.js';
import { SIGNAL_METER_SOURCE } from '../components/signal-meter.js';

const WRAPPER_STYLES = `
    .live { display: flex; flex-direction: column; align-items: center;
            gap: 1.25rem; padding: 1.75rem; background: var(--bg-1);
            border: 1px solid var(--bg-5); border-radius: 8px; }
    .live yaw-slider { width: 100%; max-width: 22rem; }
`;

@Component({
    selector: 'signal-meter-example',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="signal-meter">SVG signal meter</h1>
        <p class="lede">An SVG arc whose sweep, colour, and glow are all driven by
           CSS custom properties. A single
           <a href="/docs/components/bindings">[style] binding</a> writes four
           custom properties to the host element, and CSS does the rest — the
           SVG's <code class="inline">stroke-dashoffset</code> and
           <code class="inline">stroke</code> colour both reference those
           properties directly.</p>

        <section class="host">
            <h2>The meter component</h2>
            <p class="note">Five
               <a href="/docs/components/state"><code class="inline">@state</code></a>
               fields —
               <code class="inline">strength</code>,
               <code class="inline">hueStart</code>,
               <code class="inline">hueEnd</code>,
               <code class="inline">lightness</code>, and
               <code class="inline">glow</code> — each settable via an attribute
               binding from the parent. The derived getter
               <code class="inline">meterStyle$</code> joins all five
               <a href="/docs/components/state/dollar"><code class="inline">$</code> streams</a>
               with <code class="inline">combineLatest</code> and maps them to four
               CSS custom properties
               (<code class="inline">--pct</code>,
               <code class="inline">--hue</code>,
               <code class="inline">--lit</code>,
               <code class="inline">--glow</code>) that the SVG template
               references in its inline styles.</p>
            <code-block syntax="ts">${escape`${SIGNAL_METER_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>Drag to modulate</h2>
            <p class="note">Drag the slider and the arc sweeps, the hue rotates,
               and the glow follows — all from a single
               <code class="inline">strength</code> value flowing through the
               component's reactive chain into CSS.</p>
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

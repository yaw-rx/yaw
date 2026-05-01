import { combineLatest, map, type Observable } from 'rxjs';
import { Component, RxElement, state } from 'yaw';
import { escape } from '../../../components/code-block/code-highlight.js';
import '../../../components/code-block.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';
import { TocSection } from '../../docs-page/directives/toc-section.js';
import { TocAnchor } from '../../docs-page/directives/toc-anchor.js';

const PALETTE_TEMPLATE = `
    <label>H <em>{{hue}}°</em></label>
    <yaw-slider [(value)]="hue" min="0" max="360"></yaw-slider>

    <label>S <em>{{sat}}%</em></label>
    <yaw-slider [(value)]="sat" min="0" max="100"></yaw-slider>

    <label>L <em>{{lit}}%</em></label>
    <yaw-slider [(value)]="lit" min="0" max="100"></yaw-slider>

    <code class="out">{{css}}</code>
    <div class="swatch" [style]="swatchStyle"></div>
`;

const PALETTE_STYLES = `
    :host { display: block; }
    label { color: #888; font-size: 0.8rem;
            font-family: monospace; text-transform: uppercase;
            letter-spacing: 0.08em; }
    em { color: #8af; font-style: normal;
         display: inline-block; min-width: 4ch; text-align: right; }
    .out { background: #0a0a0a; padding: 0.6rem 0.75rem; border-radius: 4px;
           color: #8af; font-family: monospace; font-size: 0.8rem;
           border: 1px solid #1a1a1a; }
    .swatch { border-radius: 8px; border: 1px solid #1a1a1a; min-height: 6rem;
              box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.35);
              transition: background 0.1s linear; }
`;

const WRAPPER_STYLES = `
    .live { display: grid; grid-template-columns: auto 1fr; gap: 0.75rem 1rem;
            align-items: center; padding: 1.5rem;
            background: #050505; border: 1px solid #1a1a1a; border-radius: 8px; }
    .live .out, .live .swatch { grid-column: 1 / -1; }
`;

const HOST_SOURCE = `@Component({
    selector: 'color-playground',
    template: \`${PALETTE_TEMPLATE}\`,
    styles: \`${PALETTE_STYLES}\`,
})
export class ColorPlayground extends RxElement {
    @state hue = 200;
    @state sat = 70;
    @state lit = 55;

    get css$(): Observable<string> {
        return combineLatest([this.hue$, this.sat$, this.lit$]).pipe(
            map(([h, s, l]) => \`hsl(\${h} \${s}% \${l}%)\`)
        );
    }

    get swatchStyle$(): Observable<string> {
        return this.css$.pipe(map((c) => \`background: \${c}\`));
    }
}`;

@Component({
    selector: 'color-playground',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="reactive-palette">Reactive palette</h1>
        <p class="lede">Three <code class="inline">@state</code> fields, three
           <code class="inline">yaw-slider</code> instances bound via
           <code class="inline">[(value)]</code>. One <code class="inline">combineLatest</code>
           joins them into an <code class="inline">hsl(...)</code> string and a
           <code class="inline">[style]</code> binding drops it straight into the swatch —
           no diff, no reconciliation.</p>

        <section class="host">
            <h2>The palette component</h2>
            <p class="note"><code class="inline">PALETTE_TEMPLATE</code> is the same string
               rendered live below — impossible to lie about what's running.</p>
            <code-block syntax="ts">${escape`${HOST_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>HSL on three sliders</h2>
            <p class="note">Drag any slider: the thumb position writes to the parent's
               observable, <code class="inline">combineLatest</code> emits, and the style
               binding pushes the new HSL string.</p>
            <div class="split">
                <code-block syntax="html">${escape`<color-playground></color-playground>`}</code-block>
                <div class="live">${PALETTE_TEMPLATE}</div>
            </div>
        </section>
    `,
    styles: `${PALETTE_STYLES}\n${WRAPPER_STYLES}\n${DOC_STYLES}`,
})
export class ColorPlayground extends RxElement {
    @state hue = 200;
    @state sat = 70;
    @state lit = 55;

    get css$(): Observable<string> {
        return combineLatest([this.hue$, this.sat$, this.lit$]).pipe(
            map(([h, s, l]) => `hsl(${String(h)} ${String(s)}% ${String(l)}%)`)
        );
    }

    get swatchStyle$(): Observable<string> {
        return this.css$.pipe(map((c) => `background: ${c}`));
    }
}

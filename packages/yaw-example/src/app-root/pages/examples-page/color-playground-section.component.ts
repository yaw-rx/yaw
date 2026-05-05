import { Component, RxElement } from '@yaw-rx/core';
import { escape } from '@yaw-rx/common';
import '../../components/code-block.component.js';
import { DOC_STYLES } from '../../utils/doc-styles.util.js';
import { TocSection } from '../../directives/toc-section.directive.js';
import { TocAnchor } from '../../directives/toc-anchor.directive.js';
import { COLOR_PLAYGROUND_SOURCE } from './color-playground-section/color-playground.component.js';

const WRAPPER_STYLES = `
    .live { padding: 1.5rem; background: var(--bg-1);
            border: var(--border-width) solid var(--bg-5); border-radius: var(--radius-lg); }
    .live color-playground { display: grid; grid-template-columns: auto 1fr;
            gap: 0.75rem 1rem; align-items: center; }
    .live color-playground .out,
    .live color-playground .swatch { grid-column: 1 / -1; }
`;

@Component({
    selector: 'color-playground-section',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="reactive-palette">Reactive palette</h1>
        <p class="lede">A colour palette built from three
           <a href="/docs/components/state"><code class="inline">@state</code></a>
           fields — <code class="inline">hue</code>,
           <code class="inline">sat</code>, and
           <code class="inline">lit</code> — representing a colour in the HSL
           colour space. Each field is bound to a
           <code class="inline">${escape`<yaw-slider>`}</code> through a
           <a href="/docs/components/bindings/data">tap binding</a>. A single
           <a href="/docs/components/bindings">[style] binding</a> applies the
           combined colour as a CSS <code class="inline">background</code> to the
           swatch element.</p>

        <section class="host">
            <h2>The palette component</h2>
            <p class="note">Each slider's
               <code class="inline">${escape`[(value)]="fieldName"`}</code>
               tap binding writes one
               <a href="/docs/components/state/dollar"><code class="inline">$</code> stream</a>.
               The derived getter <code class="inline">css$</code> joins all three
               streams with <code class="inline">combineLatest</code> and maps the
               result to an <code class="inline">hsl(...)</code> string.
               <code class="inline">swatchStyle$</code> wraps that string in a
               <code class="inline">background:</code> declaration that the
               template's <code class="inline">[style]</code> binding reads.</p>
            <code-block syntax="ts">${escape`${COLOR_PLAYGROUND_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>HSL on three sliders</h2>
            <p class="note">Drag any slider and the swatch colour changes in
               real time.</p>
            <div class="split">
                <code-block syntax="html">${escape`<color-playground></color-playground>`}</code-block>
                <div class="live"><color-playground></color-playground></div>
            </div>
        </section>
    `,
    styles: `${WRAPPER_STYLES}\n${DOC_STYLES}`,
})
export class ColorPlaygroundExample extends RxElement {}

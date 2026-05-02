import { Component, RxElement } from '@yaw-rx/core';
import { escape } from '../../../components/code-block/code-highlight.js';
import '../../../components/code-block.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';
import { TocSection } from '../../docs-page/directives/toc-section.js';
import { TocAnchor } from '../../docs-page/directives/toc-anchor.js';
import { COLOR_PLAYGROUND_SOURCE } from '../components/color-playground.js';

const WRAPPER_STYLES = `
    .live { padding: 1.5rem; background: #050505;
            border: 1px solid #1a1a1a; border-radius: 8px; }
    .live color-playground { display: grid; grid-template-columns: auto 1fr;
            gap: 0.75rem 1rem; align-items: center; }
    .live color-playground .out,
    .live color-playground .swatch { grid-column: 1 / -1; }
`;

@Component({
    selector: 'color-playground-example',
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
            <p class="note"><code class="inline">COLOR_PLAYGROUND_TEMPLATE</code> is the same string
               rendered live below — impossible to lie about what's running.</p>
            <code-block syntax="ts">${escape`${COLOR_PLAYGROUND_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>HSL on three sliders</h2>
            <p class="note">Drag any slider: the thumb position writes to the parent's
               observable, <code class="inline">combineLatest</code> emits, and the style
               binding pushes the new HSL string.</p>
            <div class="split">
                <code-block syntax="html">${escape`<color-playground></color-playground>`}</code-block>
                <div class="live"><color-playground></color-playground></div>
            </div>
        </section>
    `,
    styles: `${WRAPPER_STYLES}\n${DOC_STYLES}`,
})
export class ColorPlaygroundExample extends RxElement {}

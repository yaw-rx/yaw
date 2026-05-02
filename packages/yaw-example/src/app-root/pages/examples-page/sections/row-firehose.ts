import { Component, RxElement } from '@yaw-rx/core';
import { escape } from '../../../components/code-block/code-highlight.js';
import '../../../components/code-block.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';
import { TocSection } from '../../docs-page/directives/toc-section.js';
import { TocAnchor } from '../../docs-page/directives/toc-anchor.js';
import { ROW_FIREHOSE_SOURCE } from '../components/row-firehose.js';

const WRAPPER_STYLES = `
    .live { padding: 1.25rem; background: #050505;
            border: 1px solid #1a1a1a; border-radius: 8px; }
`;

@Component({
    selector: 'row-firehose-example',
    directives: [TocSection, TocAnchor],
    template: `
        <h1 toc-anchor="v8-firehose">V8 firehose</h1>
        <p class="lede">Click flood. <code class="inline">amount</code> rows get appended to
           a scrollable container over <code class="inline">seconds</code> seconds —
           raw DOM, direct <code class="inline">insertAdjacentHTML</code>, no virtualization,
           no windowing, no reconciliation. The scroll pins to the bottom if you're already
           there. Watch the index tick and see what the browser is actually capable of
           before anyone starts talking about "performance".</p>

        <section class="host">
            <h2>The component</h2>
            <p class="note">One rAF loop, one HTML string per frame, one
               <code class="inline">insertAdjacentHTML</code>. That's the whole thing.</p>
            <code-block syntax="ts">${escape`${ROW_FIREHOSE_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>Flood</h2>
            <p class="note">Drag the sliders, press flood, scroll. Press flood again — it
               appends to whatever's already there.</p>
            <div class="split">
                <code-block syntax="html">${escape`<row-firehose></row-firehose>`}</code-block>
                <div class="live"><row-firehose></row-firehose></div>
            </div>
        </section>
    `,
    styles: `${WRAPPER_STYLES}\n${DOC_STYLES}`,
})
export class RowFirehoseExample extends RxElement {}

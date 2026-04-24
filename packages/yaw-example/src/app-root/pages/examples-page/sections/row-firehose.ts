import { Component, RxElement, state } from 'yaw';
import { escape } from '../../../components/code-block/code-highlight.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';

const FIREHOSE_TEMPLATE = `
    <div class="controls">
        <div class="field">
            <label>amount <em>{{amount}}</em></label>
            <yaw-slider [(value)]="amount" min="1000" max="100000"></yaw-slider>
        </div>
        <div class="field">
            <label>seconds <em>{{seconds}}</em></label>
            <yaw-slider [(value)]="seconds" min="1" max="10"></yaw-slider>
        </div>
        <div class="actions">
            <button onclick="flood">flood</button>
            <button onclick="reset">clear</button>
            <span class="count">rows: {{count}}</span>
        </div>
    </div>
    <div class="scroll" #viewport>
        <div class="head">
            <div>#</div>
            <div>timestamp</div>
            <div>random</div>
        </div>
        <div class="body" #body></div>
    </div>
`;

const FIREHOSE_STYLES = `
    :host { display: block; }
    .controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 0.75rem 1.25rem; margin-bottom: 1rem; align-items: center; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
    label { color: #888; font-size: 0.75rem; font-family: monospace;
            text-transform: uppercase; letter-spacing: 0.08em;
            display: flex; justify-content: space-between; gap: 0.5rem; }
    em { color: #8af; font-style: normal; }
    .actions { grid-column: 1 / -1; display: flex; gap: 0.5rem;
               align-items: center; flex-wrap: wrap; }
    button { background: #111; border: 1px solid #333; color: #fff;
             padding: 0.5rem 1rem; font: inherit; font-size: 0.85rem;
             font-family: monospace; cursor: pointer; border-radius: 6px; }
    button:hover { background: #1a1a1a; border-color: #8af; color: #8af; }
    .count { margin-left: auto; color: #8af; font-family: monospace; font-size: 0.85rem; }

    .scroll { height: 24rem; overflow-y: auto;
              background: #030303; border: 1px solid #1a1a1a; border-radius: 8px;
              scrollbar-width: thin; scrollbar-color: #333 #0a0a0a; }
    .scroll::-webkit-scrollbar { width: 10px; }
    .scroll::-webkit-scrollbar-track { background: #0a0a0a; border-radius: 8px; }
    .scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 5px;
                                       border: 2px solid #0a0a0a; }
    .scroll::-webkit-scrollbar-thumb:hover { background: #8af; }

    .head { display: grid; grid-template-columns: 6rem 1fr 1fr;
            padding: 0.65rem 1rem; background: #0a0a0a; color: #666;
            font-family: monospace; font-size: 0.7rem;
            text-transform: uppercase; letter-spacing: 0.1em;
            position: sticky; top: 0; z-index: 1;
            border-bottom: 1px solid #1a1a1a; }
    .body > .row { display: grid; grid-template-columns: 6rem 1fr 1fr;
                   padding: 0.3rem 1rem; font-family: monospace;
                   font-size: 0.8rem; color: #ccc;
                   border-bottom: 1px solid #0a0a0a; }
    .body > .row:nth-child(odd) { background: #080808; }
    .body > .row > :first-child { color: #8af; }
    .body > .row > :nth-child(3) { color: #666; }
`;

const WRAPPER_STYLES = `
    .live { padding: 1.25rem; background: #050505;
            border: 1px solid #1a1a1a; border-radius: 8px; }
`;

const HOST_SOURCE = `@Component({
    selector: 'row-firehose',
    template: \`${FIREHOSE_TEMPLATE}\`,
    styles: \`${FIREHOSE_STYLES}\`,
})
export class RowFirehose extends RxElement<{ amount: number; seconds: number; count: number }> {
    @state amount = 10000;
    @state seconds = 1;
    @state count = 0;

    private viewport!: HTMLElement;
    private body!: HTMLElement;
    private raf = 0;

    override onDestroy(): void { cancelAnimationFrame(this.raf); }

    flood(): void {
        cancelAnimationFrame(this.raf);
        const total = this.amount;
        const durationMs = this.seconds * 1000;
        const start = performance.now();
        const base = this.count;
        let added = 0;
        const tick = (now: number): void => {
            const pinned = this.viewport.scrollTop + this.viewport.clientHeight
                         >= this.viewport.scrollHeight - 24;
            const target = Math.min(total, Math.floor(((now - start) / durationMs) * total));
            if (target > added) {
                let html = '';
                for (let i = added; i < target; i++) {
                    const idx = base + i + 1;
                    html += \`<div class="row"><div>\${idx}</div><div>\${now.toFixed(1)}</div><div>\${Math.random().toFixed(6)}</div></div>\`;
                }
                this.body.insertAdjacentHTML('beforeend', html);
                this.count = base + target;
                added = target;
                if (pinned) this.viewport.scrollTop = this.viewport.scrollHeight;
            }
            if (added < total) this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
    }

    reset(): void {
        cancelAnimationFrame(this.raf);
        this.body.replaceChildren();
        this.count = 0;
    }
}`;

@Component({
    selector: 'row-firehose',
    template: `
        <h1>V8 firehose</h1>
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
            <code-block syntax="ts">${escape`${HOST_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>Flood</h2>
            <p class="note">Drag the sliders, press flood, scroll. Press flood again — it
               appends to whatever's already there.</p>
            <div class="split">
                <code-block syntax="html">${escape`<row-firehose></row-firehose>`}</code-block>
                <div class="live">${FIREHOSE_TEMPLATE}</div>
            </div>
        </section>
    `,
    styles: `${FIREHOSE_STYLES}\n${WRAPPER_STYLES}\n${DOC_STYLES}`,
})
export class RowFirehose extends RxElement<{ amount: number; seconds: number; count: number }> {
    @state amount = 10000;
    @state seconds = 1;
    @state count = 0;

    private viewport!: HTMLElement;
    private body!: HTMLElement;
    private raf = 0;

    override onDestroy(): void {
        cancelAnimationFrame(this.raf);
    }

    flood(): void {
        cancelAnimationFrame(this.raf);
        const total = this.amount;
        const durationMs = this.seconds * 1000;
        const start = performance.now();
        const base = this.count;
        let added = 0;
        const tick = (now: number): void => {
            const pinned = this.viewport.scrollTop + this.viewport.clientHeight
                         >= this.viewport.scrollHeight - 24;
            const target = Math.min(total, Math.floor(((now - start) / durationMs) * total));
            if (target > added) {
                let html = '';
                for (let i = added; i < target; i++) {
                    const idx = base + i + 1;
                    html += `<div class="row"><div>${String(idx)}</div><div>${now.toFixed(1)}</div><div>${Math.random().toFixed(6)}</div></div>`;
                }
                this.body.insertAdjacentHTML('beforeend', html);
                this.count = base + target;
                added = target;
                if (pinned) this.viewport.scrollTop = this.viewport.scrollHeight;
            }
            if (added < total) this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
    }

    reset(): void {
        cancelAnimationFrame(this.raf);
        this.body.replaceChildren();
        this.count = 0;
    }
}

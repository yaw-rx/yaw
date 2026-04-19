import 'reflect-metadata';
import { Component, RxElement, observable } from 'yaw';
import { escape } from './code-highlight.js';

const FIREHOSE_TEMPLATE = `
    <div class="controls">
        <div class="field">
            <label>amount <em>{{amount}}</em></label>
            <yaw-slider for="amount" min="1000" max="100000"></yaw-slider>
        </div>
        <div class="field">
            <label>seconds <em>{{seconds}}</em></label>
            <yaw-slider for="seconds" min="1" max="10"></yaw-slider>
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

const styles = `
    row-firehose { display: block; color: #ccc; }
    row-firehose h1 { color: #fff; font-size: 2rem; font-weight: 900;
                      letter-spacing: -1px; margin: 0 0 0.75rem; }
    row-firehose .lede { color: #888; line-height: 1.7; margin-bottom: 2rem; max-width: 72ch; }
    row-firehose .inline { background: #111; padding: 0.1rem 0.4rem;
                           border-radius: 3px; font-size: 0.9em; color: #8af; }
    row-firehose h2 { color: #fff; font-size: 1.1rem; font-weight: 700;
                      margin: 0 0 1rem; letter-spacing: 0.02em; }
    row-firehose .host, row-firehose .ex { margin-bottom: 1.5rem; padding: 1.25rem;
                                           background: #0a0a0a; border: 1px solid #1a1a1a;
                                           border-radius: 8px; }
    row-firehose .note { color: #888; font-size: 0.9rem; line-height: 1.6;
                         margin: 0 0 1rem; max-width: 72ch; }
    row-firehose .split { display: grid;
                          grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
                          gap: 1rem; align-items: stretch; }
    row-firehose .split > * { min-width: 0; }
    row-firehose .live { padding: 1.25rem; background: #050505;
                         border: 1px solid #1a1a1a; border-radius: 8px; }

    row-firehose .controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                             gap: 0.75rem 1.25rem; margin-bottom: 1rem; align-items: center; }
    row-firehose .field { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
    row-firehose label { color: #888; font-size: 0.75rem; font-family: monospace;
                         text-transform: uppercase; letter-spacing: 0.08em;
                         display: flex; justify-content: space-between; gap: 0.5rem; }
    row-firehose em { color: #8af; font-style: normal; }
    row-firehose .actions { grid-column: 1 / -1; display: flex; gap: 0.5rem;
                            align-items: center; flex-wrap: wrap; }
    row-firehose button { background: #111; border: 1px solid #333; color: #fff;
                          padding: 0.5rem 1rem; font: inherit; font-size: 0.85rem;
                          font-family: monospace; cursor: pointer; border-radius: 6px; }
    row-firehose button:hover { background: #1a1a1a; border-color: #8af; color: #8af; }
    row-firehose .count { margin-left: auto; color: #8af; font-family: monospace;
                          font-size: 0.85rem; }

    row-firehose .scroll { height: 24rem; overflow-y: auto;
                           background: #030303; border: 1px solid #1a1a1a; border-radius: 8px;
                           scrollbar-width: thin; scrollbar-color: #333 #0a0a0a; }
    row-firehose .scroll::-webkit-scrollbar { width: 10px; }
    row-firehose .scroll::-webkit-scrollbar-track { background: #0a0a0a; border-radius: 8px; }
    row-firehose .scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 5px;
                                                    border: 2px solid #0a0a0a; }
    row-firehose .scroll::-webkit-scrollbar-thumb:hover { background: #8af; }

    row-firehose .head { display: grid; grid-template-columns: 6rem 1fr 1fr;
                         padding: 0.65rem 1rem; background: #0a0a0a; color: #666;
                         font-family: monospace; font-size: 0.7rem;
                         text-transform: uppercase; letter-spacing: 0.1em;
                         position: sticky; top: 0; z-index: 1;
                         border-bottom: 1px solid #1a1a1a; }
    row-firehose .body > .row { display: grid; grid-template-columns: 6rem 1fr 1fr;
                                padding: 0.3rem 1rem; font-family: monospace;
                                font-size: 0.8rem; color: #ccc;
                                border-bottom: 1px solid #0a0a0a; }
    row-firehose .body > .row:nth-child(odd) { background: #080808; }
    row-firehose .body > .row > :first-child { color: #8af; }
    row-firehose .body > .row > :nth-child(3) { color: #666; }
`;

const HOST_SOURCE = `@Component({
    selector: 'row-firehose',
    template: \`${FIREHOSE_TEMPLATE}\`,
    styles,
})
export class RowFirehose extends RxElement<{ amount: number; seconds: number; count: number }> {
    @observable amount = 10000;
    @observable seconds = 1;
    @observable count = 0;

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
            <code-block lang="ts">${escape`${HOST_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>Flood</h2>
            <p class="note">Drag the sliders, press flood, scroll. Press flood again — it
               appends to whatever's already there.</p>
            <div class="split">
                <code-block lang="html">${escape`${FIREHOSE_TEMPLATE}`}</code-block>
                <div class="live">${FIREHOSE_TEMPLATE}</div>
            </div>
        </section>
    `,
    styles,
})
export class RowFirehose extends RxElement<{ amount: number; seconds: number; count: number }> {
    @observable amount = 10000;
    @observable seconds = 1;
    @observable count = 0;

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

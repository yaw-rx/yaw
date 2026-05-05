import Decimal from 'decimal.js';
import { map, type Observable } from 'rxjs';
import { type AttributeCodec, Component, RxElement, state } from '@yaw-rx/core';

@Component({
    selector: 'decimal-demo',
    attributeCodecs: {
        Decimal: {
            encode: (v) => (v as Decimal).toString(),
            decode: (s) => new Decimal(s),
        } as AttributeCodec,
    },
    template: `
        <div class="panel">
            <div class="row">
                <span class="label">Decimal</span>
                <code class="value">{{total}}</code>
            </div>
            <div class="buttons">
                <button onclick="add('0.1')">+ 0.1</button>
                <button onclick="add('0.2')">+ 0.2</button>
                <button onclick="reset">reset</button>
            </div>
            <p class="hint">0.1 + 0.2 = {{sum}} — no floating point drift</p>
        </div>
    `,
    styles: `
        :host { display: block; width: 100%; }
        .panel { display: flex; flex-direction: column; gap: 0.75rem; }
        .row { display: flex; align-items: center; gap: 0.75rem;
               justify-content: space-between; flex-wrap: wrap; }
        .label { color: var(--secondary); font-family: var(--font-mono); font-size: 0.75rem;
                 text-transform: uppercase; letter-spacing: var(--tracking); }
        .value { color: var(--accent); font-family: var(--font-mono); font-size: 1rem;
                 background: var(--bg-2); padding: 0.35rem 0.7rem;
                 border: var(--border-width) solid var(--bg-5); border-radius: var(--radius-sm); }
        .buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        button { background: var(--bg-3); border: var(--border-width) solid var(--border); color: var(--white);
                 padding: 0.4rem 0.8rem; font: inherit; font-family: var(--font-mono);
                 font-size: 0.8rem; cursor: pointer; border-radius: var(--radius-sm); }
        button:hover { border-color: var(--accent); color: var(--accent); }
        .hint { color: var(--dim); font-family: var(--font-mono); font-size: 0.75rem; margin: 0; }
    `,
})
export class DecimalDemo extends RxElement {
    @state total!: Decimal;

    get sum(): Observable<string> {
        return this.total$.pipe(map(() => new Decimal('0.1').plus('0.2').toString()));
    }

    add(n: string): void { this.total = this.total.plus(n); }
    reset(): void { this.total = new Decimal('0.00'); }
}

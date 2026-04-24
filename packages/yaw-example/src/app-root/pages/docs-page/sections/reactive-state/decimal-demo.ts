import Decimal from 'decimal.js';
import { map, type Observable } from 'rxjs';
import { Component, RxElement, state } from 'yaw';

@Component({
    selector: 'decimal-demo',
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
               justify-content: space-between; }
        .label { color: #888; font-family: monospace; font-size: 0.75rem;
                 text-transform: uppercase; letter-spacing: 0.08em; }
        .value { color: #8af; font-family: monospace; font-size: 1rem;
                 background: #0a0a0a; padding: 0.35rem 0.7rem;
                 border: 1px solid #1a1a1a; border-radius: 4px; }
        .buttons { display: flex; gap: 0.5rem; }
        button { background: #111; border: 1px solid #333; color: #fff;
                 padding: 0.4rem 0.8rem; font: inherit; font-family: monospace;
                 font-size: 0.8rem; cursor: pointer; border-radius: 4px; }
        button:hover { border-color: #8af; color: #8af; }
        .hint { color: #555; font-family: monospace; font-size: 0.75rem; margin: 0; }
    `,
})
export class DecimalDemo extends RxElement {
    @state total: Decimal = new Decimal('0.00');

    get sum(): Observable<string> {
        return this.total$.pipe(map(() => new Decimal('0.1').plus('0.2').toString()));
    }

    add(n: string): void { this.total = this.total.plus(n); }
    reset(): void { this.total = new Decimal('0.00'); }
}

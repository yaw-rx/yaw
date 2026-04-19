import 'reflect-metadata';
import { map, type Observable } from 'rxjs';
import { Component, RxElement, observable } from 'yaw';

@Component({
    selector: 'nested-level',
    template: `
        <div class="nested">
            <div class="tag">
                <span class="title">nested scope</span>
                <span class="state">multiplier = {{multiplier}} ({{label()}})</span>
                <button class="cycle" onclick="cycle">cycle ×</button>
            </div>
            <div class="content"><slot></slot></div>
        </div>
    `,
    styles: `
        nested-level { display: block; }
        .nested { border: 1px dashed #333; border-radius: 6px; padding: 1rem 1rem 1.1rem;
                  margin: 0.6rem 0; background: #070707; }
        .tag { display: flex; align-items: center; gap: 0.75rem;
               color: #666; font-size: 0.75rem; letter-spacing: 0.08em;
               text-transform: uppercase; margin-bottom: 0.8rem; }
        .title { color: #555; }
        .state { color: #8af; font-family: monospace; text-transform: none; letter-spacing: 0; }
        .cycle { margin-left: auto; background: #111; border: 1px solid #333; color: #aaa;
                 padding: 0.3rem 0.6rem; font: inherit; font-size: 0.7rem; border-radius: 4px;
                 cursor: pointer; text-transform: uppercase; letter-spacing: 0.08em; }
        .cycle:hover { background: #1a1a1a; color: #fff; }
        .content { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    `
})
export class NestedLevel extends RxElement<{ multiplier: number }> {
    @observable multiplier = 2;

    private readonly cycleValues = [1, 2, 3, 5];

    cycle(): void {
        const i = this.cycleValues.indexOf(this.multiplier);
        const next = this.cycleValues[(i + 1) % this.cycleValues.length] ?? 1;
        this.multiplier = next;
    }

    label(): Observable<string> {
        return this.multiplier$.pipe(map((m) => m === 1 ? 'identity' : `scaled by ${String(m)}`));
    }
}

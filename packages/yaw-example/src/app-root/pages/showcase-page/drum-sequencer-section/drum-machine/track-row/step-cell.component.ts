import { combineLatest, distinctUntilChanged, map, type Observable } from 'rxjs';
import { Component, Inject, RxElement, state } from '@yaw-rx/core';
import { StepTicker } from '../utils/step-ticker.service.js';

@Component({
    selector: 'step-cell',
    template: `<button onclick="^^toggleStep(^trackKey, idx)"
                       [class.on]="on" [class.active]="active" [class.beat]="beat"
                       [style]="cellStyle"></button>`,
    styles: `
        :host { display: block; }
        button { width: 100%; height: 2rem; background: #090909;
                 border: var(--border-width) solid var(--bg-5); border-radius: 3px;
                 cursor: pointer; padding: 0;
                 transition: background 0.06s ease, border-color 0.06s ease,
                             box-shadow 0.08s ease, transform 0.05s ease; }
        button:hover { border-color: var(--border-light); background: var(--bg-3); }
        button.beat { background: #0f0f0f; border-color: var(--bg-7); }
        button.active { border-color: rgba(255,255,255,0.55); }
        button.on {
            background: var(--accent, var(--accent));
            border-color: var(--accent, var(--accent));
            box-shadow: 0 0 10px -2px var(--accent, var(--accent)),
                        inset 0 0 12px rgba(255,255,255,0.25);
        }
        button.on.active {
            transform: scale(1.08);
            box-shadow: 0 0 22px 2px var(--accent, var(--white)),
                        0 0 40px 4px var(--accent, var(--white)),
                        inset 0 0 14px rgba(255,255,255,0.6);
        }
    `,
})
export class StepCell extends RxElement {
    @state idx = 0;
    @state on = false;
    @state beat = false;
    @state accent = '#8af';

    @Inject(StepTicker) private readonly ticker!: StepTicker;

    get active$(): Observable<boolean> {
        return combineLatest([this.idx$, this.ticker.current$]).pipe(
            map(([idx, step]) => idx === step),
            distinctUntilChanged(),
        );
    }

    get cellStyle$(): Observable<string> {
        return this.accent$.pipe(map((a) => `--accent: ${a}`));
    }
}

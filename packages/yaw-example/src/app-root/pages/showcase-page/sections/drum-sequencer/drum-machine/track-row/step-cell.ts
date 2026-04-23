import { combineLatest, distinctUntilChanged, map, type Observable } from 'rxjs';
import { Component, Inject, RxElement, observable } from 'yaw';
import { StepTicker } from '../utils/step-ticker.js';

@Component({
    selector: 'step-cell',
    template: `<button onclick="^^.toggleStep(^.trackKey, idx)"
                       [class.on]="on" [class.active]="active" [class.beat]="beat"
                       [style]="cellStyle"></button>`,
    styles: `
        :host { display: block; }
        button { width: 100%; height: 2rem; background: #090909;
                 border: 1px solid #1a1a1a; border-radius: 3px;
                 cursor: pointer; padding: 0;
                 transition: background 0.06s ease, border-color 0.06s ease,
                             box-shadow 0.08s ease, transform 0.05s ease; }
        button:hover { border-color: #444; background: #111; }
        button.beat { background: #0f0f0f; border-color: #242424; }
        button.active { border-color: rgba(255,255,255,0.55); }
        button.on {
            background: var(--accent, #8af);
            border-color: var(--accent, #8af);
            box-shadow: 0 0 10px -2px var(--accent, #8af),
                        inset 0 0 12px rgba(255,255,255,0.25);
        }
        button.on.active {
            transform: scale(1.08);
            box-shadow: 0 0 22px 2px var(--accent, #fff),
                        0 0 40px 4px var(--accent, #fff),
                        inset 0 0 14px rgba(255,255,255,0.6);
        }
    `,
})
export class StepCell extends RxElement<{
    idx: number;
    on: boolean;
    beat: boolean;
    accent: string;
}> {
    @observable idx = 0;
    @observable on = false;
    @observable beat = false;
    @observable accent = '#8af';

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

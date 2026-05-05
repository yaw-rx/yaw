import { combineLatest, map, type Observable } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
import { STEPS } from './consts.js';
import type { Cell } from './types.js';
import './track-row/step-cell.component.js';

@Component({
    selector: 'track-row',
    directives: [RxFor],
    template: `
        <div class="head">
            <button class="name" onclick="toggleMute"
                    [class.muted]="muted" [style]="nameStyle">{{name}}</button>
            <button class="clear" onclick="^clearTrack(trackKey)">clear</button>
        </div>
        <div class="grid" rx-for="cells by idx">
            <step-cell></step-cell>
        </div>
    `,
    styles: `
        :host { display: grid; grid-template-columns: 6rem 1fr;
                align-items: center; gap: 0.75rem; padding: 0.35rem 0; }
        .head { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
        .name { background: transparent; border: var(--border-width) solid var(--bg-5);
                color: var(--accent, var(--accent));
                padding: 0.35rem 0.5rem; font: inherit; font-family: var(--font-mono);
                font-size: 0.85rem; font-weight: 700; cursor: pointer;
                border-radius: var(--radius-sm); letter-spacing: var(--tracking); text-align: center;
                text-shadow: 0 0 8px var(--accent-shadow, color-mix(in srgb, var(--accent) 40%, transparent));
                transition: background 0.08s, border-color 0.08s, opacity 0.08s; }
        .name:hover { background: rgba(255,255,255,0.03); }
        .name.muted { color: var(--border-light); border-color: var(--bg-6); text-shadow: none;
                      text-decoration: line-through; }
        .clear { background: transparent; border: none; color: var(--dim);
                 font: inherit; font-family: var(--font-mono); font-size: 0.65rem;
                 cursor: pointer; letter-spacing: 0.12em;
                 text-transform: uppercase; padding: 0.15rem; }
        .clear:hover { color: var(--accent); }
        .grid { display: grid; grid-template-columns: repeat(${String(STEPS)}, 1fr);
                gap: 0.25rem; min-width: 0;
                transition: opacity 0.12s ease; }
        :host(.muted) .grid { opacity: 0.3; }
    `,
})
export class TrackRow extends RxElement {
    @state trackKey = '';
    @state name = '';
    @state voice = '';
    @state accent = '#8af';
    @state muted = false;
    @state steps: readonly boolean[] = [];

    get cells$(): Observable<readonly Cell[]> {
        return combineLatest([this.steps$, this.accent$]).pipe(
            map(([steps, accent]) =>
                steps.map((on, idx) => ({
                    idx,
                    on,
                    beat: idx % 4 === 0,
                    accent,
                }))
            )
        );
    }

    get nameStyle$(): Observable<string> {
        return this.accent$.pipe(map((a) => `--accent: ${a}; --accent-shadow: ${a}66`));
    }

    toggleMute(): void {
        this.muted = !this.muted;
        this.classList.toggle('muted', this.muted);
    }
}

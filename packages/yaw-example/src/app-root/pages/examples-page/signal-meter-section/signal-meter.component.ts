import { combineLatest, map, type Observable } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';
import { html, css, ts } from '@yaw-rx/common/tags';

export const SIGNAL_METER_TEMPLATE = html`
    <div class="meter" [style]="meterStyle">
        <svg viewBox="0 0 100 100" class="ring">
            <circle cx="50" cy="50" r="42" class="track"></circle>
            <circle cx="50" cy="50" r="42" class="fill"></circle>
        </svg>
        <div class="readout">
            <div class="value">{{displayStrength}}</div>
            <div class="unit">%</div>
        </div>
    </div>
`;

export const SIGNAL_METER_STYLES = css`
    :host { display: block; }
    .meter { position: relative; width: 14rem; height: 14rem; }
    .ring { width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
    .track { fill: none; stroke: #161616; stroke-width: 6; }
    .fill { fill: none; stroke-width: 7; stroke-linecap: round;
            stroke-dasharray: 264;
            stroke: hsl(var(--hue), 85%, var(--lit));
            stroke-dashoffset: calc(264 - 264 * var(--pct, 0));
            filter: drop-shadow(0 0 var(--glow) hsl(var(--hue), 90%, var(--lit))); }
    .readout { position: absolute; inset: 0; display: flex;
               align-items: center; justify-content: center;
               gap: 0.2rem; pointer-events: none; }
    .value { font-size: 2.8rem; font-weight: 800; font-family: var(--font-mono);
             color: hsl(var(--hue), 90%, var(--lit));
             text-shadow: 0 0 var(--glow) hsl(var(--hue), 90%, var(--lit)); }
    .unit { font-size: 1rem; color: var(--dim); font-family: var(--font-mono); margin-top: 1rem; }
`;

export const SIGNAL_METER_SOURCE = ts`@Component({
    selector: 'signal-meter',
    template: \`${SIGNAL_METER_TEMPLATE}\`,
    styles: \`${SIGNAL_METER_STYLES}\`,
})
export class SignalMeter extends RxElement {
    @state strength = 0;
    @state hueStart = 140;
    @state hueEnd = 340;
    @state lightness = 62;
    @state glow = 14;
    @state dp = 0;

    get displayStrength$(): Observable<string> {
        return combineLatest([this.strength$, this.dp$]).pipe(
            map(([s, dp]) => Number(s).toFixed(dp)),
        );
    }

    get meterStyle$(): Observable<string> {
        return combineLatest([this.strength$, this.hueStart$, this.hueEnd$, this.lightness$, this.glow$]).pipe(
            map(([s, start, end, lit, glow]) => {
                const pct = s / 100;
                const hue = start + pct * (end - start);
                return \`--pct: \${pct}; --hue: \${hue}; --lit: \${lit}%; --glow: \${glow}px\`;
            }),
        );
    }
}`;

@Component({
    selector: 'signal-meter',
    template: SIGNAL_METER_TEMPLATE,
    styles: SIGNAL_METER_STYLES,
})
export class SignalMeter extends RxElement {
    @state strength = 0;
    @state hueStart = 140;
    @state hueEnd = 340;
    @state lightness = 62;
    @state glow = 14;
    @state dp = 0;

    get displayStrength$(): Observable<string> {
        return combineLatest([this.strength$, this.dp$]).pipe(
            map(([s, dp]) => Number(s).toFixed(dp)),
        );
    }

    get meterStyle$(): Observable<string> {
        return combineLatest([this.strength$, this.hueStart$, this.hueEnd$, this.lightness$, this.glow$]).pipe(
            map(([s, start, end, lit, glow]) => {
                const pct = s / 100;
                const hue = start + pct * (end - start);
                return `--pct: ${String(pct)}; --hue: ${String(hue)}; --lit: ${String(lit)}%; --glow: ${String(glow)}px`;
            }),
        );
    }
}

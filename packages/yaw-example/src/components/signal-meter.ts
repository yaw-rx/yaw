import 'reflect-metadata';
import { map, type Observable } from 'rxjs';
import { Component, RxElement, observable } from 'yaw';
import { escape } from './code-highlight.js';

const METER_TEMPLATE = `
    <div class="meter" [style]="meterStyle()">
        <svg viewBox="0 0 100 100" class="ring">
            <circle cx="50" cy="50" r="42" class="track"></circle>
            <circle cx="50" cy="50" r="42" class="fill"></circle>
        </svg>
        <div class="readout">
            <div class="value">{{strength}}</div>
            <div class="unit">%</div>
        </div>
    </div>
    <yaw-slider for="strength" min="0" max="100"></yaw-slider>
`;

const styles = `
    :host { display: block; color: #ccc; }
    h1 { color: #fff; font-size: 2rem; font-weight: 900;
         letter-spacing: -1px; margin: 0 0 0.75rem; }
    .lede { color: #888; line-height: 1.7; margin-bottom: 2rem; max-width: 72ch; }
    .inline { background: #111; padding: 0.1rem 0.4rem;
              border-radius: 3px; font-size: 0.9em; color: #8af; }
    h2 { color: #fff; font-size: 1.1rem; font-weight: 700;
         margin: 0 0 1rem; letter-spacing: 0.02em; }
    .host, .ex { margin-bottom: 1.5rem; padding: 1.25rem;
                 background: #0a0a0a; border: 1px solid #1a1a1a;
                 border-radius: 8px; }
    .note { color: #888; font-size: 0.9rem; line-height: 1.6;
            margin: 0 0 1rem; max-width: 72ch; }
    .split { display: grid;
             grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
             gap: 1rem; align-items: stretch; }
    .split > * { min-width: 0; }
    .live { display: flex; flex-direction: column; align-items: center;
            gap: 1.25rem; padding: 1.75rem; background: #050505;
            border: 1px solid #1a1a1a; border-radius: 8px; }
    .meter { position: relative; width: 14rem; height: 14rem; }
    .ring { width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
    .track { fill: none; stroke: #161616; stroke-width: 6; }
    .fill { fill: none; stroke-width: 7; stroke-linecap: round;
            stroke-dasharray: 264;
            stroke: hsl(calc(140 + var(--pct, 0) * 200), 85%, 62%);
            stroke-dashoffset: calc(264 - 264 * var(--pct, 0));
            filter: drop-shadow(0 0 14px hsl(calc(140 + var(--pct, 0) * 200), 90%, 60%));
            transition: stroke-dashoffset 0.35s cubic-bezier(0.22, 1, 0.36, 1),
                        stroke 0.35s ease, filter 0.35s ease; }
    .readout { position: absolute; inset: 0; display: flex;
               align-items: center; justify-content: center;
               gap: 0.2rem; pointer-events: none; }
    .value { font-size: 2.8rem; font-weight: 800; font-family: monospace;
             color: hsl(calc(140 + var(--pct, 0) * 200), 90%, 72%);
             text-shadow: 0 0 18px hsl(calc(140 + var(--pct, 0) * 200), 90%, 60%);
             transition: color 0.35s ease, text-shadow 0.35s ease; }
    .unit { font-size: 1rem; color: #555; font-family: monospace; margin-top: 1rem; }
    .live yaw-slider { width: 100%; max-width: 22rem; }
`;

const HOST_SOURCE = `@Component({
    selector: 'signal-meter',
    template: \`${METER_TEMPLATE}\`,
    styles: \`${styles}\`,
})
export class SignalMeter extends RxElement<{ strength: number }> {
    @observable strength = 65;

    meterStyle(): Observable<string> {
        return this.strength$.pipe(map((s) => \`--pct: \${s / 100}\`));
    }
}`;

@Component({
    selector: 'signal-meter',
    template: `
        <h1>SVG signal meter</h1>
        <p class="lede">One <code class="inline">@observable</code>, one <code class="inline">[style]</code>
           binding. The slider writes a number, the component forwards it as a
           <code class="inline">--pct</code> custom property, and SVG
           <code class="inline">stroke-dashoffset</code> plus
           <code class="inline">stroke</code> are driven entirely from CSS — no animation
           loop, no per-frame JS, no reconciliation.</p>

        <section class="host">
            <h2>The meter component</h2>
            <p class="note">Template and class in full. Everything visual — the sweep, the
               colour shift, the glow — is downstream of the same
               <code class="inline">--pct</code>.</p>
            <code-block lang="ts">${escape`${HOST_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>Drag to modulate</h2>
            <p class="note">Drag the slider: the ring sweeps, the hue rotates through the
               spectrum, the glow chases the stroke. The only thing the JS writes is the
               percentage.</p>
            <div class="split">
                <code-block lang="html">${escape`${METER_TEMPLATE}`}</code-block>
                <div class="live">${METER_TEMPLATE}</div>
            </div>
        </section>
    `,
    styles,
})
export class SignalMeter extends RxElement<{ strength: number }> {
    @observable strength = 65;

    meterStyle(): Observable<string> {
        return this.strength$.pipe(map((s) => `--pct: ${String(s / 100)}`));
    }
}

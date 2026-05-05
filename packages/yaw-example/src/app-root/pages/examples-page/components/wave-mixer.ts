import { combineLatest, map, type Observable } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';
import './graph.js';

const POINTS = 200;

export const WAVE_MIXER_TEMPLATE = `
    <div class="controls">
        <div class="row">
            <span class="label">wave 1</span>
            <yaw-slider [(value)]="freq1" min="1" max="20"></yaw-slider>
            <span class="readout">{{freq1}} Hz</span>
        </div>
        <div class="row">
            <span class="label">wave 2</span>
            <yaw-slider [(value)]="freq2" min="1" max="20"></yaw-slider>
            <span class="readout">{{freq2}} Hz</span>
        </div>
        <div class="row">
            <span class="label">wave 3</span>
            <yaw-slider [(value)]="freq3" min="1" max="20"></yaw-slider>
            <span class="readout">{{freq3}} Hz</span>
        </div>
    </div>
    <rx-graph [config]="graphConfig" [series]="graphSeries"></rx-graph>
`;

export const WAVE_MIXER_STYLES = `
    :host { display: block; }
    .controls { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem; }
    .row { display: flex; gap: 0.3rem; align-items: center; }
    .row yaw-slider { flex: 1; }
    .label { font-family: var(--font-mono); font-size: 0.75rem; color: var(--muted);
             text-transform: uppercase; letter-spacing: 0.06em; }
    .readout { font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent); text-align: right; }
    rx-graph { --canvas-height: 10rem; }
    rx-graph canvas { height: 10rem; }
`;

export const WAVE_MIXER_SOURCE = `const POINTS = 200;

@Component({
    selector: 'wave-mixer',
    template: \`${WAVE_MIXER_TEMPLATE}\`,
    styles: \`${WAVE_MIXER_STYLES}\`,
})
export class WaveMixer extends RxElement {
    @state freq1 = 1;
    @state freq2 = 1;
    @state freq3 = 1;
    @state graphConfig = {
        wave1: { label: 'wave 1', color: '#f44' },
        wave2: { label: 'wave 2', color: '#4f4' },
        wave3: { label: 'wave 3', color: '#44f' },
        sum:   { label: 'sum',    color: '#fff', width: 2 },
    };
    @state graphSeries: Record<string, Observable<number[]>> = {};

    private sine(freq: number): number[] {
        const pts: number[] = [];
        for (let i = 0; i < POINTS; i++) {
            pts.push(Math.sin(2 * Math.PI * freq * (i / POINTS)) * 0.5 + 0.5);
        }
        return pts;
    }

    override onInit(): void {
        const wave1$ = this.freq1$.pipe(map((f) => this.sine(f)));
        const wave2$ = this.freq2$.pipe(map((f) => this.sine(f)));
        const wave3$ = this.freq3$.pipe(map((f) => this.sine(f)));

        this.graphSeries = {
            wave1: wave1$,
            wave2: wave2$,
            wave3: wave3$,
            sum: combineLatest([wave1$, wave2$, wave3$]).pipe(
                map(([a, b, c]) => a.map((v, i) => (v + b[i]! + c[i]!) / 3)),
            ),
        };
    }
}`;

@Component({
    selector: 'wave-mixer',
    template: WAVE_MIXER_TEMPLATE,
    styles: WAVE_MIXER_STYLES,
})
export class WaveMixer extends RxElement {
    @state freq1 = 1;
    @state freq2 = 1;
    @state freq3 = 1;
    @state graphConfig = {
        wave1: { label: 'wave 1', color: '#f44' },
        wave2: { label: 'wave 2', color: '#4f4' },
        wave3: { label: 'wave 3', color: '#44f' },
        sum:   { label: 'sum',    color: '#fff', width: 2 },
    };
    @state graphSeries: Record<string, Observable<number[]>> = {};

    private sine(freq: number): number[] {
        const pts: number[] = [];
        for (let i = 0; i < POINTS; i++) {
            pts.push(Math.sin(2 * Math.PI * freq * (i / POINTS)) * 0.5 + 0.5);
        }
        return pts;
    }

    override onInit(): void {
        const wave1$ = this.freq1$.pipe(map((f) => this.sine(f)));
        const wave2$ = this.freq2$.pipe(map((f) => this.sine(f)));
        const wave3$ = this.freq3$.pipe(map((f) => this.sine(f)));

        this.graphSeries = {
            wave1: wave1$,
            wave2: wave2$,
            wave3: wave3$,
            sum: combineLatest([wave1$, wave2$, wave3$]).pipe(
                map(([a, b, c]) => a.map((v, i) => (v + b[i]! + c[i]!) / 3)),
            ),
        };
    }
}

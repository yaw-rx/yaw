import { Component, RxElement, state } from '@yaw-rx/core';
import type { Observable } from 'rxjs';
import './graph.js';

export const SCHEDULER_THEATRE_TEMPLATE = `
    <div class="controls">
        <div class="actions">
            <button onclick="toggle">{{label}}</button>
            <button onclick="clear">clear</button>
            <span class="fps"><span class="dot" [style.background]="dotColor"></span><em>{{fps}}</em> fps</span>
        </div>
        <table class="stats">
            <tr><th>rows</th><th>inserts/frame</th><th>inserts/s</th></tr>
            <tr><td>{{count}}</td><td>{{batch}}</td><td>{{ips}}</td></tr>
        </table>
    </div>
    <div class="graphs">
        <rx-graph [config]="fpsConfig" [series]="fpsSeries"></rx-graph>
        <rx-graph [config]="insertsConfig" [series]="insertsSeries"></rx-graph>
    </div>
    <div class="head">
        <div>#</div>
        <div>timestamp</div>
        <div>random</div>
    </div>
    <div class="scroll">
        <div class="body" #body></div>
        <div class="anchor"></div>
    </div>
`;

export const SCHEDULER_THEATRE_STYLES = `
    :host { display: block; }
    .controls { display: flex; gap: 1rem; align-items: center;
                flex-wrap: wrap; margin-bottom: 1rem; }
    .actions { display: flex; gap: 0.5rem; align-items: center; }
    .fps { display: grid; grid-template-columns: 8px auto auto; gap: 0.4rem;
           align-items: center; font-family: monospace; font-size: 0.85rem; color: #888; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .fps em { color: #8af; font-style: normal; min-width: 3ch; text-align: right; }
    button { background: #111; border: 1px solid #333; color: #fff;
             padding: 0.5rem 1rem; font: inherit; font-size: 0.85rem;
             font-family: monospace; cursor: pointer; border-radius: 6px; }
    button:hover { background: #1a1a1a; border-color: #8af; color: #8af; }
    .stats { border-collapse: collapse; font-family: monospace; font-size: 0.8rem; }
    .stats th { color: #666; font-weight: normal; padding: 0.2rem 0.5rem;
                text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.7rem; }
    .stats td { color: #8af; padding: 0.2rem 0.5rem;
                border-top: 1px solid #1a1a1a; }
    em { color: #8af; font-style: normal; }

    .graphs { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
    .scroll { height: 12rem; overflow-y: auto; overflow-anchor: auto;
              display: flex; flex-direction: column-reverse;
              background: #030303; border: 1px solid #1a1a1a; border-radius: 0 0 8px 8px;
              scrollbar-width: thin; scrollbar-color: #333 #0a0a0a; }
    .scroll::-webkit-scrollbar { width: 10px; }
    .scroll::-webkit-scrollbar-track { background: #0a0a0a; border-radius: 8px; }
    .scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 5px;
                                       border: 2px solid #0a0a0a; }
    .scroll::-webkit-scrollbar-thumb:hover { background: #8af; }
    .anchor { overflow-anchor: auto; height: 1px; }

    .head { display: grid; grid-template-columns: 5ch 12ch 1fr; gap: 0 1.5rem;
            padding: 0.65rem 1rem; background: #0a0a0a; color: #666;
            font-family: monospace; font-size: 0.7rem;
            text-transform: uppercase; letter-spacing: 0.1em;
            border: 1px solid #1a1a1a; border-bottom: none;
            border-radius: 8px 8px 0 0; }
    .body { overflow-anchor: none; width: 100%; }
    .body > .row { display: grid; grid-template-columns: 5ch 12ch 1fr; gap: 0 1.5rem;
                   padding: 0.3rem 1rem; font-family: monospace;
                   font-size: 0.8rem; color: #ccc;
                   border-bottom: 1px solid #0a0a0a; }
    .body > .row:nth-child(odd) { background: #080808; }
    .body > .row > :first-child { color: #8af; }
    .body > .row > :nth-child(3) { color: #666; }
`;

export const SCHEDULER_THEATRE_SOURCE = `const TARGET_FPS = 60;
const KP = 0.4;
const FPS_WINDOW = 30;
const IPS_WINDOW = 10;
const MIN_BATCH = 1;
const INITIAL_BATCH = 16;
const GRAPH_POINTS = 120;
const GRAPH_SAMPLE_MS = 90;

@Component({
    selector: 'scheduler-theatre',
    template: \`${SCHEDULER_THEATRE_TEMPLATE}\`,
    styles: \`${SCHEDULER_THEATRE_STYLES}\`,
})
export class SchedulerTheatre extends RxElement {
    @state count = 0;
    @state batch = 0;
    @state ips = 0;
    @state label = 'flood';
    @state fps = 0;
    @state dotColor = '#555';
    @state fpsPoints: number[] = [];
    @state batchPoints: number[] = [];
    @state ipsPoints: number[] = [];
    @state fpsConfig = { fps: { label: 'fps', color: '#4f4' } };
    @state insertsConfig = {
        batch: { label: 'inserts/frame', color: '#fa4' },
        ips: { label: 'inserts/s', color: '#8af' },
    };
    @state fpsSeries: Record<string, Observable<number[]>> = {};
    @state insertsSeries: Record<string, Observable<number[]>> = {};

    body!: HTMLElement;
    private fpsRaf = 0;
    private fpsLast = 0;
    private insertRaf = 0;
    private graphInterval = 0;
    private running = false;
    private visible = false;
    private seeded = false;
    private current = INITIAL_BATCH;
    private fpsSamples: number[] = [];
    private ipsSamples: number[] = [];
    private lastInsertTick = 0;
    private io: IntersectionObserver | undefined;

    // P controller: measures fps via rAF timing, adjusts batch size
    fpsTick(now: number): void {
        const dt = now - this.fpsLast;
        this.fpsLast = now;
        if (dt > 0) {
            this.fpsSamples.push(dt);
            if (this.fpsSamples.length > FPS_WINDOW) this.fpsSamples.shift();
            const avgDt = this.fpsSamples.reduce((a, b) => a + b, 0)
                        / this.fpsSamples.length;
            this.fps = Math.round(1000 / avgDt);
            if (!this.seeded) {
                this.fpsPoints = new Array(GRAPH_POINTS).fill(this.fps);
                this.fpsPoints$.touch();
                this.seeded = true;
            }
            if (this.running) {
                const error = (this.fps - TARGET_FPS) / TARGET_FPS;
                this.dotColor = error < 0 ? '#f44' : '#4f4';
                this.current = Math.max(MIN_BATCH,
                    Math.round(this.current * (1 + KP * error)));
                this.batch = this.current;
            }
        }
        this.fpsRaf = requestAnimationFrame((t) => this.fpsTick(t));
    }

    override onInit(): void {
        this.fpsSeries = { fps: this.fpsPoints$ };
        this.insertsSeries = { batch: this.batchPoints$, ips: this.ipsPoints$ };
        this.io = new IntersectionObserver(([entry]) => {
            if (entry!.isIntersecting) this.onVisible();
            else this.onHidden();
        });
        this.io.observe(this);
    }

    override onDestroy(): void {
        this.io?.disconnect();
        this.onHidden();
    }

    private onVisible(): void {
        if (this.visible) return;
        this.visible = true;
        this.fpsLast = performance.now();
        this.fpsSamples = [];
        this.fpsRaf = requestAnimationFrame((t) => this.fpsTick(t));
        this.graphInterval = window.setInterval(() => {
            this.fpsPoints.push(this.fps);
            if (this.fpsPoints.length > GRAPH_POINTS) this.fpsPoints.shift();
            this.fpsPoints$.touch();
            this.batchPoints.push(this.batch);
            if (this.batchPoints.length > GRAPH_POINTS) this.batchPoints.shift();
            this.batchPoints$.touch();
            this.ipsPoints.push(this.ips);
            if (this.ipsPoints.length > GRAPH_POINTS) this.ipsPoints.shift();
            this.ipsPoints$.touch();
        }, GRAPH_SAMPLE_MS);
        if (this.running) {
            this.lastInsertTick = performance.now();
            this.insertRaf = requestAnimationFrame(() => this.insertTick());
        }
    }

    private onHidden(): void {
        if (!this.visible) return;
        this.visible = false;
        cancelAnimationFrame(this.fpsRaf);
        clearInterval(this.graphInterval);
        if (this.running) cancelAnimationFrame(this.insertRaf);
    }

    toggle(): void {
        if (this.running) { this.stop(); } else { this.start(); }
    }

    clear(): void {
        this.stop();
        this.body.replaceChildren();
        this.count = 0;
        this.batch = 0;
        this.ips = 0;
    }

    private start(): void {
        this.running = true;
        this.label = 'stop';
        this.current = INITIAL_BATCH;
        this.ipsSamples = [];
        if (this.visible) {
            this.lastInsertTick = performance.now();
            this.insertRaf = requestAnimationFrame(() => this.insertTick());
        }
    }

    private stop(): void {
        cancelAnimationFrame(this.insertRaf);
        this.running = false;
        this.label = 'flood';
        this.dotColor = '#555';
    }

    private insertTick(): void {
        if (!this.running) return;
        const now = performance.now();
        const dt = now - this.lastInsertTick;
        this.lastInsertTick = now;

        const n = this.current;
        const base = this.count;
        let html = '';
        for (let i = 0; i < n; i++) {
            const idx = base + i + 1;
            html += \\\`<div class="row"><div>\\\${idx}</div><div>\\\${now.toFixed(1)}</div><div>\\\${Math.random().toFixed(6)}</div></div>\\\`;
        }
        this.body.insertAdjacentHTML('beforeend', html);
        this.count = base + n;

        if (dt > 0) {
            this.ipsSamples.push(n / (dt / 1000));
            if (this.ipsSamples.length > IPS_WINDOW) this.ipsSamples.shift();
            const avg = this.ipsSamples.reduce((a, b) => a + b, 0)
                      / this.ipsSamples.length;
            this.ips = Math.round(avg);
        }

        this.insertRaf = requestAnimationFrame(() => this.insertTick());
    }
}`;

const TARGET_FPS = 60;
const KP = 0.4;
const FPS_WINDOW = 30;
const IPS_WINDOW = 10;
const MIN_BATCH = 1;
const INITIAL_BATCH = 16;
const GRAPH_POINTS = 120;
const GRAPH_SAMPLE_MS = 90;

@Component({
    selector: 'scheduler-theatre',
    template: SCHEDULER_THEATRE_TEMPLATE,
    styles: SCHEDULER_THEATRE_STYLES,
})
export class SchedulerTheatre extends RxElement {
    @state count = 0;
    @state batch = 0;
    @state ips = 0;
    @state label = 'flood';
    @state fps = 0;
    @state dotColor = '#555';
    @state fpsPoints: number[] = [];
    @state batchPoints: number[] = [];
    @state ipsPoints: number[] = [];
    @state fpsConfig = { fps: { label: 'fps', color: '#4f4' } };
    @state insertsConfig = {
        batch: { label: 'inserts/frame', color: '#fa4' },
        ips: { label: 'inserts/s', color: '#8af' },
    };
    @state fpsSeries: Record<string, Observable<number[]>> = {};
    @state insertsSeries: Record<string, Observable<number[]>> = {};

    body!: HTMLElement;
    private fpsRaf = 0;
    private fpsLast = 0;
    private insertRaf = 0;
    private graphInterval = 0;
    private running = false;
    private visible = false;
    private seeded = false;
    private current = INITIAL_BATCH;
    private fpsSamples: number[] = [];
    private ipsSamples: number[] = [];
    private lastInsertTick = 0;
    private io: IntersectionObserver | undefined;

    fpsTick(now: number): void {
        const dt = now - this.fpsLast;
        this.fpsLast = now;
        if (dt > 0) {
            this.fpsSamples.push(dt);
            if (this.fpsSamples.length > FPS_WINDOW) this.fpsSamples.shift();
            const avgDt = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
            this.fps = Math.round(1000 / avgDt);
            if (!this.seeded) {
                this.fpsPoints = new Array(GRAPH_POINTS).fill(this.fps);
                this.fpsPoints$.touch();
                this.seeded = true;
            }
            if (this.running) {
                const error = (this.fps - TARGET_FPS) / TARGET_FPS;
                this.dotColor = error < 0 ? '#f44' : '#4f4';
                this.current = Math.max(MIN_BATCH, Math.round(this.current * (1 + KP * error)));
                this.batch = this.current;
            }
        }
        this.fpsRaf = requestAnimationFrame((time) => { this.fpsTick(time) });
    }

    override onInit(): void {
        this.fpsSeries = { fps: this.fpsPoints$ };
        this.insertsSeries = { batch: this.batchPoints$, ips: this.ipsPoints$ };
        this.io = new IntersectionObserver(([entry]) => {
            if (entry!.isIntersecting) this.onVisible();
            else this.onHidden();
        });
        this.io.observe(this);
    }

    override onDestroy(): void {
        this.io?.disconnect();
        this.onHidden();
    }

    private onVisible(): void {
        if (this.visible) return;
        this.visible = true;
        console.log('RESUME', this.fpsPoints); // eslint-disable-line no-console
        this.fpsLast = performance.now();
        this.fpsSamples = [];
        this.fpsRaf = requestAnimationFrame((time) => { this.fpsTick(time) });
        this.graphInterval = window.setInterval(() => {
            this.fpsPoints.push(this.fps);
            if (this.fpsPoints.length > GRAPH_POINTS) this.fpsPoints.shift();
            this.fpsPoints$.touch();
            this.batchPoints.push(this.batch);
            if (this.batchPoints.length > GRAPH_POINTS) this.batchPoints.shift();
            this.batchPoints$.touch();
            this.ipsPoints.push(this.ips);
            if (this.ipsPoints.length > GRAPH_POINTS) this.ipsPoints.shift();
            this.ipsPoints$.touch();
        }, GRAPH_SAMPLE_MS);
        if (this.running) {
            this.lastInsertTick = performance.now();
            this.insertRaf = requestAnimationFrame(() => this.insertTick());
        }
    }

    private onHidden(): void {
        if (!this.visible) return;
        this.visible = false;
        console.log('PAUSE'); // eslint-disable-line no-console
        cancelAnimationFrame(this.fpsRaf);
        clearInterval(this.graphInterval);
        if (this.running) cancelAnimationFrame(this.insertRaf);
    }

    toggle(): void {
        if (this.running) {
            this.stop();
        } else {
            this.start();
        }
    }

    clear(): void {
        this.stop();
        this.body.replaceChildren();
        this.count = 0;
        this.batch = 0;
        this.ips = 0;
    }

    private start(): void {
        this.running = true;
        this.label = 'stop';
        this.current = INITIAL_BATCH;
        this.ipsSamples = [];
        if (this.visible) {
            this.lastInsertTick = performance.now();
            this.insertRaf = requestAnimationFrame(() => this.insertTick());
        }
    }

    private stop(): void {
        cancelAnimationFrame(this.insertRaf);
        this.running = false;
        this.label = 'flood';
        this.dotColor = '#555';
    }

    private insertTick(): void {
        if (!this.running) return;
        const now = performance.now();
        const dt = now - this.lastInsertTick;
        this.lastInsertTick = now;

        const n = this.current;
        const base = this.count;
        let html = '';
        for (let i = 0; i < n; i++) {
            const idx = base + i + 1;
            html += `<div class="row"><div>${String(idx)}</div><div>${now.toFixed(1)}</div><div>${Math.random().toFixed(6)}</div></div>`;
        }
        this.body.insertAdjacentHTML('beforeend', html);
        this.count = base + n;

        if (dt > 0) {
            this.ipsSamples.push(n / (dt / 1000));
            if (this.ipsSamples.length > 10) this.ipsSamples.shift();
            const avg = this.ipsSamples.reduce((a, b) => a + b, 0) / this.ipsSamples.length;
            this.ips = Math.round(avg);
        }

        this.insertRaf = requestAnimationFrame(() => this.insertTick());
    }
}

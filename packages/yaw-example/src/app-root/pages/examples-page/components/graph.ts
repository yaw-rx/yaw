import { Component, RxElement, state } from '@yaw-rx/core';
import { Observable, Subscription } from 'rxjs';

export const GRAPH_TEMPLATE = `
    <div class="legend" #legend></div>
    <canvas #canvas></canvas>
`;

export const GRAPH_STYLES = `
    :host { display: block; position: relative; }
    .legend { position: absolute; top: 0.25rem; left: 0.4rem;
              display: flex; flex-direction: column; gap: 0.1rem;
              font-family: monospace; font-size: 0.55rem; color: #888;
              text-transform: uppercase; letter-spacing: 0.06em; pointer-events: none;
              background: rgba(3, 3, 3, 0.75); padding: 0.2rem 0.4rem; border-radius: 4px; }
    .legend span { display: flex; align-items: center; gap: 0.2rem; }
    .legend .dot { display: inline-block; width: 5px; height: 5px; border-radius: 50%; }
    canvas { display: block; width: 100%; height: 6rem; background: #030303;
             border: 1px solid #1a1a1a; border-radius: 8px; }
`;

export const GRAPH_SOURCE = `@Component({
    selector: 'rx-graph',
    template: \`${GRAPH_TEMPLATE}\`,
    styles: \`${GRAPH_STYLES}\`,
})
export class Graph extends RxElement {
    @state config: Record<string, { label: string; color: string; width?: number }> = {};
    @state series: Record<string, Observable<number[]>> = {};

    canvas!: HTMLCanvasElement;
    legend!: HTMLElement;
    private ro: ResizeObserver | undefined;
    private data = new Map<string, number[]>();
    private subs: Subscription[] = [];

    override onRender(): void {
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(this.canvas);
        this.resize();
        this.series$.subscribe((seriesMap) => this.subscribeSeries(seriesMap));
        this.config$.subscribe(() => this.buildLegend());
    }

    override onDestroy(): void {
        this.ro?.disconnect();
        this.subs.forEach(s => s.unsubscribe());
    }

    private subscribeSeries(seriesMap: Record<string, Observable<number[]>>): void {
        this.subs.forEach(s => s.unsubscribe());
        this.subs = [];
        this.data.clear();
        for (const [name, obs$] of Object.entries(seriesMap)) {
            this.subs.push(obs$.subscribe((points) => {
                this.data.set(name, points);
                this.draw();
            }));
        }
    }

    private buildLegend(): void {
        this.legend.innerHTML = Object.entries(this.config)
            .map(([_, { label, color }]) =>
                \`<span><span class="dot" style="background:\${color}"></span>\${label}</span>\`)
            .join('');
    }

    private resize(): void {
        this.canvas.width = this.canvas.clientWidth * devicePixelRatio;
        this.canvas.height = this.canvas.clientHeight * devicePixelRatio;
        this.draw();
    }

    private draw(): void {
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        ctx.clearRect(0, 0, w, h);

        const names = Object.keys(this.config);
        const maxLen = Math.max(0, ...names.map(n => this.data.get(n)?.length ?? 0));
        if (maxLen < 2) return;

        const step = w / (maxLen - 1);

        for (const name of names) {
            const cfg = this.config[name];
            if (!cfg) continue;
            const pts = this.data.get(name) ?? [];
            if (pts.length < 2) continue;

            const pad = maxLen - pts.length;
            const ceil = Math.max(1, ...pts);

            ctx.beginPath();
            for (let i = 0; i < pts.length; i++) {
                const x = (pad + i) * step;
                const y = h - (pts[i]! / ceil) * h;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = cfg.color;
            ctx.lineWidth = (cfg.width ?? 1) * devicePixelRatio;
            ctx.stroke();
        }
    }
}`;

@Component({
    selector: 'rx-graph',
    template: GRAPH_TEMPLATE,
    styles: GRAPH_STYLES,
})
export class Graph extends RxElement {
    @state config: Record<string, { label: string; color: string; width?: number }> = {};
    @state series: Record<string, Observable<number[]>> = {};

    canvas!: HTMLCanvasElement;
    legend!: HTMLElement;
    private ro: ResizeObserver | undefined;
    private data = new Map<string, number[]>();
    private subs: Subscription[] = [];

    override onRender(): void {
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(this.canvas);
        this.resize();
        this.series$.subscribe((seriesMap) => this.subscribeSeries(seriesMap));
        this.config$.subscribe(() => this.buildLegend());
    }

    override onDestroy(): void {
        this.ro?.disconnect();
        this.subs.forEach(s => s.unsubscribe());
    }

    private subscribeSeries(seriesMap: Record<string, Observable<number[]>>): void {
        this.subs.forEach(s => s.unsubscribe());
        this.subs = [];
        this.data.clear();
        for (const [name, obs$] of Object.entries(seriesMap)) {
            this.subs.push(obs$.subscribe((points) => {
                this.data.set(name, points);
                this.draw();
            }));
        }
    }

    private buildLegend(): void {
        this.legend.innerHTML = Object.entries(this.config)
            .map(([_, { label, color }]) =>
                `<span><span class="dot" style="background:${color}"></span>${label}</span>`)
            .join('');
    }

    private resize(): void {
        this.canvas.width = this.canvas.clientWidth * devicePixelRatio;
        this.canvas.height = this.canvas.clientHeight * devicePixelRatio;
        this.draw();
    }

    private draw(): void {
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        ctx.clearRect(0, 0, w, h);

        const names = Object.keys(this.config);
        const maxLen = Math.max(0, ...names.map(n => this.data.get(n)?.length ?? 0));
        if (maxLen < 2) return;

        const step = w / (maxLen - 1);

        for (const name of names) {
            const cfg = this.config[name];
            if (!cfg) continue;
            const pts = this.data.get(name) ?? [];
            if (pts.length < 2) continue;

            const pad = maxLen - pts.length;
            const ceil = Math.max(1, ...pts);

            ctx.beginPath();
            for (let i = 0; i < pts.length; i++) {
                const x = (pad + i) * step;
                const y = h - (pts[i]! / ceil) * h;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = cfg.color;
            ctx.lineWidth = (cfg.width ?? 1) * devicePixelRatio;
            ctx.stroke();
        }
    }
}

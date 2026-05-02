import { Component, RxElement, state } from '@yaw-rx/core';

@Component({
    selector: 'rx-graph',
    template: `
        <span class="label">{{label}}</span>
        <canvas #canvas></canvas>
    `,
    styles: `
        :host { display: block; position: relative; }
        .label { position: absolute; top: 0.3rem; left: 0.5rem;
                 font-family: monospace; font-size: 0.65rem; color: #444;
                 text-transform: uppercase; letter-spacing: 0.08em; pointer-events: none; }
        canvas { display: block; width: 100%; height: 6rem; background: #030303;
                 border: 1px solid #1a1a1a; border-radius: 8px; }
    `,
})
export class Graph extends RxElement {
    @state label = '';
    @state points: number[] = [];
    @state color = '#8af';
    @state maxPoints = 120;

    canvas!: HTMLCanvasElement;
    private ro: ResizeObserver | undefined;

    override onRender(): void {
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(this.canvas);
        this.resize();
        this.points$.subscribe(() => this.draw());
    }

    override onDestroy(): void {
        this.ro?.disconnect();
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

        const pts = this.points;
        if (pts.length < 2) return;

        const step = w / (this.maxPoints - 1);
        const offset = this.maxPoints - pts.length;
        const ceil = Math.max(1, ...pts);

        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
            const x = (offset + i) * step;
            const y = h - (pts[i]! / ceil) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = this.color;
        ctx.lineWidth = devicePixelRatio;
        ctx.stroke();
    }
}

import { Directive } from 'yaw';
import type { RxElementLike } from 'yaw';

const SHADER = /* wgsl */ `

struct Uniforms {
    resolution: vec2f,
    time: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
    let x = f32(i32(vi & 1u)) * 4.0 - 1.0;
    let y = f32(i32(vi >> 1u)) * 4.0 - 1.0;
    return vec4f(x, y, 0.0, 1.0);
}

// ---------- 3-D simplex noise (Ashima Arts / Stefan Gustavson) ----------

fn mod289_3(x: vec3f) -> vec3f { return x - floor(x / 289.0) * 289.0; }
fn mod289_4(x: vec4f) -> vec4f { return x - floor(x / 289.0) * 289.0; }
fn perm4(x: vec4f) -> vec4f { return mod289_4(((x * 34.0) + 10.0) * x); }
fn tis4(r: vec4f) -> vec4f { return 1.79284291400159 - 0.85373472095314 * r; }

fn snoise(v: vec3f) -> f32 {
    let C = vec2f(1.0 / 6.0, 1.0 / 3.0);

    var i = floor(v + dot(v, vec3f(C.y)));
    let x0 = v - i + dot(i, vec3f(C.x));

    let g = step(x0.yzx, x0.xyz);
    let l = 1.0 - g;
    let i1 = min(g, l.zxy);
    let i2 = max(g, l.zxy);

    let x1 = x0 - i1 + C.x;
    let x2 = x0 - i2 + C.y;
    let x3 = x0 - 0.5;

    i = mod289_3(i);
    let p = perm4(perm4(perm4(
        i.z + vec4f(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4f(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4f(0.0, i1.x, i2.x, 1.0));

    let ns = vec3f(0.285714285714, -0.928571428571, 0.142857142857);
    let j = p - 49.0 * floor(p * ns.z * ns.z);

    let gx = floor(j * ns.z) * ns.x + ns.y;
    let gy = floor(j - 7.0 * floor(j * ns.z)) * ns.x + ns.y;
    let h = 1.0 - abs(gx) - abs(gy);

    let b0 = vec4f(gx.xy, gy.xy);
    let b1 = vec4f(gx.zw, gy.zw);

    let s0 = floor(b0) * 2.0 + 1.0;
    let s1 = floor(b1) * 2.0 + 1.0;
    let sh = -step(h, vec4f(0.0));

    let a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    let a1 = b1.xzyw + s1.xzyw * sh.zzww;

    var p0 = vec3f(a0.xy, h.x);
    var p1 = vec3f(a0.zw, h.y);
    var p2 = vec3f(a1.xy, h.z);
    var p3 = vec3f(a1.zw, h.w);

    let norm = tis4(vec4f(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    var m = max(0.5 - vec4f(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), vec4f(0.0));
    m = m * m;
    return 105.0 * dot(m * m, vec4f(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// ---------- fractional Brownian motion ----------

fn fbm(p: vec3f) -> f32 {
    var s = 0.0;
    var a = 0.5;
    var q = p;
    for (var i = 0; i < 4; i++) {
        s += a * snoise(q);
        q *= 2.0;
        a *= 0.5;
    }
    return s;
}

fn ridge(p: vec3f) -> f32 {
    var s = 0.0;
    var a = 0.6;
    var prev = 1.0;
    var q = p;
    for (var i = 0; i < 5; i++) {
        var n = 1.0 - abs(snoise(q));
        n *= n;
        s += n * a * prev;
        prev = n;
        q *= 2.0;
        a *= 0.5;
    }
    return s;
}

// ---------- fragment ----------

@fragment fn fs(@builtin(position) frag: vec4f) -> @location(0) vec4f {
    let uv = frag.xy / u.resolution;
    let aspect = u.resolution.x / u.resolution.y;
    let t = u.time * 0.000355;

    var p = vec3f((uv - 0.5) * vec2f(aspect, 1.0) * 0.22, t);

    // domain warp — two passes for organic filament structure
    let qx = fbm(p + vec3f(0.0, 0.0, 0.0));
    let qy = fbm(p + vec3f(5.2, 1.3, 0.0));

    let rx = fbm(p + vec3f(qx, qy, 0.0) * 4.0 + vec3f(1.7, 9.2, 0.0));
    let ry = fbm(p + vec3f(qx, qy, 0.0) * 4.0 + vec3f(8.3, 2.8, 0.0));

    let filament = ridge(p + vec3f(rx, ry, 0.0) * 3.5);

    let lum = pow(filament, 1.8) * 0.18;
    return vec4f(vec3f(lum), 1.0);
}
`;

@Directive({ selector: '[perlin-bg]' })
export class PerlinBg {
    node!: RxElementLike;
    private device: GPUDevice | undefined;
    private canvas: HTMLCanvasElement | undefined;
    private raf: number | undefined;
    private resizeObserver: ResizeObserver | undefined;

    onInit(): void {
        void this.setup();
    }

    private async setup(): Promise<void> {
        if (!navigator.gpu) return;

        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) return;

            const device = await adapter.requestDevice();
            this.device = device;

            const canvas = document.createElement('canvas');
            canvas.style.cssText = 'width:100%;height:100%;display:block';
            this.node.appendChild(canvas);
            this.canvas = canvas;

            const ctx = canvas.getContext('webgpu');
            if (!ctx) { canvas.remove(); return; }

            const format = navigator.gpu.getPreferredCanvasFormat();
            ctx.configure({ device, format, alphaMode: 'opaque' });

            const module = device.createShaderModule({ code: SHADER });

            const pipeline = device.createRenderPipeline({
                layout: 'auto',
                vertex:   { module, entryPoint: 'vs' },
                fragment: { module, entryPoint: 'fs', targets: [{ format }] },
            });

            const uniformBuf = device.createBuffer({
                size: 16,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });

            const bindGroup = device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [{ binding: 0, resource: { buffer: uniformBuf } }],
            });

            const uData = new Float32Array(4);

            const resize = (): void => {
                const { width: w, height: h } = this.node.getBoundingClientRect();
                const cw = Math.max(1, Math.floor(w));
                const ch = Math.max(1, Math.floor(h));
                if (canvas.width !== cw || canvas.height !== ch) {
                    canvas.width = cw;
                    canvas.height = ch;
                }
            };
            resize();
            this.resizeObserver = new ResizeObserver(resize);
            this.resizeObserver.observe(this.node);

            const t0 = performance.now();

            const frame = (): void => {
                if (!this.canvas) return;
                this.raf = requestAnimationFrame(frame);

                uData[0] = canvas.width;
                uData[1] = canvas.height;
                uData[2] = (performance.now() - t0) / 1000;
                device.queue.writeBuffer(uniformBuf, 0, uData);

                const encoder = device.createCommandEncoder();
                const pass = encoder.beginRenderPass({
                    colorAttachments: [{
                        view: ctx.getCurrentTexture().createView(),
                        loadOp: 'clear' as GPULoadOp,
                        storeOp: 'store' as GPUStoreOp,
                        clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    }],
                });
                pass.setPipeline(pipeline);
                pass.setBindGroup(0, bindGroup);
                pass.draw(3);
                pass.end();
                device.queue.submit([encoder.finish()]);
            };

            this.raf = requestAnimationFrame(frame);
        } catch {
            this.canvas?.remove();
        }
    }

    onDestroy(): void {
        if (this.raf !== undefined) cancelAnimationFrame(this.raf);
        this.resizeObserver?.disconnect();
        this.canvas?.remove();
        this.canvas = undefined;
        this.device?.destroy();
    }
}

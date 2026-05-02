import { Injectable } from '@yaw-rx/core';

@Injectable()
export class AudioEngine {
    private ctx: AudioContext | undefined;

    private context(): AudioContext {
        this.ctx ??= new AudioContext();
        if (this.ctx.state === 'suspended') void this.ctx.resume();
        return this.ctx;
    }

    trigger(voice: string, velocity: number): void {
        const ctx = this.context();
        const t = ctx.currentTime;
        const out = ctx.createGain();
        out.gain.value = Math.max(0, Math.min(1, velocity));
        out.connect(ctx.destination);

        if (voice === 'kik') this.kick(ctx, t, out);
        else if (voice === 'snr') this.snare(ctx, t, out);
        else if (voice === 'hat') this.hat(ctx, t, out, 0.05);
        else if (voice === 'opn') this.hat(ctx, t, out, 0.3);
        else if (voice === 'clp') this.clap(ctx, t, out);
        else if (voice === 'tom') this.tom(ctx, t, out);
        else if (voice === 'rim') this.rim(ctx, t, out);
        else if (voice === 'cow') this.cow(ctx, t, out);
    }

    private kick(ctx: AudioContext, t: number, out: AudioNode): void {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
        g.gain.setValueAtTime(1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.connect(g).connect(out);
        o.start(t); o.stop(t + 0.3);
    }

    private snare(ctx: AudioContext, t: number, out: AudioNode): void {
        const src = ctx.createBufferSource();
        src.buffer = this.noise(ctx, 0.2);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 1500;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.6, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        src.connect(hp).connect(g).connect(out);
        src.start(t); src.stop(t + 0.15);

        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = 180;
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.3, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.connect(og).connect(out);
        o.start(t); o.stop(t + 0.12);
    }

    private hat(ctx: AudioContext, t: number, out: AudioNode, decay: number): void {
        const src = ctx.createBufferSource();
        src.buffer = this.noise(ctx, decay + 0.05);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 7000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + decay);
        src.connect(hp).connect(g).connect(out);
        src.start(t); src.stop(t + decay + 0.05);
    }

    private clap(ctx: AudioContext, t: number, out: AudioNode): void {
        for (const offset of [0, 0.012, 0.024, 0.036]) {
            const src = ctx.createBufferSource();
            src.buffer = this.noise(ctx, 0.05);
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 2;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.4, t + offset);
            g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.06);
            src.connect(bp).connect(g).connect(out);
            src.start(t + offset); src.stop(t + offset + 0.06);
        }
    }

    private tom(ctx: AudioContext, t: number, out: AudioNode): void {
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(120, t);
        o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.8, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.connect(g).connect(out);
        o.start(t); o.stop(t + 0.25);
    }

    private rim(ctx: AudioContext, t: number, out: AudioNode): void {
        const o1 = ctx.createOscillator();
        o1.type = 'square'; o1.frequency.value = 800;
        const o2 = ctx.createOscillator();
        o2.type = 'square'; o2.frequency.value = 1340;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        o1.connect(g); o2.connect(g); g.connect(out);
        o1.start(t); o1.stop(t + 0.07);
        o2.start(t); o2.stop(t + 0.07);
    }

    private cow(ctx: AudioContext, t: number, out: AudioNode): void {
        const o1 = ctx.createOscillator();
        o1.type = 'square'; o1.frequency.value = 540;
        const o2 = ctx.createOscillator();
        o2.type = 'square'; o2.frequency.value = 800;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o1.connect(g); o2.connect(g); g.connect(out);
        o1.start(t); o1.stop(t + 0.12);
        o2.start(t); o2.stop(t + 0.12);
    }

    private noise(ctx: AudioContext, seconds: number): AudioBuffer {
        const rate = ctx.sampleRate;
        const buf = ctx.createBuffer(1, Math.ceil(rate * seconds), rate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        return buf;
    }
}

import { EMPTY, filter, interval, map, Subscription, switchMap, type Observable } from 'rxjs';
import { Component, Inject, RxElement, state } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
import { AudioEngine } from './drum-machine/utils/audio-engine.js';
import { StepTicker } from './drum-machine/utils/step-ticker.js';
import { TrackRow } from './drum-machine/track-row.js';
import { STEPS, VOICES } from './drum-machine/consts.js';
import { defaultPattern } from './drum-machine/utils/default-pattern.js';
import { emptyPattern } from './drum-machine/utils/empty-pattern.js';
import type { TrackSeed } from './drum-machine/types.js';

@Component({
    selector: 'drum-machine',
    directives: [RxFor],
    providers: [AudioEngine, StepTicker],
    template: `
        <div class="transport">
            <button class="play" onclick="togglePlay" [class.on]="playing">
                <span class="play-icon">{{playLabel}}</span>
            </button>
            <div class="meter">
                <div class="label">TEMPO</div>
                <div class="tempo-row">
                    <input type="range" min="60" max="200"
                           [value]="tempo" oninput="onTempo($event)">
                    <div class="bpm">{{tempo}} <em>BPM</em></div>
                </div>
            </div>
            <div class="actions">
                <button onclick="randomize">RAND</button>
                <button onclick="clearAll">CLR</button>
            </div>
        </div>
        <div class="rows" rx-for="trackSeeds by key">
            <track-row></track-row>
        </div>
    `,
    styles: `
        :host { display: block; background: linear-gradient(180deg, var(--bg-1) 0%, #090909 100%);
                border: 1px solid var(--bg-5); border-radius: 10px;
                padding: 1.25rem 1.5rem 1.5rem;
                box-shadow: inset 0 0 60px rgba(136, 170, 255, 0.04); }

        .transport { display: grid;
                     grid-template-columns: auto 1fr auto;
                     gap: 1.25rem; align-items: center;
                     margin-bottom: 1.25rem;
                     padding-bottom: 1rem;
                     border-bottom: 1px solid #141414; }

        .play { width: 3.25rem; height: 3.25rem;
                background: var(--bg-2); border: 1px solid var(--bg-6);
                border-radius: 50%; cursor: pointer; color: var(--accent);
                display: flex; align-items: center; justify-content: center;
                font-size: 1.25rem; font-family: monospace;
                transition: all 0.1s ease; }
        .play:hover { border-color: var(--accent); color: var(--white); }
        .play.on { background: var(--accent); color: var(--black); border-color: var(--accent);
                   box-shadow: 0 0 20px rgba(136, 170, 255, 0.6); }

        .meter { grid-column: 2; grid-row: 1; min-width: 0; }
        .label { color: var(--muted); font-family: monospace; font-size: 0.7rem;
                 letter-spacing: 0.15em; margin-bottom: 0.35rem; }
        .tempo-row { display: flex; align-items: center; gap: 0.75rem;
                     min-width: 0; }
        .tempo-row input[type=range] {
            flex: 1; min-width: 0; accent-color: var(--accent);
            background: transparent;
        }
        .bpm { color: var(--accent); font-family: monospace; font-size: 0.95rem;
               font-weight: 700; min-width: 4.5rem; text-align: right;
               letter-spacing: 0.04em;
               text-shadow: 0 0 10px rgba(136, 170, 255, 0.4); }
        .bpm em { color: var(--dim); font-size: 0.7rem; font-style: normal;
                  letter-spacing: 0.1em; margin-left: 0.2rem; }

        .actions { grid-column: 3; grid-row: 1;
                   display: flex; gap: 0.4rem; }
        .actions button { background: transparent; border: 1px solid var(--bg-6);
                          color: var(--secondary); font: inherit; font-family: monospace;
                          font-size: 0.7rem; font-weight: 700;
                          padding: 0.45rem 0.7rem; cursor: pointer;
                          border-radius: 4px; letter-spacing: 0.12em; }
        .actions button:hover { border-color: var(--accent); color: var(--accent);
                                box-shadow: 0 0 12px rgba(136, 170, 255, 0.3); }

        .rows { display: flex; flex-direction: column; }
    `,
})
export class DrumMachine extends RxElement {
    @state tempo = 120;
    @state playing = false;
    @state pattern: Record<string, readonly boolean[]> = {};

    @Inject(AudioEngine) private readonly engine!: AudioEngine;
    @Inject(StepTicker) private readonly ticker!: StepTicker;

    private currentStep = -1;
    private tempoSub: Subscription | undefined;

    override onInit(): void {
        const initial: Record<string, readonly boolean[]> = {};
        for (const v of VOICES) initial[v.key] = defaultPattern(v.key);
        this.pattern = initial;

        // 10ms poll derives step position from a fractional phase accumulator.
        // Tempo is read live each tick — changing it adjusts the rate, not the position.
        const TICK = 10;
        this.tempoSub = this.playing$.pipe(
            switchMap((playing: boolean) => {
                if (!playing) return EMPTY;
                let prev = performance.now();
                let phase = 0;
                let last = -1;
                return interval(TICK).pipe(
                    map(() => {
                        const now = performance.now();
                        // fraction of one step elapsed since last tick
                        phase += (now - prev) / (60_000 / this.tempo / 4);
                        prev = now;
                        // integer part = absolute step count, mod 16 = sequencer position
                        const step = Math.floor(phase) % STEPS;
                        if (step === last) return -1;
                        last = step;
                        return step;
                    }),
                    filter((step: number) => step >= 0),
                );
            }),
        ).subscribe((step) => this.playStep(step));
    }

    override onDestroy(): void {
        this.stopLoop();
        this.tempoSub?.unsubscribe();
    }

    get playLabel$(): Observable<string> {
        return this.playing$.pipe(map((p) => p ? '\u25A0' : '\u25B6'));
    }

    get trackSeeds$(): Observable<readonly TrackSeed[]> {
        return this.pattern$.pipe(
            map((pattern) => VOICES.map((v) => ({
                key: v.key,
                trackKey: v.key,
                name: v.name,
                voice: v.key,
                accent: v.accent,
                steps: pattern[v.key] ?? defaultPattern(v.key),
            })))
        );
    }

    onTempo(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.tempo = Number(input.value);
    }

    togglePlay(): void {
        this.playing = !this.playing;
        if (!this.playing) {
            this.currentStep = -1;
            this.ticker.set(-1);
        }
    }

    private stopLoop(): void {
        this.playing = false;
        this.currentStep = -1;
        this.ticker.set(-1);
    }

    private playStep(step: number): void {
        this.currentStep = step;
        this.ticker.set(step);
        const rows = this.querySelectorAll('track-row');
        for (const el of Array.from(rows)) {
            const row = el as TrackRow;
            if (row.muted) continue;
            const lit = row.steps[step];
            if (!lit) continue;
            this.engine.trigger(row.voice, 0.9);
        }
    }

    toggleStep(trackKey: string, idx: number): void {
        const current = this.pattern[trackKey] ?? defaultPattern(trackKey);
        const next = current.map((on, i) => i === idx ? !on : on);
        this.pattern = { ...this.pattern, [trackKey]: next };
    }

    clearTrack(trackKey: string): void {
        this.pattern = { ...this.pattern, [trackKey]: emptyPattern() };
    }

    clearAll(): void {
        const cleared: Record<string, readonly boolean[]> = {};
        for (const v of VOICES) cleared[v.key] = emptyPattern();
        this.pattern = cleared;
    }

    randomize(): void {
        const randomized: Record<string, readonly boolean[]> = {};
        for (const v of VOICES) {
            const density = v.key === 'hat' ? 0.55 : v.key === 'kik' ? 0.3 : 0.22;
            randomized[v.key] = Array.from({ length: STEPS }, () => Math.random() < density);
        }
        this.pattern = randomized;
    }
}

import { Component, RxElement, state } from '@yaw-rx/core';
import { map, type Observable } from 'rxjs';

interface Settings {
    theme: string;
    fontSize: number;
}

@Component({
    selector: 'touch-demo',
    template: `
        <div class="preview" [style.background]="bg" [style.color]="fg" [style.font-size]="fs">
            {{summary}}
        </div>
        <div class="controls">
            <button onclick="toggleTheme">toggle theme</button>
            <button onclick="bumpFont">+ font size</button>
        </div>
    `,
    styles: `
        :host { display: block; width: 100%; }
        .preview { padding: 1rem; border-radius: var(--radius-sm); font-family: var(--font-mono);
                   transition: background 0.2s, color 0.2s, font-size 0.2s; }
        .controls { display: flex; align-items: center; justify-content: center;
                    gap: 0.5rem; margin-top: 0.75rem; }
        button { background: var(--bg-3); border: var(--border-width) solid var(--border); color: var(--white);
                 padding: 0.4rem 0.8rem; font: inherit; font-family: var(--font-mono);
                 font-size: 0.8rem; cursor: pointer; border-radius: var(--radius-sm); }
        button:hover { border-color: var(--accent); color: var(--accent); }
    `,
})
export class TouchDemo extends RxElement {
    @state settings: Settings = { theme: 'dark', fontSize: 14 };

    get summary(): Observable<string> {
        return this.settings$.pipe(
            map((s) => `${s.theme} / ${s.fontSize}px`),
        );
    }

    get bg(): Observable<string> {
        return this.settings$.pipe(map((s) => s.theme === 'dark' ? '#111' : '#eee'));
    }

    get fg(): Observable<string> {
        return this.settings$.pipe(map((s) => s.theme === 'dark' ? '#ccc' : '#111'));
    }

    get fs(): Observable<string> {
        return this.settings$.pipe(map((s) => `${s.fontSize}px`));
    }

    toggleTheme(): void {
        this.settings.theme = this.settings.theme === 'dark' ? 'light' : 'dark';
        this.settings$.touch();
    }

    bumpFont(): void {
        this.settings.fontSize += 1;
        this.settings$.touch();
    }
}

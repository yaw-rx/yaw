import { Component, RxElement, state } from '@yaw-rx/core';
import { map, type Observable } from 'rxjs';

interface Settings {
    theme: string;
    fontSize: number;
}

@Component({
    selector: 'touch-demo',
    template: `
        <code class="value">{{summary}}</code>
        <button onclick="toggleTheme">toggle theme</button>
        <button onclick="bumpFont">+ font size</button>
    `,
})
export class TouchDemo extends RxElement {
    @state settings: Settings = { theme: 'dark', fontSize: 14 };

    get summary(): Observable<string> {
        return this.settings$.pipe(
            map((s) => `${s.theme} / ${s.fontSize}px`),
        );
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

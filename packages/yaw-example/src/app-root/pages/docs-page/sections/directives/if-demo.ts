import { map, type Observable } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';
import { RxIf } from '@yaw-rx/core/directives/rx-if';

@Component({
    selector: 'if-demo',
    directives: [RxIf],
    template: `
        <button onclick="toggle">{{label}}</button>
        <div rx-if="isLoggedIn">
            <p>Welcome back, Jonathan</p>
        </div>
    `,
    styles: `
        :host { display: block; min-height: 5rem; width: 100%; }
        button { background: var(--bg-3); border: 1px solid var(--border); color: var(--white);
                 padding: 0.5rem 1rem; font: inherit; font-size: 0.85rem;
                 font-family: monospace; cursor: pointer; border-radius: 6px;
                 min-width: 6rem; }
        button:hover { background: var(--bg-5); border-color: var(--accent); color: var(--accent); }
        p { color: var(--accent); font-family: monospace; font-size: 1rem; margin: 0.75rem 0 0; }
    `,
})
export class IfDemo extends RxElement {
    @state isLoggedIn = false;

    toggle(): void {
        this.isLoggedIn = !this.isLoggedIn;
    }

    get label$(): Observable<string> {
        return this.isLoggedIn$.pipe(map((v) => v ? 'logout' : 'login'));
    }
}

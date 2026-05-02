import { of, type Observable } from 'rxjs';
import { Component, RxElement } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';

interface Cell {
    readonly key: string;
    readonly textContent: string;
}

@Component({
    selector: 'for-demo',
    directives: [RxFor],
    template: `
        <div class="row" rx-for="cells by key">
            <span class="cell"></span>
        </div>
    `,
    styles: `
        :host { display: block; }
        .row { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .cell { padding: 0.5rem 0.9rem; background: #050505;
                border: 1px solid #1a1a1a; border-radius: 4px;
                color: #8af; font-family: monospace; font-size: 0.9rem; }
    `,
})
export class ForDemo extends RxElement {
    get cells$(): Observable<readonly Cell[]> {
        return of([
            { key: 'a', textContent: 'alpha'   },
            { key: 'b', textContent: 'bravo'   },
            { key: 'c', textContent: 'charlie' },
        ]);
    }
}

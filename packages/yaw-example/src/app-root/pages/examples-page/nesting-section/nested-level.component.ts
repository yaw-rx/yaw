import { Component, RxElement } from '@yaw-rx/core';

@Component({
    selector: 'nested-level',
    template: `
        <div class="nested">
            <div class="tag">nested scope</div>
            <div class="content"><slot></slot></div>
        </div>
    `,
    styles: `
        :host { display: block; }
        .nested { border: 1px dashed var(--border); border-radius: var(--radius);
                  padding: 0.5rem 0.75rem 0.6rem; margin: 0.3rem 0; background: #070707; }
        .tag { color: var(--dim); font-size: 0.65rem; letter-spacing: var(--tracking);
               text-transform: uppercase; margin-bottom: 0.4rem; }
        .content { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
    `
})
export class NestedLevel extends RxElement {}

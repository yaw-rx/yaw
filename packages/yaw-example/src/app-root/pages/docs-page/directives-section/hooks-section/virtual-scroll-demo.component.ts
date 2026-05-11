import { Component, RxElement } from '@yaw-rx/core';
import { VirtualScroll } from './virtual-scroll.directive.js';

interface Row { name: string; role: string; status: string }

const ROLES = ['engineer', 'designer', 'analyst', 'manager', 'intern'];
const STATUSES = ['active', 'idle', 'away'];

const generateRows = (count: number): Row[] => {
    const rows: Row[] = new Array(count);
    for (let i = 0; i < count; i++) {
        rows[i] = {
            name: `User ${i}`,
            role: ROLES[i % ROLES.length]!,
            status: STATUSES[i % STATUSES.length]!,
        };
    }
    return rows;
};

@Component({
    selector: 'virtual-scroll-demo',
    directives: [VirtualScroll],
    template: `
        <div class="container" virtual-scroll="row, i of rows; 36">
            <div class="row">
                <span class="idx">{{i}}</span>
                <span class="name">{{row.name}}</span>
                <span class="role">{{row.role}}</span>
                <span class="status">{{row.status}}</span>
            </div>
        </div>
    `,
    styles: `
        :host { display: block; width: 100%; }
        .container { height: 252px; width: 100%; border: var(--border-width) solid var(--border); border-radius: var(--radius); }
        .row { display: flex; align-items: center; gap: 0.75rem; padding: 0 0.75rem;
               font-family: var(--font-mono); font-size: 0.8rem; color: var(--text);
               border-bottom: 1px solid var(--bg-3); box-sizing: border-box;
               white-space: nowrap; overflow: hidden; }
        .idx { width: 2.5rem; color: var(--text-2); text-align: right; flex-shrink: 0; }
        .name { flex: 1; overflow: hidden; text-overflow: ellipsis; }
        .role { width: 4.5rem; color: var(--text-2); flex-shrink: 0; }
        .status { width: 3rem; color: var(--accent); flex-shrink: 0; }
    `,
})
export class VirtualScrollDemo extends RxElement {
    rows = generateRows(1000);
}

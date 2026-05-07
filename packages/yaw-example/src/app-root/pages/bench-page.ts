import { Component, RxElement, state } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
import { css, html } from '@yaw-rx/common/tags';

const ADJECTIVES = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap', 'expensive', 'fancy'];
const COLOURS = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'white', 'black', 'orange'];
const NOUNS = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger', 'pizza', 'mouse', 'keyboard'];

const pick = (list: string[]) => list[(Math.random() * list.length) | 0]!;

let nextId = 1;

interface Row {
    id: number;
    label: string;
    selected: boolean;
}

const buildRows = (count: number): Row[] => {
    const rows: Row[] = new Array(count);
    for (let i = 0; i < count; i++) {
        rows[i] = { id: nextId++, label: `${pick(ADJECTIVES)} ${pick(COLOURS)} ${pick(NOUNS)}`, selected: false };
    }
    return rows;
};

const TEMPLATE = html`
    <p class="bench-link"><a href="https://krausest.github.io/js-framework-benchmark/current.html" target="_blank" rel="noopener">JS Framework Benchmark — Official Results</a></p>
    <div class="controls">
        <div class="row">
            <button id="run" onclick="run">Create 1,000 rows</button>
            <button id="runlots" onclick="runLots">Create 10,000 rows</button>
        </div>
        <div class="row">
            <button id="add" onclick="add">Append 1,000 rows</button>
            <button id="update" onclick="update">Update every 10th row</button>
        </div>
        <div class="row">
            <button id="clear" onclick="clear">Clear</button>
            <button id="swaprows" onclick="swapRows">Swap Rows</button>
        </div>
    </div>
    <table class="bench-table">
        <tbody rx-for="row of rows by id">
            <tr [class.danger]="row.selected">
                <td class="col-md-1">{{row.id}}</td>
                <td class="col-md-4"><a onclick="select" data-action="select">{{row.label}}</a></td>
                <td class="col-md-1"><a onclick="del" data-action="delete"><span class="remove-icon" aria-hidden="true">x</span></a></td>
                <td class="col-md-6"></td>
            </tr>
        </tbody>
    </table>
    <span class="preloadicon" aria-hidden="true"></span>
`;

const STYLES = css`
    :host { display: block; background: var(--black); min-height: 100vh;
            padding: 6rem 1.25rem 2rem; color: var(--text); box-sizing: border-box; }
    .bench-link { max-width: 1200px; margin: 0 auto 1rem; font-family: var(--font-mono); font-size: 0.85rem; }
    .bench-link a { color: var(--accent); text-decoration: none; }
    .bench-link a:hover { text-decoration: underline; }
    .controls { max-width: 1200px; margin: 0 auto 1.5rem; }
    .controls .row { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
    button { background: var(--bg-3); border: var(--border-width) solid var(--border); color: var(--white);
             padding: 0.5rem 1.5rem; font: inherit; font-size: 0.85rem; flex: 1;
             font-family: var(--font-mono); cursor: pointer; border-radius: var(--radius); }
    button:hover { background: var(--bg-5); border-color: var(--accent); color: var(--accent); }
    .bench-table { width: 100%; max-width: 1200px; margin: 0 auto; border-collapse: collapse;
                   font-family: var(--font-mono); font-size: 0.8rem; }
    .bench-table td { padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--bg-2); }
    .bench-table .col-md-1 { width: 8%; color: var(--muted); }
    .bench-table .col-md-4 { width: 33%; }
    .bench-table .col-md-4 a { cursor: pointer; color: var(--secondary); text-decoration: none; }
    .bench-table .col-md-4 a:hover { text-decoration: underline; }
    .bench-table .col-md-6 { width: 50%; }
    .bench-table tr.danger { background: var(--bg-5); }
    .bench-table tr.danger .col-md-4 a { color: var(--accent); }
    .remove-icon { cursor: pointer; color: var(--muted); font-size: 0.9rem; }
    .remove-icon:hover { color: var(--accent); }
    .preloadicon { display: none; }
`;

@Component({
    selector: 'bench-page',
    directives: [RxFor],
    template: TEMPLATE,
    styles: STYLES,
})
export class BenchPage extends RxElement {
    @state rows: Row[] = [];

    private selectedIdx = -1;

    run(): void {
        this.rows = buildRows(1_000);
        this.selectedIdx = -1;
    }

    runLots(): void {
        this.rows = buildRows(10_000);
        this.selectedIdx = -1;
    }

    add(): void {
        this.rows.push(...buildRows(1_000));
        this.rows$.touch();
    }

    update(): void {
        for (let i = 0; i < this.rows.length; i += 10) {
            this.rows[i]!.label += ' !!!';
        }
        this.rows$.touch();
    }

    clear(): void {
        this.rows = [];
        this.selectedIdx = -1;
    }

    swapRows(): void {
        if (this.rows.length > 998) {
            const tmp = this.rows[1]!;
            this.rows[1] = this.rows[998]!;
            this.rows[998] = tmp;
            this.rows$.touch();
        }
    }

    select(e: Event): void {
        const tr = (e.target as Element).closest('tr');
        if (!tr) return;
        const key = tr.closest('[data-rx-key]')?.getAttribute('data-rx-key');
        if (!key) return;
        const idx = this.rows.findIndex(r => String(r.id) === key);
        if (idx === -1) return;

        if (this.selectedIdx >= 0 && this.selectedIdx < this.rows.length) {
            this.rows[this.selectedIdx]!.selected = false;
        }
        this.selectedIdx = idx;
        this.rows[idx]!.selected = true;
        this.rows$.touch();
    }

    del(e: Event): void {
        const tr = (e.target as Element).closest('tr');
        if (!tr) return;
        const key = tr.closest('[data-rx-key]')?.getAttribute('data-rx-key');
        if (!key) return;
        const idx = this.rows.findIndex(r => String(r.id) === key);
        if (idx === -1) return;

        this.rows.splice(idx, 1);
        if (this.selectedIdx === idx) this.selectedIdx = -1;
        else if (this.selectedIdx > idx) this.selectedIdx--;
        this.rows$.touch();
    }
}

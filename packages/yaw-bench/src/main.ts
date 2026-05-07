import { Component, RxElement, state } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
import { bootstrap } from '@yaw-rx/core';

const adjectives = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap', 'expensive', 'fancy'];
const colours = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black', 'orange'];
const nouns = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger', 'pizza', 'mouse', 'keyboard'];

const pick = (list: string[]) => list[Math.round(Math.random() * 1000) % list.length]!;
const label = () => `${pick(adjectives)} ${pick(colours)} ${pick(nouns)}`;

let nextId = 1;

interface Row {
    id: number;
    label: string;
    selected: boolean;
}

const buildRows = (count: number): Row[] => {
    const rows: Row[] = new Array(count);
    for (let i = 0; i < count; i++) {
        rows[i] = { id: nextId++, label: label(), selected: false };
    }
    return rows;
};

@Component({
    selector: 'bench-root',
    directives: [RxFor],
    template: `
        <div id="main">
            <div class="container">
                <div class="jumbotron">
                    <div class="row">
                        <div class="col-md-6">
                            <h1>YAW-"keyed"</h1>
                        </div>
                        <div class="col-md-6">
                            <div class="row">
                                <div class="col-sm-6 smallpad">
                                    <button type="button" class="btn btn-primary btn-block" id="run" onclick="run">Create 1,000 rows</button>
                                </div>
                                <div class="col-sm-6 smallpad">
                                    <button type="button" class="btn btn-primary btn-block" id="runlots" onclick="runLots">Create 10,000 rows</button>
                                </div>
                                <div class="col-sm-6 smallpad">
                                    <button type="button" class="btn btn-primary btn-block" id="add" onclick="add">Append 1,000 rows</button>
                                </div>
                                <div class="col-sm-6 smallpad">
                                    <button type="button" class="btn btn-primary btn-block" id="update" onclick="update">Update every 10th row</button>
                                </div>
                                <div class="col-sm-6 smallpad">
                                    <button type="button" class="btn btn-primary btn-block" id="clear" onclick="clear">Clear</button>
                                </div>
                                <div class="col-sm-6 smallpad">
                                    <button type="button" class="btn btn-primary btn-block" id="swaprows" onclick="swapRows">Swap Rows</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <table class="table table-hover table-striped test-data">
                    <tbody id="tbody" rx-for="row of rows by id">
                        <tr [class.danger]="row.selected">
                            <td class="col-md-1">{{row.id}}</td>
                            <td class="col-md-4"><a onclick="select">{{row.label}}</a></td>
                            <td class="col-md-1"><a onclick="del"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></td>
                            <td class="col-md-6"></td>
                        </tr>
                    </tbody>
                </table>
                <span class="preloadicon glyphicon glyphicon-remove" aria-hidden="true"></span>
            </div>
        </div>
    `,
    styles: ``,
})
class BenchRoot extends RxElement {
    @state rows: Row[] = [];

    private selectedIdx = -1;

    run(): void {
        const t = performance.now();
        this.rows = buildRows(1_000);
        this.selectedIdx = -1;
        console.log('run: done', (performance.now() - t).toFixed(1) + 'ms');
    }

    runLots(): void {
        const t = performance.now();
        this.rows = buildRows(10_000);
        this.selectedIdx = -1;
        console.log('runLots: done', (performance.now() - t).toFixed(1) + 'ms');
    }

    add(): void {
        const t = performance.now();
        this.rows.push(...buildRows(1_000));
        this.rows$.touch();
        console.log('add: done', (performance.now() - t).toFixed(1) + 'ms');
    }

    update(): void {
        const t = performance.now();
        for (let i = 0; i < this.rows.length; i += 10) {
            this.rows[i]!.label += ' !!!';
        }
        this.rows$.touch();
        console.log('update: done', (performance.now() - t).toFixed(1) + 'ms');
    }

    clear(): void {
        const t = performance.now();
        this.rows = [];
        this.selectedIdx = -1;
        console.log('clear: done', (performance.now() - t).toFixed(1) + 'ms');
    }

    swapRows(): void {
        const t = performance.now();
        if (this.rows.length > 998) {
            const tmp = this.rows[1]!;
            this.rows[1] = this.rows[998]!;
            this.rows[998] = tmp;
            this.rows$.touch();
        }
        console.log('swap: done', (performance.now() - t).toFixed(1) + 'ms');
    }

    select(e: Event): void {
        const itemEl = (e.target as Element).closest('[data-rx-key]');
        if (!itemEl) return;
        const id = Number(itemEl.getAttribute('data-rx-key'));
        const idx = this.rows.findIndex(r => r.id === id);
        if (idx === -1) return;
        const t = performance.now();
        if (this.selectedIdx >= 0) this.rows[this.selectedIdx]!.selected = false;
        this.selectedIdx = idx;
        this.rows[idx]!.selected = true;
        this.rows$.touch();
        console.log('select: done', (performance.now() - t).toFixed(1) + 'ms');
    }

    del(e: Event): void {
        const itemEl = (e.target as Element).closest('[data-rx-key]');
        if (!itemEl) return;
        const id = Number(itemEl.getAttribute('data-rx-key'));
        const idx = this.rows.findIndex(r => r.id === id);
        if (idx === -1) return;
        const t = performance.now();
        this.rows.splice(idx, 1);
        if (this.selectedIdx === idx) this.selectedIdx = -1;
        else if (this.selectedIdx > idx) this.selectedIdx--;
        this.rows$.touch();
        console.log('delete: done', (performance.now() - t).toFixed(1) + 'ms');
    }
}

await bootstrap({ root: BenchRoot, providers: [] });

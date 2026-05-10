import { Component, RxElement, state } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
import './bench-row.component.js';
import type { BenchRow } from './bench-row.component.js';

const adjectives = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap', 'expensive', 'fancy'];
const colours = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black', 'orange'];
const nouns = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger', 'pizza', 'mouse', 'keyboard'];

const pick = (list: string[]) => list[Math.round(Math.random() * 1000) % list.length]!;

let nextId = 1;

interface Row {
    rowId: number;
    label: string;
}

const buildRows = (count: number): Row[] => {
    const rows: Row[] = new Array(count);
    for (let i = 0; i < count; i++) {
        rows[i] = { rowId: nextId++, label: `${pick(adjectives)} ${pick(colours)} ${pick(nouns)}` };
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
                <div class="table table-hover table-striped test-data" rx-for="row of rows by rowId">
                    <bench-row [rowId]="row.rowId" [label]="row.label"></bench-row>
                </div>
                <span class="preloadicon glyphicon glyphicon-remove" aria-hidden="true"></span>
            </div>
        </div>
    `,
    styles: ``,
})
export class BenchPage extends RxElement {
    @state rows: Row[] = [];

    private selectedRow: BenchRow | null = null;

    run(): void {
        const t0 = performance.now();
        this.rows = buildRows(1_000);
        this.selectedRow = null;
        requestAnimationFrame(() => {
            const t1 = performance.now();
            console.log(`[in-page] run → first rAF: ${(t1 - t0).toFixed(2)}ms`);
        });
    }

    runLots(): void {
        this.rows = buildRows(10_000);
        this.selectedRow = null;
    }

    add(): void {
        this.rows = this.rows.concat(buildRows(1_000));
    }

    update(): void {
        const rows = this.querySelectorAll<BenchRow>('bench-row');
        for (let i = 0; i < rows.length; i += 10) {
            rows[i]!.label += ' !!!';
        }
    }

    clear(): void {
        this.rows = [];
        this.selectedRow = null;
    }

    swapRows(): void {
        if (this.rows.length > 998) {
            const tmp = this.rows[1]!;
            this.rows[1] = this.rows[998]!;
            this.rows[998] = tmp;
            this.rows$.touch();
        }
    }

    select(row: BenchRow): void {
        if (this.selectedRow !== null) {
            this.selectedRow.deselect();
        }
        this.selectedRow = row;
    }

    del(row: BenchRow): void {
        const id = row.rowId;
        const idx = this.rows.findIndex(r => r.rowId === id);
        if (idx === -1) return;
        this.rows.splice(idx, 1);
        if (this.selectedRow === row) this.selectedRow = null;
        this.rows$.touch();
    }
}

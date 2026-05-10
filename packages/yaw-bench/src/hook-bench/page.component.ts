import { Component, RxElement, state } from '@yaw-rx/core';
import { Repeat } from './repeat.directive.js';
import './row.component.js';

const adjectives = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap', 'expensive', 'fancy'];
const colours = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black', 'orange'];
const nouns = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger', 'pizza', 'mouse', 'keyboard'];

const pick = (list: string[]) => list[Math.round(Math.random() * 1000) % list.length]!;

let nextId = 1;

interface Row {
    id: number;
    label: string;
}

const buildRows = (count: number): Row[] => {
    const rows: Row[] = new Array(count);
    for (let i = 0; i < count; i++) {
        rows[i] = { id: nextId++, label: `${pick(adjectives)} ${pick(colours)} ${pick(nouns)}` };
    }
    return rows;
};

@Component({
    selector: 'hook-bench-page',
    directives: [Repeat],
    template: `
        <div id="main">
            <div class="container">
                <div class="jumbotron">
                    <div class="row">
                        <div class="col-md-6">
                            <h1>Hook Bench</h1>
                        </div>
                        <div class="col-md-6">
                            <div class="row">
                                <div class="col-sm-6 smallpad">
                                    <button type="button" class="btn btn-primary btn-block" onclick="create1k">Create 1,000 rows</button>
                                </div>
                                <div class="col-sm-6 smallpad">
                                    <button type="button" class="btn btn-primary btn-block" onclick="create10k">Create 10,000 rows</button>
                                </div>
                                <div class="col-sm-6 smallpad">
                                    <button type="button" class="btn btn-primary btn-block" onclick="append1k">Append 1,000 rows</button>
                                </div>
                                <div class="col-sm-6 smallpad">
                                    <button type="button" class="btn btn-primary btn-block" onclick="update10th">Update every 10th row</button>
                                </div>
                                <div class="col-sm-6 smallpad">
                                    <button type="button" class="btn btn-primary btn-block" onclick="clear">Clear</button>
                                </div>
                                <div class="col-sm-6 smallpad">
                                    <button type="button" class="btn btn-primary btn-block" onclick="swap">Swap Rows</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="table table-hover table-striped test-data" repeat="row of rows by id">
                    <hb-row [id]="row.id" [label]="row.label"></hb-row>
                </div>
            </div>
        </div>
    `,
    styles: ``,
})
export class HookBenchPage extends RxElement {
    @state rows: Row[] = [];

    create1k(): void { this.rows = buildRows(1_000); }
    create10k(): void { this.rows = buildRows(10_000); }
    append1k(): void { this.rows = this.rows.concat(buildRows(1_000)); }

    update10th(): void {
        const rows = this.querySelectorAll<RxElement>('hb-row');
        for (let i = 0; i < rows.length; i += 10) {
            (rows[i]! as any).label += ' !!!';
        }
    }

    clear(): void { this.rows = []; }

    swap(): void {
        if (this.rows.length > 998) {
            const tmp = this.rows[1]!;
            this.rows[1] = this.rows[998]!;
            this.rows[998] = tmp;
            this.rows$.touch();
        }
    }
}

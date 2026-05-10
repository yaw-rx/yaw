import { Component, RxElement, state } from '@yaw-rx/core';

@Component({
    selector: 'bench-row',
    template: `
        <div class="col-md-1">{{rowId}}</div>
        <div class="col-md-4"><a onclick="onSelect">{{label}}</a></div>
        <div class="col-md-1"><a onclick="onDel"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></div>
        <div class="col-md-6"></div>
    `,
    styles: `
        :host { display: contents; }
    `,
})
export class BenchRow extends RxElement {
    @state rowId = 0;
    @state label = '';

    onSelect(): void {
        this.classList.add('danger');
        (this.hostNode as { select(row: BenchRow): void }).select(this);
    }

    deselect(): void {
        this.classList.remove('danger');
    }

    onDel(): void {
        (this.hostNode as { del(row: BenchRow): void }).del(this);
    }
}

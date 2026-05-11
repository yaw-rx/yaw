import { Component, RxElement } from '@yaw-rx/core';

@Component({
    selector: 'bench-row',
    template: `
        <div #idEl></div>
        <div><a onclick="onSelect" #labelEl></a></div>
        <div><a onclick="onDel"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></div>
        <div></div>
    `,
    styles: `
        :host { display: flex; }
    `,
})
export class BenchRow extends RxElement {
    rowId = 0;
    label = '';

    declare idEl: HTMLDivElement;
    declare labelEl: HTMLAnchorElement;

    override onRender(): void {
        this.idEl.textContent = String(this.rowId);
        this.labelEl.textContent = this.label;
    }

    refresh(): void {
        this.idEl.textContent = String(this.rowId);
        this.labelEl.textContent = this.label;
    }

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

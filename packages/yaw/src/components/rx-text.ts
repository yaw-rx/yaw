import { type Subscription } from 'rxjs';
import { Component } from '../component.js';
import { parseBind, subscribeBind } from '../expression/bind.js';
import { RxElement } from '../rx-element.js';
import { state } from '../observable.js';

@Component({ selector: 'rx-text', template: '' })
export class RxText extends RxElement {
    @state bind = '';
    private sub: Subscription | undefined;

    override onInit(): void {
        if (this.bind === '') return;
        const parsed = parseBind(this.bind);
        this.sub = subscribeBind(this, parsed, (v) => { this.textContent = String(v); });
    }

    override onDestroy(): void {
        this.sub?.unsubscribe();
    }
}

import { type Subscription } from 'rxjs';
import { Component } from '../component.js';
import { parseBind, subscribeBind } from '../expression/bind.js';
import { RxElement } from '../rx-element.js';

@Component({ selector: 'rx-text', template: '' })
export class RxText extends RxElement {
    private sub: Subscription | undefined;

    override onInit(): void {
        const raw = this.getAttribute('bind');
        if (raw === null) return;
        const parsed = parseBind(raw);
        this.sub = subscribeBind(this, parsed, (v) => { this.textContent = String(v); });
    }

    override onDestroy(): void {
        this.sub?.unsubscribe();
    }
}

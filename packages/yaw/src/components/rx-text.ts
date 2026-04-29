import { type Subscription } from 'rxjs';
import { Component } from '../component.js';
import { parseBind, subscribeBind, resolveEncoder } from '../expression/bind.js';
import { RxElement } from '../rx-element.js';
import { state } from '../observable.js';

@Component({ selector: 'rx-text', template: '' })
export class RxText extends RxElement {
    @state accessor bind = '';
    private sub: Subscription | undefined;

    override onInit(): void {
        if (this.bind === '') return;
        const parsed = parseBind(this.bind);
        const encode = resolveEncoder(this, parsed);
        console.log('[rx-text] onInit bind=', this.bind, 'host=', this.parentElement?.closest('[data-rx-host]')?.tagName);
        this.sub = subscribeBind(this, parsed, (v) => {
            console.log('[rx-text] value received', this.bind, '→', v, typeof v);
            this.textContent = encode(v);
        });
    }

    override onDestroy(): void {
        this.sub?.unsubscribe();
    }
}

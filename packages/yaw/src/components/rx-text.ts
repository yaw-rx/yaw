import { type Subscription } from 'rxjs';
import { Component } from '../component.js';
import { evaluate, identifiers } from '../expression/index.js';
import { RxElement } from '../rx-element.js';

@Component({ selector: 'rx-text', template: '' })
export class RxText extends RxElement {
    private subs: Subscription[] = [];

    override onInit(): void {
        const expr = this.getAttribute('bind');
        if (expr === null || this.parentRef === undefined) return;

        const parent = this.parentRef as unknown as Record<string, unknown>;

        const update = (): void => { this.textContent = String(evaluate(expr, parent)); };

        for (const id of identifiers(expr)) {
            const subject = parent[`${id}$`];
            if (subject !== null && typeof subject === 'object' && 'subscribe' in subject) {
                this.subs.push(
                    (subject as { subscribe: (fn: () => void) => Subscription }).subscribe(update)
                );
            }
        }
    }

    override onDestroy(): void {
        for (const sub of this.subs) sub.unsubscribe();
        this.subs.length = 0;
    }
}

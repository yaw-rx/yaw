import { type Subscription } from 'rxjs';
import { DefinesAttribute } from '../attribute.js';
import { Component } from '../component.js';
import { evaluate, identifiers } from '../expression/index.js';
import { RxElement } from '../rx-element.js';

@(DefinesAttribute<boolean>()('condition', (expr, parent, update) => {
    const ctx = parent as unknown as Record<string, unknown>;
    const subs: Subscription[] = [];

    const run = (): void => { update(Boolean(evaluate(expr, ctx))); };

    for (const id of identifiers(expr)) {
        const subject = ctx[`${id}$`];
        if (subject !== null && typeof subject === 'object' && 'subscribe' in subject) {
            subs.push((subject as { subscribe: (fn: () => void) => Subscription }).subscribe(run));
        }
    }

    run();
    return subs;
}))
@Component({ selector: 'rx-if', template: '' })
export class RxIf extends RxElement {
    private content = '';

    override onInit(): void {
        const tpl = this.firstElementChild;
        if (tpl instanceof HTMLTemplateElement) this.content = tpl.innerHTML;
    }

    condition(show: boolean): void {
        this.innerHTML = show ? this.content : '';
    }
}

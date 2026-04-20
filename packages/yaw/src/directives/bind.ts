import { type Subscription } from 'rxjs';
import { Directive } from '../directive.js';
import { parseBind, subscribeBind } from '../expression/bind.js';
import type { RxElementLike } from '../directive.js';

@Directive({ selector: '[data-rx-bind-*]' })
export class BindDirective {
    node!: RxElementLike;
    private subs: Subscription[] = [];

    onInit(): void {
        const self = this.node as unknown as Record<string, unknown>;

        for (const attr of Array.from(this.node.attributes)) {
            if (!attr.name.startsWith('data-rx-bind-')) continue;
            const prop = attr.name.slice('data-rx-bind-'.length);
            const parsed = parseBind(attr.value);
            this.subs.push(subscribeBind(this.node, parsed, (v) => { self[prop] = v; }));
        }
    }

    onDestroy(): void {
        for (const sub of this.subs) sub.unsubscribe();
        this.subs = [];
    }
}

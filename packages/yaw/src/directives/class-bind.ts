import { type Subscription } from 'rxjs';
import { Directive } from '../directive.js';
import { parseBind, subscribeBind } from '../expression/bind.js';
import type { RxElementLike } from '../directive.js';

@Directive({ selector: '[data-rx-class-*]' })
export class ClassBindDirective {
    node!: RxElementLike;
    private subs: Subscription[] = [];

    onInit(): void {
        for (const attr of Array.from(this.node.attributes)) {
            if (!attr.name.startsWith('data-rx-class-')) continue;
            const className = attr.name.slice('data-rx-class-'.length);
            const parsed = parseBind(attr.value);
            this.subs.push(subscribeBind(this.node, parsed, (v) => {
                this.node.classList.toggle(className, Boolean(v));
            }));
        }
    }

    onDestroy(): void {
        for (const sub of this.subs) sub.unsubscribe();
        this.subs = [];
    }
}

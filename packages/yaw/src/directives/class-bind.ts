import { type Subscription } from 'rxjs';
import { Directive } from '../directive.js';
import { evaluate, identifiers } from '../expression/index.js';
import type { RxElementLike } from '../directive.js';

type SubjectLike = { subscribe: (fn: (v: unknown) => void) => Subscription };

const isSubject = (v: unknown): v is SubjectLike =>
    v !== null && v !== undefined && typeof v === 'object' && 'subscribe' in v;

@Directive({ selector: '[data-rx-class-*]' })
export class ClassBindDirective {
    host!: RxElementLike;
    private subs: Subscription[] = [];

    onInit(): void {
        const ctx = this.host.parentRef as unknown as Record<string, unknown>;

        for (const attr of Array.from(this.host.attributes)) {
            if (!attr.name.startsWith('data-rx-class-')) continue;
            const className = attr.name.slice('data-rx-class-'.length);
            const expr = attr.value;

            const update = (): void => {
                this.host.classList.toggle(className, Boolean(evaluate(expr, ctx)));
            };

            for (const id of identifiers(expr)) {
                const subject = ctx[`${id}$`];
                if (isSubject(subject)) this.subs.push(subject.subscribe(update));
            }

            update();
        }
    }

    onDestroy(): void {
        for (const sub of this.subs) sub.unsubscribe();
        this.subs = [];
    }
}

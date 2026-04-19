import { type Subscription } from 'rxjs';
import { evaluate, identifiers } from '../expression/index.js';
import { registerConnectHook, type RxElementLike } from '../registry.js';

type SubjectLike = { subscribe: (fn: (v: unknown) => void) => Subscription };

const isSubject = (v: unknown): v is SubjectLike =>
    v !== null && v !== undefined && typeof v === 'object' && 'subscribe' in v;

registerConnectHook((el: RxElementLike, parent: RxElementLike | undefined): readonly Subscription[] => {
    if (parent === undefined) return [];

    const subs: Subscription[] = [];
    const ctx = parent as unknown as Record<string, unknown>;
    const self = el as unknown as Record<string, unknown>;

    for (const attr of Array.from(el.attributes)) {
        if (!attr.name.startsWith('data-rx-bind-')) continue;
        const prop = attr.name.slice('data-rx-bind-'.length);
        const expr = attr.value;

        for (const id of identifiers(expr)) {
            const subject = ctx[`${id}$`];
            if (isSubject(subject)) {
                subs.push(subject.subscribe(() => { self[prop] = evaluate(expr, ctx); }));
            }
        }
    }

    return subs;
});

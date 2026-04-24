import { type Subscription } from 'rxjs';
import { marshaller } from 'yaw-common';
import { parseBind, resolveValue, resolveWriteTarget } from './expression/bind.js';
import { getSubject } from './observable.js';
import type { RxElementLike } from './directive.js';

export const setupBindings = (element: RxElementLike): () => void => {
    const subs: Subscription[] = [];

    for (const attr of Array.from(element.attributes)) {
        const decoded = marshaller.decode(attr.name);
        if (decoded === undefined || decoded.kind !== 'model') continue;

        const parsed = parseBind(attr.value);
        const write = resolveWriteTarget(element, parsed);
        const subject = getSubject(element, decoded.memberPath[0]!);
        if (subject !== undefined) {
            subject.next(resolveValue(element, parsed));
            subs.push(subject.subscribe(write));
        }
    }

    return () => {
        for (const sub of subs) sub.unsubscribe();
    };
};

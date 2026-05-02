import { type Subscription } from 'rxjs';
import { marshaller } from 'yaw-common';
import { parseBind, subscribeBind, resolveEventHandler, resolveRefTarget, resolveValue, resolveWriteTarget, resolveEncoder } from './expression/bind.js';
import { BindPathError } from './errors.js';
import { getSubject } from './observable.js';

export const setupBindings = (element: HTMLElement): () => void => {
    const subs: Subscription[] = [];
    const listeners: Array<{ event: string; fn: EventListener }> = [];
    let refTeardown: (() => void) | undefined;

    for (const attr of Array.from(element.attributes)) {
        const decoded = marshaller.decode(attr.name);
        if (decoded === undefined) continue;

        const { kind, memberPath } = decoded;
        const parsed = parseBind(attr.value);

        switch (kind) {
            case 'prop': {
                subs.push(subscribeBind(element, parsed, (v) => {
                    let target: unknown = element;
                    for (let i = 0; i < memberPath.length - 1; i++) {
                        target = (target as Record<string, unknown>)[memberPath[i]!];
                        if (target === null || target === undefined) throw new BindPathError(element.tagName, memberPath.join('.'), memberPath[i]!);
                    }
                    (target as Record<string, unknown>)[memberPath[memberPath.length - 1]!] = v;
                    if (memberPath.length > 1) {
                        const subject = getSubject(element, memberPath[0]!);
                        if (subject === undefined) throw new BindPathError(element.tagName, memberPath.join('.'), `${memberPath[0]} is not @state`);
                        subject.next((element as unknown as Record<string, unknown>)[memberPath[0]!]);
                    }
                }));
                break;
            }
            case 'class': {
                subs.push(subscribeBind(element, parsed, (v) => {
                    element.classList.toggle(memberPath[0]!, Boolean(v));
                }));
                break;
            }
            case 'on': {
                const handler = resolveEventHandler(element, parsed);
                const fn: EventListener = (e) => { handler.invoke(e); };
                element.addEventListener(memberPath[0]!, fn);
                listeners.push({ event: memberPath[0]!, fn });
                break;
            }
            case 'ref': {
                const { scope, key } = resolveRefTarget(element, parsed);
                (scope as unknown as Record<string, unknown>)[key] = element;
                refTeardown = () => {
                    (scope as unknown as Record<string, unknown>)[key] = undefined;
                };
                break;
            }
            case 'attr': {
                const encode = resolveEncoder(element, parsed);
                subs.push(subscribeBind(element, parsed, (v) => {
                    element.setAttribute(memberPath[0]!, encode(v));
                }));
                break;
            }
            case 'text': {
                const encode = resolveEncoder(element, parsed);
                subs.push(subscribeBind(element, parsed, (v) => {
                    element.textContent = encode(v);
                }));
                break;
            }
            case 'style': {
                subs.push(subscribeBind(element, parsed, (v) => {
                    (element.style as unknown as Record<string, unknown>)[memberPath[0]!] = v;
                }));
                break;
            }
            case 'tap': {
                const write = resolveWriteTarget(element, parsed);
                const subject = getSubject(element, memberPath[0]!);
                if (subject !== undefined) {
                    subject.next(resolveValue(element, parsed));
                    subs.push(subject.subscribe(write));
                }
                break;
            }
        }
    }

    return () => {
        for (const sub of subs) sub.unsubscribe();
        for (const { event, fn } of listeners) element.removeEventListener(event, fn);
        refTeardown?.();
    };
};

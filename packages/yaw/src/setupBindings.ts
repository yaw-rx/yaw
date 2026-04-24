/**
 * Core binding pass that wires reactive bindings on an element at connect time.
 *
 * Scans all `data-rx-bind-*` attributes, decodes each with the bind marshaller
 * to recover the binding kind and member path, then dispatches:
 *
 *   - `prop`  — subscribes the expression and sets the value by walking the
 *               member path on the element (e.g. `['style', 'backgroundColor']`
 *               sets `element.style.backgroundColor`)
 *   - `class` — subscribes the expression and toggles the class name
 *   - `on`    — resolves the event handler and adds an event listener
 *   - `ref`   — resolves the ref target and assigns the element to the scope
 *   - `attr`  — subscribes the expression and calls setAttribute
 *   - `text`  — subscribes the expression and sets textContent
 *   - `style` — subscribes the expression and sets the style property
 *
 * @param element - The element to scan for bindings.
 * @returns A teardown function that unsubscribes all subscriptions and
 *          removes all event listeners.
 */
import { type Subscription } from 'rxjs';
import { marshaller } from 'yaw-common';
import { parseBind, subscribeBind, resolveEventHandler, resolveRefTarget, resolveValue, resolveWriteTarget } from './expression/bind.js';
import { getSubject } from './observable.js';
import type { RxElementLike } from './directive.js';

export const setupBindings = (element: RxElementLike): () => void => {
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
                    }
                    (target as Record<string, unknown>)[memberPath[memberPath.length - 1]!] = v;
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
                subs.push(subscribeBind(element, parsed, (v) => {
                    element.setAttribute(memberPath[0]!, String(v));
                }));
                break;
            }
            case 'text': {
                subs.push(subscribeBind(element, parsed, (v) => {
                    element.textContent = String(v);
                }));
                break;
            }
            case 'style': {
                subs.push(subscribeBind(element, parsed, (v) => {
                    (element.style as unknown as Record<string, unknown>)[memberPath[0]!] = v;
                }));
                break;
            }
            case 'model': {
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

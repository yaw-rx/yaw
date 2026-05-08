/**
 * setup.ts - reads an element's attributes and wires each binding.
 *
 * setupBindings iterates every attribute on the element. The
 * marshaller decodes attribute names prefixed with data-rx-bind-
 * into a { kind, memberPath } descriptor. The attribute value is
 * parsed into a ParsedBinding via parseBindingPath.
 *
 * Each kind maps to a DOM operation:
 *   - prop:  subscribe, set element property at memberPath depth,
 *            re-emit the root @state subject for nested paths.
 *   - class: subscribe, classList.toggle the named class.
 *   - on:    resolve event handler, addEventListener.
 *   - ref:   resolve target scope and key, assign element.
 *   - attr:  subscribe, setAttribute with optional encoder.
 *   - text:  subscribe, set textContent with optional encoder.
 *   - style: subscribe, set element.style property.
 *   - tap:   two-way: push initial value into target, subscribe
 *            source subject to write-target.
 *
 * During hydration, the bind() helper routes through deferredBinding
 * instead of subscribeToBinding, so subscriptions wait until the
 * host element is upgraded.
 *
 * Returns a teardown function: unsubscribes all RxJS subscriptions,
 * removes event listeners, and clears ref assignments.
 */
import { type Subscription } from 'rxjs';
import { marshaller } from '@yaw-rx/common/marshaller';
import { parseBindingPath, observeBinding, deferredBinding, resolveEventHandler, resolveRefTarget, resolveValue, resolveWriteTarget, resolveEncoder } from './path.js';
import { BindingPathError } from '../errors.js';
import { getSubject } from '../state.js';
import { isHydrating } from '../hydrate/state.js';
import { applyBindingHooks } from './hooks/binding.js';

export const setupBindings = (element: HTMLElement): () => void => {
    const subs: Subscription[] = [];
    const listeners: Array<{ event: string; fn: EventListener }> = [];
    let refTeardown: (() => void) | undefined;
    const hydrating = isHydrating();
    const bind = (bindingPath: ReturnType<typeof parseBindingPath>, onValue: (v: unknown) => void): Subscription => {
        const binding$ = hydrating
            ? deferredBinding(element, bindingPath)
            : observeBinding(element, bindingPath);
        return applyBindingHooks(element, binding$).subscribe(onValue);
    };

    for (const attr of Array.from(element.attributes)) {
        const decoded = marshaller.decode(attr.name);
        if (decoded === undefined) continue;

        const { kind, memberPath } = decoded;
        const bindingPath = parseBindingPath(attr.value);

        switch (kind) {
            case 'prop': {
                subs.push(bind(bindingPath, (v) => {
                    let target: unknown = element;
                    for (let i = 0; i < memberPath.length - 1; i++) {
                        target = (target as Record<string, unknown>)[memberPath[i]!];
                        if (target === null || target === undefined) throw new BindingPathError(element.tagName, memberPath.join('.'), memberPath[i]!);
                    }
                    (target as Record<string, unknown>)[memberPath[memberPath.length - 1]!] = v;
                    if (memberPath.length > 1) {
                        const subject = getSubject(element, memberPath[0]!);
                        if (subject === undefined) throw new BindingPathError(element.tagName, memberPath.join('.'), `${memberPath[0]} is not @state`);
                        subject.next((element as unknown as Record<string, unknown>)[memberPath[0]!]);
                    }
                }));
                break;
            }
            case 'class': {
                subs.push(bind(bindingPath, (v) => {
                    element.classList.toggle(memberPath[0]!, Boolean(v));
                }));
                break;
            }
            case 'on': {
                const handler = resolveEventHandler(element, bindingPath);
                const fn: EventListener = (e) => { handler.invoke(e); };
                element.addEventListener(memberPath[0]!, fn);
                listeners.push({ event: memberPath[0]!, fn });
                break;
            }
            case 'ref': {
                const { scope, key } = resolveRefTarget(element, bindingPath);
                (scope as unknown as Record<string, unknown>)[key] = element;
                refTeardown = () => {
                    (scope as unknown as Record<string, unknown>)[key] = undefined;
                };
                break;
            }
            case 'attr': {
                const encode = resolveEncoder(element, bindingPath);
                subs.push(bind(bindingPath, (v) => {
                    element.setAttribute(memberPath[0]!, encode(v));
                }));
                break;
            }
            case 'text': {
                const encode = resolveEncoder(element, bindingPath);
                subs.push(bind(bindingPath, (v) => {
                    element.textContent = encode(v);
                }));
                break;
            }
            case 'style': {
                subs.push(bind(bindingPath, (v) => {
                    (element.style as unknown as Record<string, unknown>)[memberPath[0]!] = v;
                }));
                break;
            }
            case 'tap': {
                const write = resolveWriteTarget(element, bindingPath);
                const subject = getSubject(element, memberPath[0]!);
                if (subject !== undefined) {
                    subject.next(resolveValue(element, bindingPath));
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

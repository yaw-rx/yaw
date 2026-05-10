import { getDirectives, getGlobalDirectives } from '../component.js';
import { getDirectiveSelector, matchesSelector, type Directive, type RxElementLike } from '../directive.js';
import { DirectiveInstantiationError, InvalidSelectorError } from '../errors.js';
import { resolveInjector } from '../di/resolve.js';

/**
 * Match registered directive selectors against the element's
 * attributes, instantiate each matching directive, and call
 * onInit. Returns the array of directive instances.
 *
 * @param el - The element to set up directives on.
 * @returns Array of instantiated directives.
 */
export const setupDirectivesFor = (el: Element): Directive[] => {
    const host = (el as unknown as { hostNode?: RxElementLike }).hostNode
        ?? el.parentElement?.closest('[data-rx-host]') as RxElementLike | null ?? undefined;
    const hostCtor = host !== undefined ? host.constructor : el.constructor;
    const declaredDirectives = [
        ...getGlobalDirectives(),
        ...(getDirectives(hostCtor) ?? []),
    ];
    const directives: Directive[] = [];
    for (const ctor of declaredDirectives) {
        const selector = getDirectiveSelector(ctor);
        if (selector === undefined) { continue; }
        if (!selector.startsWith('[') || !selector.endsWith(']')) {
            throw new InvalidSelectorError(ctor.name, selector);
        }
        if (!matchesSelector(el, selector)) { continue; }
        let directive: Directive;
        try {
            directive = resolveInjector(el).instantiate(ctor);
        } catch (e) {
            throw new DirectiveInstantiationError(ctor.name, el.tagName, e);
        }
        directive.node = el as RxElementLike;
        if (!selector.endsWith('*]')) {
            const attrName = selector.slice(1, -1);
            const raw = el.getAttribute(attrName) ?? '';
            directive.bindingPath = directive.parseBindingPath ? directive.parseBindingPath(raw) : { raw };
        }
        directive.onInit();
        directives.push(directive);
    }
    return directives;
};

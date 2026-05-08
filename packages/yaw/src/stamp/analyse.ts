/**
 * analyse.ts - extract stamp instructions from a template.
 *
 * General-purpose template analysis for any directive that stamps
 * cloned elements with resolved data: rx-for, virtual lists, or
 * any user-defined directive that batch-creates DOM from a template.
 *
 * Walks the content of an HTMLTemplateElement depth-first, decodes
 * every `data-rx-bind-*` attribute via the marshaller, and parses
 * the binding path. Produces a flat list of StampInstructions that
 * describe what to resolve and where to write during stamping.
 *
 * Each instruction records:
 *   - elementIndex: position in a depth-first element walk of the
 *     clone, so the stamper can find the target element without
 *     a second tree walk.
 *   - kind: the binding type (text, class, style, attr, prop).
 *   - memberPath: the DOM target (class name, style prop, etc.).
 *   - bindingPath: the parsed binding expression.
 *
 * Binding kinds that cannot be stamped (on, ref, tap) are skipped.
 *
 * The result is immutable per template. Call once after creating
 * the template element, reuse for every clone.
 *
 * @param tpl - The template element to analyse.
 * @returns {StampInstruction[]} The list of stamp instructions.
 */
import { marshaller } from '@yaw-rx/common/marshaller';
import { parseBindingPath, resolveEncoder, type ParsedBinding } from '../binding/path.js';
import type { BindKind } from '@yaw-rx/common/marshaller';

/**
 * A single binding to stamp on a cloned template element.
 *
 * Produced by {@link analyseTemplate}, consumed by the stamp
 * writer and scope resolver. Immutable after creation.
 */
export interface StampInstruction {
    readonly elementIndex: number;
    readonly kind: BindKind;
    readonly memberPath: readonly string[];
    readonly bindingPath: ParsedBinding;
    readonly encode: (v: unknown) => string;
}

const STAMPABLE: ReadonlySet<BindKind> = new Set(['text', 'class', 'style', 'attr', 'prop']);

/**
 * Walk a template and extract every stampable binding as an
 * instruction. The result is immutable per template: call once
 * after creating the template element, reuse for every clone.
 *
 * Stampable binding kinds: text, class, style, attr, prop.
 * Non-stampable kinds (on, ref, tap) are skipped.
 *
 * @param root - The root node to walk (template content, element, or fragment).
 * @param host - The host element, used to resolve encoders for
 *   text and attr bindings via __stateTypes.
 * @returns {StampInstruction[]} Ordered list of stamp instructions.
 */
export const analyseTemplate = (root: Node, host: Element): StampInstruction[] => {
    const instructions: StampInstruction[] = [];
    const elements: Element[] = [];

    const walk = (node: Node): void => {
        let child = node.firstChild;
        while (child !== null) {
            if (child.nodeType === 1) {
                const el = child as Element;
                elements.push(el);
                const tag = el.tagName.toLowerCase();
                if (!tag.includes('-') || customElements.get(tag) === undefined) {
                    walk(el);
                }
            }
            child = child.nextSibling;
        }
    };
    walk(root);

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i]!;
        for (const attr of Array.from(el.attributes)) {
            const decoded = marshaller.decode(attr.name);
            if (decoded === undefined) continue;
            if (!STAMPABLE.has(decoded.kind)) continue;

            const bindingPath = parseBindingPath(attr.value);
            instructions.push({
                elementIndex: i,
                kind: decoded.kind,
                memberPath: decoded.memberPath,
                bindingPath,
                encode: resolveEncoder(host, bindingPath),
            });
        }
    }

    return instructions;
};

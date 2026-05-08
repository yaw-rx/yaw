/**
 * write.ts - apply resolved values to cloned elements.
 *
 * General-purpose DOM writer for stamping. Takes a list of stamp
 * instructions (from analyseTemplate), a flat array of elements
 * (depth-first walk of the clone), and resolved values. Writes
 * each value to the target element using the binding kind:
 *
 *   - text: set textContent.
 *   - class: classList.toggle the named class.
 *   - style: set element.style property.
 *   - attr: setAttribute.
 *   - prop: set element property at memberPath depth.
 *
 * The elements array must match the depth-first order used by
 * analyseTemplate so elementIndex lookups are correct.
 *
 * @param elements - Flat depth-first array of elements from the clone.
 * @param instructions - Stamp instructions from analyseTemplate.
 * @param values - Resolved values, one per instruction, same order.
 * @returns {void}
 */
import type { StampInstruction } from './analyse.js';

/**
 * Apply resolved values to cloned elements according to stamp
 * instructions. Each instruction targets an element by index and
 * writes via the binding kind (textContent, classList, style,
 * setAttribute, or property assignment).
 *
 * @param elements - Flat depth-first array of elements from the clone.
 * @param instructions - Stamp instructions from analyseTemplate.
 * @param values - Resolved values in row-major order from resolveStamp.
 * @param offset - Start index into values for this item (default 0).
 * @returns {void}
 */
export const writeStamp = (
    elements: readonly Element[],
    instructions: readonly StampInstruction[],
    values: readonly unknown[],
    offset = 0,
): void => {
    for (let i = 0; i < instructions.length; i++) {
        const inst = instructions[i]!;
        const el = elements[inst.elementIndex]! as HTMLElement;
        const v = values[offset + i];

        switch (inst.kind) {
            case 'text':
                el.textContent = inst.encode(v);
                break;
            case 'class':
                el.classList.toggle(inst.memberPath[0]!, Boolean(v));
                break;
            case 'style':
                (el.style as unknown as Record<string, unknown>)[inst.memberPath[0]!] = v;
                break;
            case 'attr':
                el.setAttribute(inst.memberPath[0]!, inst.encode(v));
                break;
            case 'prop': {
                let target: unknown = el;
                for (let j = 0; j < inst.memberPath.length - 1; j++) {
                    target = (target as Record<string, unknown>)[inst.memberPath[j]!];
                }
                (target as Record<string, unknown>)[inst.memberPath[inst.memberPath.length - 1]!] = v;
                break;
            }
        }
    }
};

/**
 * Collect elements from a DocumentFragment or Element in depth-first
 * order, matching the traversal used by analyseTemplate.
 *
 * @param root - The cloned fragment or element to walk.
 * @returns {Element[]} Flat array of elements in depth-first order.
 */
export const collectElements = (root: Node): Element[] => {
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
    return elements;
};

import { type Subscription } from 'rxjs';
import { Directive } from '../directive.js';
import { parseBindingPath, subscribeToBinding } from '../binding/path.js';
import type { RxElementLike } from '../directive.js';

/**
 * Conditional rendering directive. Subscribes to the binding path
 * in the `rx-if` attribute. When the value is truthy, the element's
 * children are stamped into the DOM. When falsy, they are moved
 * back into a hidden template element.
 */
@Directive({ selector: '[rx-if]' })
export class RxIf {
    node!: RxElementLike;
    private sub: Subscription | undefined;
    private template!: HTMLTemplateElement;

    /**
     * Parses the binding path, stores existing children in a template,
     * and subscribes to the resolved observable.
     * @returns {void}
     */
    onInit(): void {
        const existing = this.node.querySelector(':scope > template[rx-if-store]') as HTMLTemplateElement | null;
        if (existing) {
            this.template = existing;
        } else {
            this.template = document.createElement('template');
            this.template.setAttribute('rx-if-store', '');
            for (const child of Array.from(this.node.childNodes)) {
                this.template.content.appendChild(child);
            }
            this.node.appendChild(this.template);
        }

        const raw = this.node.getAttribute('rx-if') ?? '';
        const bindingPath = parseBindingPath(raw);
        this.sub = subscribeToBinding(this.node, bindingPath, (v) => {
            if (Boolean(v)) {
                for (const child of Array.from(this.template.content.childNodes)) {
                    this.node.insertBefore(child, this.template);
                }
            } else {
                for (const child of Array.from(this.node.childNodes)) {
                    if (child !== this.template) this.template.content.appendChild(child);
                }
            }
        });
    }

    /**
     * Unsubscribes from the binding.
     * @returns {void}
     */
    onDestroy(): void {
        this.sub?.unsubscribe();
    }
}

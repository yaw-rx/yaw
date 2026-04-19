import { Directive } from '../directive.js';
import type { RxElementLike } from '../directive.js';

@Directive({ selector: '[data-rx-ref]' })
export class RefsDirective {
    host!: RxElementLike;

    onInit(): void {
        const ref = this.host.getAttribute('data-rx-ref');
        if (ref !== null && this.host.parentRef !== undefined) {
            (this.host.parentRef as unknown as Record<string, unknown>)[ref] = this.host;
        }
    }

    onDestroy(): void {
        const ref = this.host.getAttribute('data-rx-ref');
        if (ref !== null && this.host.parentRef !== undefined) {
            (this.host.parentRef as unknown as Record<string, unknown>)[ref] = undefined;
        }
    }
}

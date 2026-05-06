import { Directive } from '@yaw-rx/core';
import type { ParsedBindingPath, RxElementLike } from '@yaw-rx/core';

@Directive({ selector: '[scroll-reveal]' })
export class ScrollReveal {
    node!: RxElementLike;
    bindingPath?: ParsedBindingPath;
    private observer: IntersectionObserver | undefined;

    onInit(): void {
        const threshold = this.bindingPath?.raw ? parseFloat(this.bindingPath.raw) : 0.15;

        this.node.classList.add('reveal');

        this.observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        this.node.classList.add('revealed');
                        this.observer?.unobserve(this.node);
                    }
                }
            },
            { threshold }
        );

        this.observer.observe(this.node);
    }

    onDestroy(): void {
        this.observer?.disconnect();
    }
}

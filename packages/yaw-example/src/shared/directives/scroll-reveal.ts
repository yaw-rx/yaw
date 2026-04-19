import { Directive } from 'yaw';
import type { ParsedExpr, RxElementLike } from 'yaw';

@Directive({ selector: '[scroll-reveal]' })
export class ScrollReveal {
    host!: RxElementLike;
    parsed?: ParsedExpr;
    private observer: IntersectionObserver | undefined;

    onInit(): void {
        const threshold = this.parsed?.expr ? parseFloat(this.parsed.expr) : 0.15;

        this.host.classList.add('reveal');

        this.observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        this.host.classList.add('revealed');
                        this.observer?.unobserve(this.host);
                    }
                }
            },
            { threshold }
        );

        this.observer.observe(this.host);
    }

    onDestroy(): void {
        this.observer?.disconnect();
    }
}

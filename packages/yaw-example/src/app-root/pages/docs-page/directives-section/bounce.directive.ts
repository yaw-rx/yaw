import { Directive } from '@yaw-rx/core';
import type { RxElementLike } from '@yaw-rx/core';

@Directive({ selector: '[bounce]' })
export class Bounce {
    node!: RxElementLike;
    private animation: Animation | undefined;

    onInit(): void {
        this.animation = this.node.animate(
            [
                { transform: 'translateY(0)' },
                { transform: 'translateY(-10px)' },
                { transform: 'translateY(0)' },
            ],
            { duration: 900, iterations: Infinity, easing: 'ease-in-out' }
        );
    }

    onDestroy(): void {
        this.animation?.cancel();
    }
}

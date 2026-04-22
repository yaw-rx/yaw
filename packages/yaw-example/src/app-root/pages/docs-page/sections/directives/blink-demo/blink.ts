import { Directive } from 'yaw';
import type { RxElementLike } from 'yaw';

@Directive({ selector: '[blink]' })
export class Blink {
    node!: RxElementLike;
    private animation: Animation | undefined;

    onInit(): void {
        this.animation = this.node.animate(
            [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }],
            { duration: 1000, iterations: Infinity },
        );
    }

    onDestroy(): void {
        this.animation?.cancel();
    }
}

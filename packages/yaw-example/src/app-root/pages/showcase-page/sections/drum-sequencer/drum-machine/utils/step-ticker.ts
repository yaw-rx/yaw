import { BehaviorSubject } from 'rxjs';
import { Injectable } from 'yaw';

@Injectable()
export class StepTicker {
    readonly current$ = new BehaviorSubject<number>(-1);

    set(step: number): void {
        this.current$.next(step);
    }
}

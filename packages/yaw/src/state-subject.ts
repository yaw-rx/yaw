import { BehaviorSubject } from 'rxjs';

export class StateSubject<T> extends BehaviorSubject<T> {
    touch(): void {
        this.next(this.value);
    }
}

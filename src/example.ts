import { RxElement } from './rx-element.js';
import { observable } from './observable.js';

class Counter extends RxElement<{ count: number; label: string }> {
    @observable count = 0;
    @observable label = 'ticks';
}

class Plain extends RxElement {
    greet(): string {
        return 'hi';
    }
}

const a = new Counter();
a.count$.subscribe((v) => {
    a.label = `${String(v)} ticks`;
});
a.count = 1;

const b = new Plain();
b.greet();

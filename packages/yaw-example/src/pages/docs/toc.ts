import 'reflect-metadata';
import { BehaviorSubject } from 'rxjs';
import { Directive, Injectable, RxElement } from 'yaw';
import type { RxElementLike } from 'yaw';

@Injectable()
export class TocService {
    readonly activeId$ = new BehaviorSubject<string>('');
    private observer: IntersectionObserver | undefined;

    getObserver(): IntersectionObserver {
        if (this.observer) return this.observer;
        this.observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting);
                if (visible.length === 0) return;
                visible.sort(
                    (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
                );
                const id = (visible[0]!.target as HTMLElement).id;
                if (id) this.activeId$.next(id);
            },
            { rootMargin: '-80px 0px -65% 0px', threshold: 0 },
        );
        return this.observer;
    }
}

@Directive({ selector: '[toc-section]' })
export class TocSection {
    host!: RxElementLike;
    private toc: TocService | undefined;

    onInit(): void {
        this.toc = RxElement.resolveInjector(this.host).resolve(TocService);
        this.toc.getObserver().observe(this.host);
    }

    onDestroy(): void {
        this.toc?.getObserver().unobserve(this.host);
    }
}

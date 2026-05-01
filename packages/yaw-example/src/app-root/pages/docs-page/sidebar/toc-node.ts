/**
 * toc-node — recursive tree node for the docs sidebar.
 *
 * Each toc-node renders a clickable label and a children container.
 * If it has children, rx-for stamps child <toc-node> elements.
 * Recursion stops when children is empty.
 *
 * Each node self-manages active/expanded state via combineLatest
 * on TocService.activeId$ and TocService.expandAll$, using the
 * precomputed ancestor paths in TocService.paths.
 */
import { combineLatest } from 'rxjs';
import { Component, Inject, RxElement, state } from 'yaw';
import { RxFor } from 'yaw/directives/rx-for';
import { TocService, type TocEntry } from '../services/toc-service.js';
import { SidebarService } from '../../../services/sidebar-service.js';

@Component({
    selector: 'toc-node',
    directives: [RxFor],
    template: `
        <a [class.active]="active" onclick="goto(id)">{{label}}</a>
        <div class="children" [class.expanded]="expanded">
            <div rx-for="childEntries by id">
                <toc-node></toc-node>
            </div>
        </div>
    `,
    styles: `
        :host { display: flex; flex-direction: column; }

        a { color: #666; text-decoration: none; cursor: pointer;
            padding: 0.20rem 0; font-size: 0.8rem; font-weight: 400;
            transition: color 0.15s;
            border-left: 2px solid transparent;
            padding-left: 0.6rem; margin-left: -0.6rem;
            white-space: nowrap; }
        a:hover { color: #fff; }
        a.active { color: #8af; border-left-color: #8af; }

        .children { display: flex; flex-direction: column;
                    max-height: 0; overflow: hidden; opacity: 0;
                    padding-left: 0.85rem; margin-left: 0.1rem;
                    border-left: 1px solid #1a1a1a; }
        .children.expanded { max-height: 800px; opacity: 1;
                             padding-top: 0.15rem; padding-bottom: 0.35rem; }
    `,
})
export class TocNode extends RxElement {
    @state label = '';
    @state childEntries: readonly TocEntry[] = [];
    @state depth = 0;
    @state expanded = false;
    @state active = false;

    @Inject(TocService) private readonly toc!: TocService;
    @Inject(SidebarService) private readonly sidebar!: SidebarService;

    override onInit(): void {
        combineLatest([this.toc.activeId$, this.toc.expandAll$]).subscribe(
            ([activeId, expandAll]: [string, boolean]) => {
                const path = this.toc.paths.get(activeId);
                this.active = this.id === activeId;
                this.expanded = expandAll || (path !== undefined && path.includes(this.id));
            }
        );
    }

    goto(id: string): void {
        this.toc.scrollTo(id);
        this.sidebar.close();
    }
}

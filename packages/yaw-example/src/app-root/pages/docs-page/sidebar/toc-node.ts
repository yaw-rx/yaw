/**
 * toc-node — recursive tree node for the docs sidebar.
 *
 * Each toc-node renders a clickable label and a children container.
 * If it has children, rx-for stamps child <toc-node> elements.
 * Recursion stops when children is empty.
 *
 * Active highlighting and expansion are managed by two methods:
 *   expand() — adds .expanded to this node and recurses up via
 *              hostNode to expand every ancestor to the root.
 *   collapse() — removes .expanded from this node.
 *
 * The sidebar finds the active leaf by id (one querySelector call),
 * calls expand() on it, and the recursion handles the rest.
 */
import { Component, Inject, RxElement, state } from 'yaw';
import { TocService, type TocEntry } from '../services/toc-service.js';

@Component({
    selector: 'toc-node',
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
            padding: 0.20rem 0; font-size: 0.60rem; font-weight: 400;
            transition: color 0.15s;
            border-left: 2px solid transparent;
            padding-left: 0.6rem; margin-left: -0.6rem; }
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

    expand(): void {
        this.expanded = true;
        const host = this.hostNode;
        if (host instanceof TocNode) host.expand();
    }

    collapse(): void {
        this.expanded = false;
        this.active = false;
    }

    goto(id: string): void {
        this.toc.scrollTo(id);
    }
}

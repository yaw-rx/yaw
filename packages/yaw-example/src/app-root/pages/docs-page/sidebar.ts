/**
 * DocsSidebar — docs page sidebar navigation.
 *
 * Reads the TOC tree from the TocService. No hardcoded nav data.
 *
 * One subscription to activeId$. On each change, finds the new active
 * leaf, walks up via hostNode to build the new path, diffs against the
 * cached previous path, and only collapses/expands the nodes that changed.
 * Shared ancestors stay expanded.
 */
import { type Observable } from 'rxjs';
import { Component, Inject, RxElement } from 'yaw';
import { RxFor } from 'yaw/directives/rx-for';
import { TocService, type TocEntry } from './services/toc-service.js';
import { TocNode } from './sidebar/toc-node.js';

@Component({
    selector: 'docs-sidebar',
    directives: [RxFor],
    template: `
        <aside>
            <nav rx-for="nodes by id">
                <toc-node></toc-node>
            </nav>
        </aside>
    `,
    styles: `
        :host { display: block; box-sizing: border-box;
                flex: 0 0 auto;
                position: sticky; top: 4rem;
                align-self: flex-start;
                height: calc(100vh - 4rem);
                padding: 0.5rem 1.5rem 0.5rem 2rem;
                border-right: 1px solid #151515;
                overflow-y: auto; }

        aside { display: flex; flex-direction: column; gap: 0.6rem; }

        .label { color: #555; font-family: monospace; font-size: 0.7rem;
                 text-transform: uppercase; letter-spacing: 0.12em; }

        nav { display: flex; flex-direction: column; gap: 0.15rem;
              font-family: monospace; }
    `,
})
export class DocsSidebar extends RxElement {
    @Inject(TocService) private readonly toc!: TocService;
    private prevPath: TocNode[] = [];
    private prevLeaf: TocNode | null = null;

    get nodes$(): Observable<readonly TocEntry[]> {
        return this.toc.tree$;
    }

    override onInit(): void {
        let timer: number | undefined;
        const mo = new MutationObserver(() => {
            clearTimeout(timer);
            timer = window.setTimeout(() => {
                mo.disconnect();
                this.#measureWidth();
            }, 300);
        });
        mo.observe(this, { childList: true, subtree: true });

        this.toc.activeId$.subscribe((id: string) => {
            if (!id) return;
            const leaf = this.querySelector(`#${CSS.escape(id)}`) as TocNode | null;
            if (!leaf) return;

            const newPath = this.collectPath(leaf);
            const shared = this.sharedLength(this.prevPath, newPath);

            if (this.prevLeaf) this.prevLeaf.active = false;
            for (let i = shared; i < this.prevPath.length; i++) {
                this.prevPath[i]!.collapse();
            }

            const path = this.collectPath(leaf);
            console.log('active:', id, 'leaf:', leaf?.tagName, 'path:', path.map(n => n.id), 'hostNode:', (leaf as any)?.hostNode?.tagName, 'instanceof:', leaf instanceof TocNode);

            leaf.active = true;
            leaf.expand();

            this.prevPath = newPath;
            this.prevLeaf = leaf;
        });
    }

    private collectPath(leaf: TocNode): TocNode[] {
        const path: TocNode[] = [];
        let node: RxElement | undefined = leaf;
        while (node instanceof TocNode) {
            path.unshift(node);
            node = (node as any).hostNode;
        }
        return path;
    }

    #measureWidth(): void {
        const nodes = this.querySelectorAll<TocNode>('toc-node');
        const wasExpanded: boolean[] = [];
        for (const node of nodes) {
            wasExpanded.push(node.expanded);
            node.expanded = true;
        }
        const prev = this.style.cssText;
        this.style.cssText = 'position:fixed;left:-9999px;width:auto;visibility:hidden;';
        const width = this.scrollWidth;
        this.style.cssText = prev;
        this.style.flexBasis = `${width}px`;
        for (let i = 0; i < nodes.length; i++) {
            nodes[i]!.expanded = wasExpanded[i]!;
        }
    }

    private sharedLength(a: TocNode[], b: TocNode[]): number {
        const len = Math.min(a.length, b.length);
        for (let i = 0; i < len; i++) {
            if (a[i] !== b[i]) return i;
        }
        return len;
    }
}

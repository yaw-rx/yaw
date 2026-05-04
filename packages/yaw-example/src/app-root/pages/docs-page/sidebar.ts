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
import { Component, Inject, RxElement } from '@yaw-rx/core';
import { isPrerendered } from '@yaw-rx/core/ssg/hydrate/hydration-state';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
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
        @media (max-width: 768px) {
            :host { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    height: 100vh; border-right: none; }
        }
    `,
})
export class DocsSidebar extends RxElement {
    @Inject(TocService) private readonly toc!: TocService;

    get nodes$(): Observable<readonly TocEntry[]> {
        return this.toc.tree$;
    }

    override onInit(): void {
        if (isPrerendered()) return;
        let timer: number | undefined;
        const mo = new MutationObserver(() => {
            clearTimeout(timer);
            timer = window.setTimeout(() => {
                mo.disconnect();
                this.#measureWidth();
            }, 300);
        });
        mo.observe(this, { childList: true, subtree: true });
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
}

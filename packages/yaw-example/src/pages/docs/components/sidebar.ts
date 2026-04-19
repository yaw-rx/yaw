import 'reflect-metadata';
import { map, type Observable } from 'rxjs';
import { Component, RxElement, observable } from 'yaw';
import { TocService } from '../toc.js';

type TocChild = { id: string; label: string };
type TocGroup = { id: string; label: string; children: TocChild[] };

const TOC: TocGroup[] = [
    {
        id: 'bootstrap', label: 'Bootstrap',
        children: [
            { id: 'bootstrap-html', label: 'index.html' },
            { id: 'bootstrap-main', label: 'main.ts' },
            { id: 'bootstrap-root', label: 'Root component' },
        ],
    },
    {
        id: 'components', label: 'Components',
        children: [
            { id: 'components-whole', label: 'A whole component' },
            { id: 'components-use', label: 'In use' },
            { id: 'components-bindings', label: 'Template bindings' },
            { id: 'components-lifecycle', label: 'Lifecycle' },
        ],
    },
    {
        id: 'directives', label: 'Directives',
        children: [
            { id: 'directives-a', label: 'A directive' },
            { id: 'directives-before-after', label: 'Before / after' },
            { id: 'directives-declaring', label: 'Declaring on a host' },
            { id: 'directives-scroll-reveal', label: 'ScrollReveal' },
            { id: 'directives-builtin', label: 'Built-ins' },
        ],
    },
    {
        id: 'services', label: 'Services',
        children: [
            { id: 'services-a', label: 'A service' },
            { id: 'services-register', label: 'Registering' },
            { id: 'services-resolve', label: 'Resolving' },
            { id: 'services-live', label: 'Live' },
        ],
    },
    {
        id: 'navigation', label: 'Navigation',
        children: [
            { id: 'navigation-routes', label: 'Declaring routes' },
            { id: 'navigation-outlet', label: 'The outlet' },
            { id: 'navigation-navigate', label: 'Navigating' },
            { id: 'navigation-live', label: 'Live' },
            { id: 'navigation-api', label: 'Router API' },
        ],
    },
];

const groupOf = (id: string): string => {
    const i = id.indexOf('-');
    return i === -1 ? id : id.substring(0, i);
};

@Component({
    selector: 'docs-sidebar',
    template: `
        <aside>
            <span class="label">Docs</span>
            <nav>
                ${TOC.map((g) => `
                    <div class="group">
                        <a class="top" [class.active]="inGroup('${g.id}')"
                           onclick="goto('${g.id}')">${g.label}</a>
                        <div class="children" [class.expanded]="inGroup('${g.id}')">
                            ${g.children.map((c) => `
                                <a [class.active]="isAt('${c.id}')"
                                   onclick="goto('${c.id}')">${c.label}</a>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </nav>
        </aside>
    `,
    styles: `
        :host { display: block; box-sizing: border-box;
                flex: 0 0 220px;
                position: sticky; top: 4rem;
                align-self: flex-start;
                height: calc(100vh - 4rem);
                padding: 1.25rem 1.5rem;
                border-right: 1px solid #151515; }

        aside { display: flex; flex-direction: column; gap: 1rem; }

        .label { color: #555; font-family: monospace; font-size: 0.7rem;
                 text-transform: uppercase; letter-spacing: 0.12em; }

        nav { display: flex; flex-direction: column; gap: 0.35rem;
              font-family: monospace; }

        .group { display: flex; flex-direction: column; }

        .top { color: #888; text-decoration: none; cursor: pointer;
               padding: 0.45rem 0; font-size: 0.9rem; font-weight: 500;
               transition: color 0.15s, padding-left 0.2s;
               border-left: 2px solid transparent; padding-left: 0.6rem;
               margin-left: -0.6rem; }
        .top:hover { color: #fff; }
        .top.active { color: #fff; border-left-color: #8af; }

        .children { display: flex; flex-direction: column;
                    max-height: 0; overflow: hidden; opacity: 0;
                    transition: max-height 0.3s ease, opacity 0.2s ease;
                    padding-left: 0.85rem; margin-left: 0.1rem;
                    border-left: 1px solid #1a1a1a; }
        .children.expanded { max-height: 400px; opacity: 1;
                             padding-top: 0.15rem; padding-bottom: 0.35rem; }

        .children a { color: #666; text-decoration: none; cursor: pointer;
                      padding: 0.3rem 0; font-size: 0.8rem;
                      transition: color 0.15s; }
        .children a:hover { color: #8af; }
        .children a.active { color: #8af; }
    `,
})
export class DocsSidebar extends RxElement<{ activeId: string }> {
    @observable activeId = TOC[0]!.id;

    override onInit(): void {
        const toc = RxElement.resolveInjector(this).resolve(TocService);
        toc.activeId$.subscribe((id) => { if (id) this.activeId = id; });
    }

    inGroup(group: string): Observable<boolean> {
        return this.activeId$.pipe(map((id) => groupOf(id) === group));
    }

    isAt(id: string): Observable<boolean> {
        return this.activeId$.pipe(map((curr) => curr === id));
    }

    goto(id: string): void {
        const toc = RxElement.resolveInjector(this).resolve(TocService);
        toc.scrollTo(id);
    }
}

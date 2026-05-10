import { Component, RxElement } from '@yaw-rx/core';
import { Router, ROUTES } from '@yaw-rx/core/router';
import '@yaw-rx/core/router/outlet';
import { bootstrap } from '@yaw-rx/core';

@Component({
    selector: 'bench-shell',
    template: `
        <nav style="padding: 8px; font-family: monospace;">
            <a href="/" onclick="nav('/')">rx-for bench</a> |
            <a href="/hook-bench" onclick="nav('/hook-bench')">hook bench</a>
        </nav>
        <rx-router-outlet></rx-router-outlet>
    `,
})
class BenchShell extends RxElement {
    nav(path: string): void {
        window.history.pushState(null, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }
}

await bootstrap({
    root: BenchShell,
    providers: [
        { provide: ROUTES, useValue: [
            { path: '/',           load: () => import('./bench-page.js').then(m => m.BenchPage) },
            { path: '/hook-bench', load: () => import('./hook-bench/page.component.js').then(m => m.HookBenchPage) },
        ] },
        Router,
    ],
});

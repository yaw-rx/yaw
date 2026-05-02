import { map, type Observable } from 'rxjs';
import { Component, Inject, RxElement, state } from '@yaw-rx/core';
import { Router } from '@yaw-rx/core/router';
import { Hamburger } from '../directives/hamburger.js';

@Component({
    selector: 'nav-bar',
    directives: [Hamburger],
    template: `
        <nav>
            <a class="logo" hamburger>YAW</a>
            <div class="links">
                <a [class.active]="isActive('/')" onclick="navigateHome">Manifesto</a>
                <a [class.active]="isActive('/showcase')" onclick="navigateShowcase">Showcase</a>
                <a [class.active]="isActive('/docs')" onclick="navigateDocs">Docs</a>
                <a [class.active]="isActive('/examples')" onclick="navigateExamples">Examples</a>
                <a [class.active]="isActive('/react')" onclick="navigateReact">vs&nbsp;React</a>
                <a [class.active]="isActive('/angular')" onclick="navigateAngular">vs&nbsp;Angular</a>
            </div>
        </nav>
    `,
    styles: `
        nav { position: fixed; top: 0; left: 0; right: 0; z-index: 300;
              display: flex; justify-content: space-between; align-items: center;
              padding: 1rem 2rem; background: rgba(0,0,0,0.85);
              backdrop-filter: blur(8px); border-bottom: 1px solid #222; }
        .logo { font-weight: 900; font-size: 1.4rem; color: #fff;
                text-decoration: none; letter-spacing: -1px; cursor: pointer;
                margin-right: 2rem; position: relative; }
        .logo.has-menu::after { content: ''; position: absolute;
                   bottom: -7px; left: 0; width: 100%; height: 8px;
                   background:
                       linear-gradient(#8af, #8af) center 0    / 70% 1.5px no-repeat,
                       linear-gradient(#8af, #8af) center 50%  / 50% 1.5px no-repeat,
                       linear-gradient(#8af, #8af) center 100% / 30% 1.5px no-repeat; }
        .links { display: flex; gap: 2rem; overflow-x: auto; scrollbar-width: none; }
        .links::-webkit-scrollbar { display: none; }
        .links a { color: #888; text-decoration: none; font-size: 0.9rem;
                   letter-spacing: 0.05em; cursor: pointer; transition: color 0.2s;
                   white-space: nowrap; position: relative; }
        .links a:hover { color: #fff; }
        .links a.active { color: #fff; }
        .links a.active::after { content: ''; position: absolute;
                   left: 0; right: 0; bottom: -4px;
                   height: 2px; background: #fff; }
        @media (max-width: 768px) {
            nav { padding: 0.75rem 1rem; }
            .logo { margin-right: 1rem; }
            .links { gap: 1rem; }
        }
        @media (max-width: 480px) {
            nav { padding: 0.75rem 0.5rem 0.75rem 0.75rem; }
            .logo { margin-right: 0.75rem; font-size: 1.2rem; }
            .links { gap: 0.75rem; }
            .links a { font-size: 0.75rem; letter-spacing: 0; }
        }
    `
})
export class NavBar extends RxElement {
    @state route = '/';
    @Inject(Router) private readonly router!: Router;

    override onInit(): void {
        this.router.route$.subscribe((r) => { this.route = r; });
    }

    isActive(path: string): Observable<boolean> {
        return this.route$.pipe(map((r) => r === path));
    }

    navigateHome(): void { this.router.navigate('/'); }
    navigateExamples(): void { this.router.navigate('/examples'); }
    navigateShowcase(): void { this.router.navigate('/showcase'); }
    navigateDocs(): void { this.router.navigate('/docs'); }
    navigateReact(): void { this.router.navigate('/react'); }
    navigateAngular(): void { this.router.navigate('/angular'); }
}
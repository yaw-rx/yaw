import { map, type Observable } from 'rxjs';
import { Component, Inject, RxElement, state } from 'yaw';
import { Router } from 'yaw/router';

@Component({
    selector: 'nav-bar',
    template: `
        <nav>
            <a class="logo" onclick="navigateHome">YAW</a>
            <div class="links">
                <a [class.active]="isActive('/')" onclick="navigateHome">Manifesto</a>
                <a [class.active]="isActive('/showcase')" onclick="navigateShowcase">Showcase</a>
                <a [class.active]="isActive('/examples')" onclick="navigateExamples">Examples</a>
                <a [class.active]="isActive('/docs')" onclick="navigateDocs">Docs</a>
                <a [class.active]="isActive('/react')" onclick="navigateReact">vs&nbsp;React</a>
                <a [class.active]="isActive('/angular')" onclick="navigateAngular">vs&nbsp;Angular</a>
            </div>
        </nav>
    `,
    styles: `
        nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100;
              display: flex; justify-content: space-between; align-items: center;
              padding: 1rem 2rem; background: rgba(0,0,0,0.85);
              backdrop-filter: blur(8px); border-bottom: 1px solid #222; }
        .logo { font-weight: 900; font-size: 1.4rem; color: #fff;
                text-decoration: none; letter-spacing: -1px; cursor: pointer;
                margin-right: 2rem; }
        .links { display: flex; gap: 2rem; }
        .links a { color: #888; text-decoration: none; font-size: 0.9rem;
                   letter-spacing: 0.05em; cursor: pointer; transition: color 0.2s;
                   white-space: nowrap; position: relative; }
        .links a:hover { color: #fff; }
        .links a.active { color: #fff; }
        .links a.active::after { content: ''; position: absolute;
                   left: 0; right: 0; bottom: -4px;
                   height: 2px; background: #fff; }
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
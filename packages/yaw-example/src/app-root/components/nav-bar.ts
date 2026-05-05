import { map, type Observable } from 'rxjs';
import { Component, Inject, RxElement, state } from '@yaw-rx/core';
import { Router } from '@yaw-rx/core/router';
import { Hamburger } from '../directives/hamburger.js';

@Component({
    selector: 'nav-bar',
    directives: [Hamburger],
    template: `
        <nav>
            <a class="logo" hamburger><span class="logo-text">YAW</span></a>
            <div class="links">
                <a [class.active]="isActive('/')" onclick="navigateHome">Manifesto</a>
                <a [class.active]="isActive('/showcase')" onclick="navigateShowcase">Showcase</a>
                <a [class.active]="isActive('/docs')" onclick="navigateDocs">Docs</a>
                <a [class.active]="isActive('/examples')" onclick="navigateExamples">Examples</a>
            </div>
        </nav>
    `,
    styles: `
        nav { position: fixed; top: 0; left: 0; right: 0; z-index: 300;
              display: flex; justify-content: space-between; align-items: center;
              padding: 1rem 2rem; background: rgba(0,0,0,0.85);
              backdrop-filter: blur(8px); border-bottom: var(--border-width) solid var(--bg-6); }
        .logo { font-weight: 900; font-size: 1.4rem; color: var(--white);
                text-decoration: none; letter-spacing: -1px;
                margin-right: 2rem; position: relative; cursor: default;
                -webkit-tap-highlight-color: transparent; }
        .logo.has-menu { cursor: pointer; }
        .logo.has-funnel::after { content: ''; position: absolute;
                   bottom: -7px; left: 0; width: 100%; height: 8px;
                   background:
                       linear-gradient(var(--text), var(--text)) center 0    / 70% 1px no-repeat,
                       linear-gradient(var(--text), var(--text)) center 50%  / 50% 1px no-repeat,
                       linear-gradient(var(--text), var(--text)) center 100% / 30% 1px no-repeat;
                   opacity: 0; transition: opacity 0.8s ease, background 0.3s ease; }
        .logo.has-funnel.funnel-visible::after { opacity: 0.7; }
        .logo.funnel-visible .logo-text {
          -webkit-mask-image: linear-gradient(-75deg, var(--black) 30%, rgba(0,0,0,.6) 50%, var(--black) 70%);
          -webkit-mask-size: 200%;
          animation: shine 2s forwards;
        }
        @-webkit-keyframes shine {
          from {
            -webkit-mask-position: 150%;
          }
          to {
            -webkit-mask-position: -50%;
          }
        }
        .logo.menu-open::after {
                   opacity: 1;
                   background:
                       linear-gradient(var(--accent), var(--accent)) center 0    / 70% 1px no-repeat,
                       linear-gradient(var(--accent), var(--accent)) center 50%  / 50% 1px no-repeat,
                       linear-gradient(var(--accent), var(--accent)) center 100% / 30% 1px no-repeat; }
        .links { display: flex; gap: 2rem; overflow-x: auto; scrollbar-width: none; }
        .links::-webkit-scrollbar { display: none; }
        .links a { color: var(--secondary); text-decoration: none; font-size: 0.9rem;
                   letter-spacing: 0.05em; cursor: pointer; transition: color 0.2s;
                   white-space: nowrap; position: relative;
                   -webkit-tap-highlight-color: transparent; }
        .links a:hover { color: var(--white); }
        .links a.active { color: var(--white); }
        .links a.active::after { content: ''; position: absolute;
                   left: 0; right: 0; bottom: -4px;
                   height: 2px; background: var(--white); }
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
}
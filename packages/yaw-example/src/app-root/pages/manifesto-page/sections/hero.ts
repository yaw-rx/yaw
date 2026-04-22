import 'reflect-metadata';
import { Component, RxElement } from 'yaw';

@Component({
    selector: 'hero-section',
    template: `
        <div class="hero">
            <h1 class="title">You're All Wrong.</h1>
            <p class="sub">The DOM is not your enemy.</p>
            <div class="stats">
                <stat-counter label="KB bundle" target="4"></stat-counter>
                <stat-counter label="dependencies" target="3"></stat-counter>
                <stat-counter label="virtual DOM" target="0"></stat-counter>
            </div>
        </div>
    `,
    styles: `
        :host { display: block; min-height: calc(100vh / 1.75); display: flex; align-items: center;
                justify-content: center; background: #000; padding: 6rem 2rem 4rem; }
        .hero { max-width: 800px; text-align: center; }
        .title { font-size: clamp(3rem, calc(10vw / 1.75), 7rem); font-weight: 900; color: #fff;
                 letter-spacing: -4px; line-height: 1; margin: 0 0 1.5rem; }
        .sub { font-size: 1.25rem; color: #666; line-height: 1.6; margin: 0 0 4rem; }
        .stats { display: flex; gap: 4rem; justify-content: center; }
    `
})
export class HeroSection extends RxElement {}

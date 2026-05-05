import { Component, RxElement } from '@yaw-rx/core';

@Component({
    selector: 'footer-section',
    template: `
        <footer>
            <p class="size">This page: <strong>32KB</strong> gzipped.</p>
            <p class="compare">React 19: 60KB. Angular 21: 171KB. You do the math.</p>
            <p class="copy">You're All Wrong</p>
        </footer>
    `,
    styles: `
        :host { display: block; border-top: var(--border-width) solid var(--bg-3); padding: 4rem 2rem;
                text-align: center; background: var(--black); }
        footer { max-width: 720px; margin: 0 auto; }
        .size { font-size: 1.5rem; color: var(--white); margin: 0 0 0.5rem; }
        .size strong { color: #4ade80; }
        .compare { color: var(--dim); margin: 0 0 2rem; }
        .copy { color: var(--bg-7); font-size: 0.8rem; }
    `
})
export class PageFooter extends RxElement {}

import { Component, RxElement } from '@yaw-rx/core';

@Component({
    selector: 'page-footer',
    template: `
        <footer>
            <p class="size">This page: <strong>32KB</strong> gzipped.</p>
            <p class="compare">React 19: 60KB. Angular 21: 171KB. You do the math.</p>
            <p class="copy">You're All Wrong</p>
        </footer>
    `,
    styles: `
        :host { display: block; border-top: 1px solid #111; padding: 4rem 2rem;
                text-align: center; background: #000; }
        footer { max-width: 720px; margin: 0 auto; }
        .size { font-size: 1.5rem; color: #fff; margin: 0 0 0.5rem; }
        .size strong { color: #4ade80; }
        .compare { color: #555; margin: 0 0 2rem; }
        .copy { color: #242424; font-size: 0.8rem; }
    `
})
export class PageFooter extends RxElement {}

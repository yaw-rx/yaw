import 'reflect-metadata';
import { Component, RxElementBase } from 'yaw';

@Component({
    selector: 'page-footer',
    template: `
        <footer>
            <p class="size">This page: <strong>~4KB</strong> gzipped.</p>
            <p class="compare">React: ~140KB. Angular: ~220KB. You do the math.</p>
            <p class="copy">YAW — You're All Wrong &copy; 2024</p>
        </footer>
    `,
    styles: `
        page-footer { display: block; border-top: 1px solid #111; padding: 4rem 2rem;
                      text-align: center; background: #000; }
        footer { max-width: 720px; margin: 0 auto; }
        .size { font-size: 1.5rem; color: #fff; margin: 0 0 0.5rem; }
        .size strong { color: #4ade80; }
        .compare { color: #555; margin: 0 0 2rem; }
        .copy { color: #333; font-size: 0.8rem; }
    `
})
export class PageFooter extends RxElementBase {}

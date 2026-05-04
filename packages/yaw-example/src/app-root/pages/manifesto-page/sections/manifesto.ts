import { Component, RxElement, state } from '@yaw-rx/core';

@Component({
    selector: 'manifesto-section',
    template: `
        <section>
            <h2 class="heading">{{heading}}</h2>
            <div class="body"><slot></slot></div>
        </section>
    `,
    styles: `
        :host { display: block; max-width: 720px; margin: 0 auto;
                padding: 2rem 2rem; border-top: 1px solid #222; }
        .heading { font-size: 2rem; font-weight: 900; color: #fff; letter-spacing: -1px;
                   margin: 0 0 1.5rem; }
        .body { color: #888; line-height: 1.8; font-size: 1.05rem; }
        .body p { margin: 0 0 1rem; }
        .body p:last-child { margin-bottom: 0; }
        .body .closer { color: #ccc; font-weight: 900; font-size: 1.15rem }
        .body code { background: #111; padding: 0.1rem 0.4rem;
                     border-radius: 3px; font-size: 0.9em; color: #8af; }
        .body .model { display: block; border-left: 2px solid #333; padding-left: 1rem;
                       margin: 0 0 1rem; color: #aaa; font-size: 1.15rem; font-style: italic; }
        .reveal { opacity: 0; transform: translateY(24px);
                  transition: opacity 0.6s ease, transform 0.6s ease; }
        .revealed { opacity: 1; transform: none; }
        @media (max-width: 480px) {
            :host { padding: 3rem 1rem; }
            .heading { font-size: 1.5rem; }
        }
    `
})
export class ManifestoSection extends RxElement {
    @state heading = '';
}

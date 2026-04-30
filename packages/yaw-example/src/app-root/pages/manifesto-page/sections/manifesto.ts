import { Component, RxElement, state } from 'yaw';

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
                padding: 5rem 2rem; border-top: 1px solid #111; }
        .heading { font-size: 2rem; font-weight: 900; color: #fff; letter-spacing: -1px;
                   margin: 0 0 1.5rem; }
        .body { color: #888; line-height: 1.8; font-size: 1.05rem; }
        .reveal { opacity: 0; transform: translateY(24px);
                  transition: opacity 0.6s ease, transform 0.6s ease; }
        .revealed { opacity: 1; transform: none; }
    `
})
export class ManifestoSection extends RxElement {
    @state heading = '';
}

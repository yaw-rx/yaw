import 'reflect-metadata';
import { Component, RxElement } from 'yaw';

@Component({
    selector: 'page-echo',
    template: `
        <div class="echo">
            <div class="label">child template — authored with zero carets</div>
            <div class="row">
                <code>{{ parentRef.count }}</code>
                <span class="sep">·</span>
                <code>{{ parentRef.status }}</code>
            </div>
            <div class="row buttons">
                <button onclick="parentRef.increment(2)">parentRef.increment(2)</button>
                <button onclick="parentRef.reset">parentRef.reset</button>
            </div>
        </div>
    `,
    styles: `
        :host { display: block; }
        .echo { background: #0a1128; border: 1px solid #1a2352; border-radius: 6px;
                padding: 1rem; color: #8af; font-family: monospace; font-size: 0.85rem; }
        .label { color: #556; font-size: 0.7rem; letter-spacing: 0.08em;
                 text-transform: uppercase; margin-bottom: 0.6rem; }
        .row { display: flex; gap: 0.5rem; align-items: center; margin-top: 0.4rem; }
        .row code { color: #8af; background: transparent; padding: 0; }
        .sep { color: #334; }
        .buttons button { background: #0f1a3a; border: 1px solid #1a2352; color: #8af;
                          padding: 0.35rem 0.7rem; font: inherit; font-size: 0.8rem;
                          cursor: pointer; border-radius: 4px; }
        .buttons button:hover { background: #182555; color: #fff; }
    `
})
export class PageEcho extends RxElement {}

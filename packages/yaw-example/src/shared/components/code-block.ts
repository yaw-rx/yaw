import 'reflect-metadata';
import { Component, RxElement } from 'yaw';
import { dedent, escapeHtml, highlightTs } from '../lib/code-highlight.js';

@Component({
    selector: 'code-block',
    styles: `
        :host { display: block; }
        .cb { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 8px; padding: 1.25rem; overflow-x: auto; margin: 0;
              backdrop-filter: blur(4px); }
        code { font-family: 'Fira Code', 'Cascadia Code', monospace;
               font-size: 0.8rem; color: #ddd; line-height: 1.55; white-space: pre; background: none; }
        .tk-keyword { color: #c792ea; }
        .tk-string { color: #c3e88d; }
        .tk-number { color: #f78c6c; }
        .tk-comment { color: #546e7a; font-style: italic; }
        .tk-decorator { color: #ffcb6b; }
        .tk-type { color: #82aaff; }
        .tk-ident { color: #eeffff; }
    `
})
export class CodeBlock extends RxElement {
    override onInit(): void {
        const source = dedent(this.textContent);
        const content = this.getAttribute('lang') === 'ts' ? highlightTs(source) : escapeHtml(source);
        this.innerHTML = `<pre class="cb"><code>${content}</code></pre>`;
    }
}

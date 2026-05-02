import { Component, RxElement, state } from '@yaw-rx/core';
import { readInert } from '@yaw-rx/common';
import { dedent, escapeHtml, highlightBash, highlightDockerfile, highlightHtml, highlightJs, highlightJson, highlightTs } from './code-block/code-highlight.js';

@Component({
    selector: 'code-block',
    styles: `
        :host { display: flex; min-height: 0; }
        .cb { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 8px; padding: 1.25rem; overflow-x: auto; margin: 0;
              backdrop-filter: blur(4px); flex: 1; box-sizing: border-box; min-width: 0; }
        code { font-family: 'Fira Code', 'Cascadia Code', monospace;
               font-size: 0.8rem; color: #ddd; line-height: 1.55; white-space: pre; background: none; }
        .tk-keyword { color: #c792ea; }
        .tk-string { color: #c3e88d; }
        .tk-number { color: #f78c6c; }
        .tk-comment { color: #546e7a; font-style: italic; }
        .tk-regex { color: #ff5370; }
        .tk-decorator { color: #ffcb6b; }
        .tk-type { color: #ffcb6b; }
        .tk-fn { color: #82aaff; }
        .tk-const { color: #f78c6c; }
        .tk-ident { color: #eeffff; }
        .tk-tag { color: #f07178; }
        .tk-attr { color: #ffcb6b; }
        .tk-punct { color: #89ddff; }
    `
})
export class CodeBlock extends RxElement {
    @state syntax = '';
    override onInit(): void {
        const source = dedent(readInert(this));
        const lang = this.syntax;
        const highlighters: Record<string, (s: string) => string> = {
            ts: highlightTs, js: highlightJs, html: highlightHtml,
            json: highlightJson, bash: highlightBash, dockerfile: highlightDockerfile,
        };
        const content = (highlighters[lang] ?? escapeHtml)(source);
        this.innerHTML = `<pre class="cb"><code>${content}</code></pre>`;
    }
}

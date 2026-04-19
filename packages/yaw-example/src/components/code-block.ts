import 'reflect-metadata';
import { Component, RxElementBase } from 'yaw';

@Component({
    selector: 'code-block',
    template: `<pre><code><slot></slot></code></pre>`,
    styles: `
        code-block { display: block; }
        pre { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 8px;
              padding: 1.5rem; overflow-x: auto; margin: 1.5rem 0; }
        code { font-family: 'Fira Code', 'Cascadia Code', monospace;
               font-size: 0.875rem; color: #ccc; line-height: 1.6; white-space: pre; }
    `
})
export class CodeBlock extends RxElementBase {}

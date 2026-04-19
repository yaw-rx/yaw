import 'reflect-metadata';
import { Component, RxElementBase } from 'yaw';

@Component({
    selector: 'code-block',
    template: `<pre><code><slot></slot></code></pre>`,
    styles: `
        code-block { display: block; }
        pre { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 8px; padding: 1.5rem; overflow-x: auto; margin: 1.5rem 0;
              backdrop-filter: blur(4px); }
        code { font-family: 'Fira Code', 'Cascadia Code', monospace;
               font-size: 0.875rem; color: #ddd; line-height: 1.6; white-space: pre; background: none; }
    `
})
export class CodeBlock extends RxElementBase {}

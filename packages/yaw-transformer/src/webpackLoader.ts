import { createTransformedProgram, type TransformedProgram } from './bundlerPlugin.js';

let tp: TransformedProgram | undefined;
let lastCompilation: unknown;

export default function yawLoader(this: { resourcePath: string; _compilation: unknown }, source: string): string {
    if (!source.includes('@Component') && !source.includes('@state')) return source;
    if (tp === undefined || this._compilation !== lastCompilation) {
        tp = createTransformedProgram(process.cwd());
        lastCompilation = this._compilation;
    }
    if (tp === undefined) return source;
    return tp.getSource(this.resourcePath) ?? source;
}

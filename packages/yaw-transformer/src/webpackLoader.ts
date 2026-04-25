import { createTransformedProgram, type TransformedProgram } from './bundlerPlugin.js';

let tp: TransformedProgram | undefined;

export default function yawLoader(this: { resourcePath: string }, source: string): string {
    if (!source.includes('@Component')) return source;
    if (tp === undefined) tp = createTransformedProgram(process.cwd());
    if (tp === undefined) return source;
    return tp.getSource(this.resourcePath) ?? source;
}

import { createTransformedProgram, type TransformedProgram } from './bundlerPlugin.js';

interface EsbuildOnLoadArgs { path: string }
interface EsbuildOnLoadResult { contents: string; loader: string }
interface EsbuildBuild {
    onLoad(
        options: { filter: RegExp },
        callback: (args: EsbuildOnLoadArgs) => EsbuildOnLoadResult | null | undefined,
    ): void;
}
interface EsbuildPlugin {
    name: string;
    setup(build: EsbuildBuild): void;
}

export const esbuildPlugin = (): EsbuildPlugin => ({
    name: 'yaw-inject-transform',
    setup(build) {
        let tp: TransformedProgram | undefined;

        build.onLoad({ filter: /\.ts$/ }, (args) => {
            if (args.path.includes('node_modules')) return null;
            if (tp === undefined) tp = createTransformedProgram(process.cwd());
            if (tp === undefined) return null;
            const output = tp.getSource(args.path);
            if (output === undefined) return null;
            return { contents: output, loader: 'ts' };
        });
    },
});

import { createTransformedProgram, type TransformedProgram } from '@yaw-rx/transformer';

interface EsbuildOnLoadArgs { path: string }
interface EsbuildOnLoadResult { contents: string; loader: string }
interface EsbuildBuild {
    onStart(callback: () => void): void;
    onLoad(
        options: { filter: RegExp },
        callback: (args: EsbuildOnLoadArgs) => EsbuildOnLoadResult | null | undefined,
    ): void;
}
interface EsbuildPlugin {
    name: string;
    setup(build: EsbuildBuild): void;
}

export const esbuildTransform = (): EsbuildPlugin => ({
    name: 'yaw-transform',
    setup(build) {
        let tp: TransformedProgram | undefined;

        build.onStart(() => {
            tp = createTransformedProgram(process.cwd());
        });

        build.onLoad({ filter: /\.ts$/ }, (args) => {
            if (args.path.includes('node_modules')) return null;
            if (tp === undefined) return null;
            const output = tp.getSource(args.path);
            if (output === undefined) return null;
            return { contents: output, loader: 'ts' };
        });
    },
});

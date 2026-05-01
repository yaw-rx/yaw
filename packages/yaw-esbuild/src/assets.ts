import { readFileSync } from 'fs';

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

export const esbuildAssets = (extensions: string[]): EsbuildPlugin => {
    const suffixed = extensions.map(ext => ext.startsWith('.') ? ext : `.${ext}`);
    const escaped = suffixed.map(ext => ext.replace(/\./g, '\\.')).join('|');
    const filter = new RegExp(`(${escaped})$`);

    return {
        name: 'yaw-assets',
        setup(build) {
            build.onLoad({ filter }, (args) => ({
                contents: `export default ${JSON.stringify(readFileSync(args.path, 'utf-8'))}`,
                loader: 'js',
            }));
        },
    };
};

import ts from 'typescript';
import { programTransformer } from './programTransformer.js';

export interface TransformedProgram {
    getSource(fileName: string): string | undefined;
}

export const createTransformedProgram = (root: string): TransformedProgram | undefined => {
    const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
    if (configPath === undefined) return undefined;

    const parsed = ts.getParsedCommandLineOfConfigFile(
        configPath,
        {},
        ts.sys as unknown as ts.ParseConfigFileHost,
    );
    if (parsed === undefined) return undefined;

    const raw = ts.createProgram(parsed.fileNames, { ...parsed.options, plugins: [] });
    const program = programTransformer(raw, undefined);

    return {
        getSource(fileName) {
            const sf = program.getSourceFile(fileName);
            return sf?.getFullText();
        },
    };
};

/**
 * Vite plugin that runs the yaw DI transformer at compile time.
 *
 * Intercepts `.ts` files containing `@Component`, creates a TypeScript
 * program to obtain the type checker, and applies the inject transformer.
 * The transformed source is printed back as TypeScript for Vite's esbuild
 * pipeline to handle final transpilation.
 *
 * @returns A Vite plugin object with `name`, `enforce`, and `transform` hook.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import { vitePlugin } from 'yaw-transformer';
 *
 * export default defineConfig({
 *     plugins: [vitePlugin()],
 * });
 * ```
 */
import ts from 'typescript';
import transformer from './transformer.js';
import type { Plugin } from 'vite';

export const vitePlugin = (): Plugin => {
    let program: ts.Program | undefined;
    let configPath: string | undefined;

    return {
        name: 'yaw-inject-transform',
        enforce: 'pre',

        configResolved(config) {
            configPath = ts.findConfigFile(
                config.root,
                ts.sys.fileExists,
                'tsconfig.json',
            );
        },

        transform(code, id) {
            if (!id.endsWith('.ts') || id.includes('node_modules') || id.endsWith('.d.ts')) return null;
            if (!code.includes('@Component')) return null;

            if (program === undefined && configPath !== undefined) {
                const parsed = ts.getParsedCommandLineOfConfigFile(
                    configPath,
                    {},
                    ts.sys as unknown as ts.ParseConfigFileHost,
                );
                if (parsed !== undefined) {
                    program = ts.createProgram(parsed.fileNames, parsed.options);
                }
            }

            if (program === undefined) return null;

            const sourceFile = program.getSourceFile(id);
            if (sourceFile === undefined) return null;

            const result = ts.transform(sourceFile, [transformer(program)]);
            const printer = ts.createPrinter();
            const output = printer.printFile(result.transformed[0]!);
            result.dispose();

            return { code: output, map: null };
        },
    };
};

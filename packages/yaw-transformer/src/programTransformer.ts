import ts from 'typescript';
import transformer from './transformer.js';

interface VersionedSourceFile extends ts.SourceFile {
    version: string;
}

export const programTransformer = (
    program: ts.Program,
    host: ts.CompilerHost | undefined,
): ts.Program => {
    const diag: string[] = [`[${new Date().toISOString()}] programTransformer invoked`];
    try {
    const transformerFactory = transformer(program);
    const printer = ts.createPrinter();
    const patches = new Map<string, string>();

    for (const sf of program.getSourceFiles()) {
        if (sf.isDeclarationFile) continue;
        if (sf.fileName.includes('node_modules')) continue;
        if (!sf.getFullText().includes('@Component')) continue;

        const result = ts.transform(sf, [transformerFactory]);
        const output = printer.printFile(result.transformed[0]!);
        result.dispose();

        patches.set(sf.fileName, output);
    }

    diag.push(`patches: ${patches.size} files`);
    for (const [k, v] of patches) {
        const shortName = k.replace(/.*packages\//, '');
        diag.push(`--- ${shortName} (${v.length} chars) ---`);
        diag.push(v.slice(0, 500));
    }

    diag.push(`host provided: ${host !== undefined}`);
    diag.push(`rootFileNames: ${program.getRootFileNames().length}`);
    const opts = program.getCompilerOptions();
    diag.push(`configFilePath: ${(opts as any).configFilePath}`);
    diag.push(`projectReferences: ${JSON.stringify(program.getProjectReferences())}`);
    diag.push(`lib: ${JSON.stringify(opts.lib)}`);

    ts.sys.writeFile('/tmp/yaw-transformer-debug.txt', diag.join('\n'));
    if (patches.size === 0) return program;

    const compilerOptions = program.getCompilerOptions();
    const originalHost = host ?? ts.createCompilerHost(compilerOptions);
    const originalGetSourceFile = originalHost.getSourceFile.bind(originalHost);

    const newHost: ts.CompilerHost = Object.create(originalHost);
    (newHost as any).onReleaseOldSourceFile = undefined;

    const allOriginalSourceFiles = new Map<string, ts.SourceFile>();
    for (const sf of program.getSourceFiles()) {
        allOriginalSourceFiles.set(sf.fileName, sf);
    }

    newHost.getSourceFile = (fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile) => {
        const patched = patches.get(fileName);
        if (patched !== undefined) {
            const sf = ts.createSourceFile(fileName, patched, languageVersionOrOptions, true) as VersionedSourceFile;
            sf.version = ts.sys.createHash!(patched);
            const orig = allOriginalSourceFiles.get(fileName);
            if (orig !== undefined) {
                (sf as any).resolvedModules = (orig as any).resolvedModules;
                (sf as any).resolvedTypeReferenceDirectiveNames = (orig as any).resolvedTypeReferenceDirectiveNames;
            }
            return sf;
        }
        const orig = allOriginalSourceFiles.get(fileName);
        if (orig !== undefined) return orig;
        return originalGetSourceFile(fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile);
    };

    const savedPlugins = compilerOptions['plugins'];
    compilerOptions['plugins'] = [];
    const newProgram = ts.createProgram(
        program.getRootFileNames(),
        compilerOptions,
        newHost,
        program,
    );
    compilerOptions['plugins'] = savedPlugins;

    const newDiags = ts.getPreEmitDiagnostics(newProgram);
    diag.push(`\n--- NEW PROGRAM DIAGNOSTICS: ${newDiags.length} ---`);
    for (const d of newDiags.slice(0, 30)) {
        const file = d.file ? d.file.fileName.replace(/.*packages\//, '') : '??';
        const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
        diag.push(`  ${file}:${d.start}: ${msg.slice(0, 200)}`);
    }

    diag.push(`\nnewProgram sourceFiles: ${newProgram.getSourceFiles().length}`);
    diag.push(`newProgram rootFileNames: ${newProgram.getRootFileNames().length}`);

    ts.sys.writeFile('/tmp/yaw-transformer-debug.txt', diag.join('\n'));
    return newProgram;

    } catch (err) {
        diag.push(`\nCRASH: ${err instanceof Error ? err.stack : String(err)}`);
        ts.sys.writeFile('/tmp/yaw-transformer-debug.txt', diag.join('\n'));
        return program;
    }
};

import ts from 'typescript';
import { isComponentClass } from './isComponentClass.js';
import { getStateTypes, getStateFieldInfos } from './getStateTypes.js';

interface VersionedSourceFile extends ts.SourceFile {
    version: string;
}

interface Injection { pos: number; text: string; }

const buildTextPatches = (sf: ts.SourceFile, checker: ts.TypeChecker): string | undefined => {
    const sourceText = sf.getFullText();
    const injections: Injection[] = [];
    let needsBsImport = false;

    ts.forEachChild(sf, (node) => {
        if (!ts.isClassDeclaration(node)) return;
        const isComponent = isComponentClass(node, checker);
        if (!isComponent) return;

        const stateTypes = getStateTypes(node, checker);
        const stateFieldInfos = getStateFieldInfos(node, checker);

        if (stateTypes.size === 0) return;
        needsBsImport = true;

        for (const member of node.members) {
            if (!ts.isPropertyDeclaration(member) || !ts.isIdentifier(member.name)) continue;
            const info = stateFieldInfos.get(member.name.text);
            if (info === undefined) continue;

            const hasAccessor = member.modifiers?.some(m => m.kind === ts.SyntaxKind.AccessorKeyword) ?? false;
            if (!hasAccessor) {
                injections.push({ pos: member.name.getStart(sf), text: 'accessor ' });
            }

            if (member.type === undefined && member.initializer === undefined) {
                const nameEnd = member.name.getEnd();
                injections.push({ pos: nameEnd, text: `: ${info.typeName}` });
            }
        }

        const stateTypesObj = [...stateTypes].map(([k, v]) => `${k}: "${v}"`).join(', ');
        const dollarDecls = [...stateFieldInfos].map(([k, info]) => {
            const typeText = info.typeNode !== undefined
                ? sourceText.slice(info.typeNode.pos, info.typeNode.end).trim()
                : info.typeName;
            return `    declare ${k}$: BehaviorSubject<${typeText}>;`;
        }).join('\n');

        injections.push({
            pos: node.members.pos,
            text: `\n    static __stateTypes = { ${stateTypesObj} };\n${dollarDecls}\n`,
        });
    });

    if (injections.length === 0) return undefined;

    if (needsBsImport) {
        const hasBsImport = sf.statements.some(s =>
            ts.isImportDeclaration(s) &&
            ts.isStringLiteral(s.moduleSpecifier) &&
            s.moduleSpecifier.text === 'rxjs' &&
            s.importClause?.namedBindings &&
            ts.isNamedImports(s.importClause.namedBindings) &&
            s.importClause.namedBindings.elements.some(e => e.name.text === 'BehaviorSubject'),
        );
        if (!hasBsImport) {
            injections.push({ pos: sourceText.length, text: "\nimport type { BehaviorSubject } from 'rxjs';\n" });
        }
    }

    injections.sort((a, b) => a.pos - b.pos);

    let patched = '';
    let cursor = 0;
    for (const inj of injections) {
        patched += sourceText.slice(cursor, inj.pos) + inj.text;
        cursor = inj.pos;
    }
    patched += sourceText.slice(cursor);
    return patched;
};

export const programTransformer = (
    program: ts.Program,
    host: ts.CompilerHost | undefined,
): ts.Program => {
    const diag: string[] = [`[${new Date().toISOString()}] programTransformer invoked`];
    try {
    const checker = program.getTypeChecker();
    const patches = new Map<string, string>();

    for (const sf of program.getSourceFiles()) {
        if (sf.isDeclarationFile) continue;
        if (sf.fileName.includes('node_modules')) continue;
        if (!sf.getFullText().includes('@Component') && !sf.getFullText().includes('@state')) continue;

        const patched = buildTextPatches(sf, checker);
        if (patched !== undefined) {
            patches.set(sf.fileName, patched);
        }
    }

    diag.push(`patches: ${patches.size} files`);
    for (const [k, v] of patches) {
        const shortName = k.replace(/.*packages\//, '');
        diag.push(`--- ${shortName} (${v.length} chars) ---`);
        diag.push(v.slice(0, 500));
        const safeName = shortName.replace(/\//g, '__');
        if (!ts.sys.directoryExists('/tmp/yaw-transformed')) ts.sys.createDirectory('/tmp/yaw-transformed');
        ts.sys.writeFile(`/tmp/yaw-transformed/${safeName}`, v);
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
        if (orig !== undefined && !(orig as any).redirectInfo) return orig;
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

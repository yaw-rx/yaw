import type ts from 'typescript';

const init = (modules: { typescript: typeof ts }): ts.server.PluginModule => {
    const tsModule = modules.typescript;

    const create = (info: ts.server.PluginCreateInfo): ts.LanguageService => {
        const log = (msg: string) => info.project.projectService.logger.info(`[yaw-ts-plugin] ${msg}`);
        const fs = require('fs') as typeof import('fs');
        const D = (msg: string) => fs.appendFileSync('/tmp/yaw-ts-plugin.log', `[${new Date().toISOString()}] ${msg}\n`);
        D(`=== plugin loaded === project: ${info.project.getProjectName()}`);
        log('loaded');

        const proxy = Object.create(null) as ts.LanguageService;
        for (const key of Object.keys(info.languageService)) {
            (proxy as unknown as Record<string, unknown>)[key] = (...args: unknown[]) =>
                (info.languageService as unknown as Record<string, Function>)[key]!(...args);
        }

        const hasDecoratorNamed = (node: ts.Node, name: string): boolean =>
            (tsModule.getDecorators(node as ts.HasDecorators) ?? []).some((d) => {
                const expr = d.expression;
                if (tsModule.isIdentifier(expr)) return expr.text === name;
                if (tsModule.isCallExpression(expr) && tsModule.isIdentifier(expr.expression))
                    return expr.expression.text === name;
                return false;
            });

        const inferFromNode = (node: ts.Expression, sourceText: string): string | undefined => {
            switch (node.kind) {
                case tsModule.SyntaxKind.NumericLiteral: return 'number';
                case tsModule.SyntaxKind.StringLiteral: return 'string';
                case tsModule.SyntaxKind.NoSubstitutionTemplateLiteral: return 'string';
                case tsModule.SyntaxKind.TemplateExpression: return 'string';
                case tsModule.SyntaxKind.TrueKeyword: return 'boolean';
                case tsModule.SyntaxKind.FalseKeyword: return 'boolean';
                case tsModule.SyntaxKind.BigIntLiteral: return 'bigint';
                case tsModule.SyntaxKind.NullKeyword: return 'null';
            }

            if (tsModule.isIdentifier(node) && node.text === 'undefined') return 'undefined';

            if (tsModule.isPrefixUnaryExpression(node)) {
                if (node.operand.kind === tsModule.SyntaxKind.NumericLiteral) return 'number';
                if (node.operand.kind === tsModule.SyntaxKind.BigIntLiteral) return 'bigint';
            }

            if (tsModule.isAsExpression(node)) {
                return sourceText.slice(node.type.pos, node.type.end).trim();
            }

            if (tsModule.isNewExpression(node) && tsModule.isIdentifier(node.expression)) {
                const name = node.expression.text;
                if (node.typeArguments !== undefined && node.typeArguments.length > 0) {
                    const args = node.typeArguments.map((a) => sourceText.slice(a.pos, a.end).trim()).join(', ');
                    return `${name}<${args}>`;
                }
                return name;
            }

            if (tsModule.isArrayLiteralExpression(node)) {
                if (node.elements.length === 0) return 'unknown[]';
                const elementTypes = new Set<string>();
                for (const el of node.elements) {
                    const t = inferFromNode(el, sourceText);
                    if (t === undefined) return 'unknown[]';
                    elementTypes.add(t);
                }
                const types = [...elementTypes];
                if (types.length === 1) return `${types[0]}[]`;
                return `(${types.join(' | ')})[]`;
            }

            if (tsModule.isObjectLiteralExpression(node)) {
                if (node.properties.length === 0) return 'Record<string, unknown>';
                const props: string[] = [];
                for (const p of node.properties) {
                    if (!tsModule.isPropertyAssignment(p)) return 'Record<string, unknown>';
                    const name = tsModule.isIdentifier(p.name) ? p.name.text :
                                 tsModule.isStringLiteral(p.name) ? p.name.text : undefined;
                    if (name === undefined) return 'Record<string, unknown>';
                    const t = inferFromNode(p.initializer, sourceText);
                    if (t === undefined) return 'Record<string, unknown>';
                    props.push(`${name}: ${t}`);
                }
                return `{ ${props.join('; ')} }`;
            }

            if (tsModule.isConditionalExpression(node)) {
                const whenTrue = inferFromNode(node.whenTrue, sourceText);
                const whenFalse = inferFromNode(node.whenFalse, sourceText);
                if (whenTrue === undefined || whenFalse === undefined) return undefined;
                if (whenTrue === whenFalse) return whenTrue;
                return `${whenTrue} | ${whenFalse}`;
            }

            if (tsModule.isArrowFunction(node)) {
                if (node.type !== undefined) {
                    const params = node.parameters.map((p) => sourceText.slice(p.pos, p.end).trim()).join(', ');
                    const ret = sourceText.slice(node.type.pos, node.type.end).trim();
                    return `(${params}) => ${ret}`;
                }
                if (!tsModule.isBlock(node.body)) {
                    const ret = inferFromNode(node.body as ts.Expression, sourceText);
                    if (ret !== undefined) {
                        const params = node.parameters.map((p) => sourceText.slice(p.pos, p.end).trim()).join(', ');
                        return `(${params}) => ${ret}`;
                    }
                }
            }

            return undefined;
        };

        interface StateField { name: string; typeText: string; }

        interface Injection { originalPos: number; text: string; }

        interface PatchResult {
            patched: string;
            injections: Injection[];
        }

        const checkerTypeCache = new Map<string, Map<string, string>>();

        const getCheckerTypes = (fileName: string): Map<string, string> | undefined => {
            const program = info.languageService.getProgram();
            if (!program) { D(`getCheckerTypes(${fileName}): no program`); return undefined; }
            const checker = program.getTypeChecker();
            const programSf = program.getSourceFile(fileName);
            if (!programSf) { D(`getCheckerTypes(${fileName}): no source file in program`); return undefined; }

            const result = new Map<string, string>();

            tsModule.forEachChild(programSf, (node) => {
                if (!tsModule.isClassDeclaration(node)) return;
                if (!hasDecoratorNamed(node, 'Component')) return;
                const className = node.name?.text;
                if (className === undefined) return;

                for (const member of node.members) {
                    if (!tsModule.isPropertyDeclaration(member)) continue;
                    if (!tsModule.isIdentifier(member.name)) continue;
                    if (!hasDecoratorNamed(member, 'state')) continue;

                    const type = checker.getTypeAtLocation(member);
                    const typeText = checker.typeToString(
                        type, member, tsModule.TypeFormatFlags.NoTruncation,
                    );
                    result.set(`${className}.${member.name.text}`, typeText);
                }
            });

            D(`getCheckerTypes(${fileName}): ${result.size} entries`);
            return result.size > 0 ? result : undefined;
        };

        const mapsEqual = (a: Map<string, string>, b: Map<string, string>): boolean => {
            if (a.size !== b.size) return false;
            for (const [k, v] of a) { if (b.get(k) !== v) return false; }
            return true;
        };

        const analyseAndPatch = (sourceText: string, fileName: string): PatchResult | undefined => {
            D(`analyseAndPatch: ${fileName}`);
            const sf = tsModule.createSourceFile(fileName, sourceText, tsModule.ScriptTarget.Latest, true);
            const injections: Injection[] = [];

            let hasBehaviorSubjectImport = false;
            tsModule.forEachChild(sf, (node) => {
                if (!tsModule.isImportDeclaration(node)) return;
                const spec = node.moduleSpecifier;
                if (!tsModule.isStringLiteral(spec) || spec.text !== 'rxjs') return;
                const clause = node.importClause;
                if (!clause?.namedBindings || !tsModule.isNamedImports(clause.namedBindings)) return;
                for (const el of clause.namedBindings.elements) {
                    if (el.name.text === 'BehaviorSubject') { hasBehaviorSubjectImport = true; return; }
                }
            });
            const needsImport = !hasBehaviorSubjectImport;
            D(`  needsImport=${needsImport} (AST check)`);
            if (needsImport) {
                injections.push({ originalPos: sourceText.length, text: "\nimport type { BehaviorSubject } from 'rxjs';" });
            }

            const checkerTypes = checkerTypeCache.get(fileName);
            D(`  checkerTypes=${checkerTypes ? `${checkerTypes.size} entries: ${JSON.stringify([...checkerTypes.entries()])}` : 'none'}`);

            let classCount = 0;
            let totalFields = 0;
            tsModule.forEachChild(sf, (node) => {
                if (!tsModule.isClassDeclaration(node)) return;
                const isComponent = hasDecoratorNamed(node, 'Component');
                D(`  class ${node.name?.text ?? '<anon>'} @Component=${isComponent}`);
                if (!isComponent) return;
                classCount++;
                const className = node.name?.text;
                if (className === undefined) return;

                const fields: StateField[] = [];
                for (const member of node.members) {
                    if (!tsModule.isPropertyDeclaration(member)) continue;
                    if (!tsModule.isIdentifier(member.name)) continue;
                    const isState = hasDecoratorNamed(member, 'state');
                    if (!isState) continue;
                    totalFields++;

                    const hasAccessor = member.modifiers?.some(
                        (m) => m.kind === tsModule.SyntaxKind.AccessorKeyword,
                    ) ?? false;
                    D(`    @state ${member.name.text} hasAccessor=${hasAccessor}`);
                    if (!hasAccessor) {
                        injections.push({ originalPos: member.name.getStart(sf), text: 'accessor ' });
                    }

                    const fieldName = member.name.text;
                    let typeText: string | undefined;
                    let typeSource = 'fallback(any)';

                    if (member.type !== undefined) {
                        typeText = sourceText.slice(member.type.pos, member.type.end).trim();
                        typeSource = 'annotation';
                    }

                    if (typeText === undefined) {
                        typeText = checkerTypes?.get(`${className}.${fieldName}`);
                        if (typeText !== undefined) typeSource = 'checker';
                    }

                    if (typeText === undefined && member.initializer !== undefined) {
                        typeText = inferFromNode(member.initializer, sourceText);
                        if (typeText !== undefined) typeSource = 'inferred';
                    }

                    D(`    → type=${typeText ?? 'any'} source=${typeSource}`);
                    fields.push({ name: fieldName, typeText: typeText ?? 'any' });
                }

                if (fields.length > 0) {
                    const declarations = fields.map((f) =>
                        `    declare ${f.name}$: BehaviorSubject<${f.typeText}>;`
                    ).join('\n');
                    D(`    injecting ${fields.length} declarations at pos ${node.members.end}`);
                    injections.push({ originalPos: node.members.end, text: '\n' + declarations + '\n' });
                }
            });

            D(`  summary: classes=${classCount} fields=${totalFields} injections=${injections.length}`);
            if (injections.length === 0 || (injections.length === 1 && needsImport)) {
                D(`  → no patches needed, returning undefined`);
                return undefined;
            }

            injections.sort((a, b) => a.originalPos - b.originalPos);

            let patched = '';
            let cursor = 0;
            for (const inj of injections) {
                patched += sourceText.slice(cursor, inj.originalPos) + inj.text;
                cursor = inj.originalPos;
            }
            patched += sourceText.slice(cursor);

            D(`  → patched, ${patched.length} chars`);
            return { patched, injections };
        };

        const originalToPatched = (pos: number, injections: Injection[]): number => {
            let offset = 0;
            for (const inj of injections) {
                if (pos < inj.originalPos) break;
                offset += inj.text.length;
            }
            return pos + offset;
        };

        const patchedToOriginal = (pos: number, injections: Injection[]): number => {
            let offset = 0;
            for (const inj of injections) {
                const injPatchedPos = inj.originalPos + offset;
                if (pos < injPatchedPos) break;
                if (pos < injPatchedPos + inj.text.length) return inj.originalPos;
                offset += inj.text.length;
            }
            return pos - offset;
        };

        interface PatchedFile {
            version: string;
            snapshot: ts.IScriptSnapshot;
            injections: Injection[];
        }

        const patchedFiles = new Map<string, PatchedFile>();
        const versionBumps = new Map<string, number>();

        const originalHost = info.languageServiceHost;
        const originalGetScriptSnapshot = originalHost.getScriptSnapshot.bind(originalHost);
        const originalGetScriptVersion = originalHost.getScriptVersion.bind(originalHost);

        originalHost.getScriptVersion = (fileName: string): string => {
            const base = originalGetScriptVersion(fileName);
            const bump = versionBumps.get(fileName) ?? 0;
            return bump > 0 ? `${base}.p${bump}` : base;
        };

        originalHost.getScriptSnapshot = (fileName: string): ts.IScriptSnapshot | undefined => {
            const original = originalGetScriptSnapshot(fileName);
            if (original === undefined) { D(`getScriptSnapshot(${fileName}): original undefined`); return undefined; }
            if (!fileName.endsWith('.ts') || fileName.endsWith('.d.ts')) return original;

            D(`getScriptSnapshot: ${fileName}`);
            const fresh = getCheckerTypes(fileName);
            if (fresh !== undefined) {
                const prev = checkerTypeCache.get(fileName);
                if (prev === undefined || !mapsEqual(prev, fresh)) {
                    D(`  checker types changed, invalidating cache`);
                    checkerTypeCache.set(fileName, fresh);
                    patchedFiles.delete(fileName);
                }
            }

            const version = originalHost.getScriptVersion(fileName);
            const cached = patchedFiles.get(fileName);
            if (cached !== undefined && cached.version === version) {
                D(`  returning cached patch (version=${version})`);
                return cached.snapshot;
            }

            const sourceText = original.getText(0, original.getLength());
            const result = analyseAndPatch(sourceText, fileName);
            if (result === undefined) {
                D(`  no patch needed`);
                patchedFiles.delete(fileName);
                return original;
            }

            D(`  storing patched snapshot (version=${version})`);
            const snapshot = tsModule.ScriptSnapshot.fromString(result.patched);
            patchedFiles.set(fileName, { version, snapshot, injections: result.injections });
            return snapshot;
        };

        const getInjections = (fileName: string): Injection[] | undefined =>
            patchedFiles.get(fileName)?.injections;

        let isRefreshing = false;
        const refreshCheckerTypes = (fileName: string): void => {
            if (isRefreshing) return;
            const fresh = getCheckerTypes(fileName);
            if (fresh === undefined) return;
            const prev = checkerTypeCache.get(fileName);
            if (prev !== undefined && mapsEqual(prev, fresh)) return;
            D(`refreshCheckerTypes(${fileName}): types changed, re-patching`);
            checkerTypeCache.set(fileName, fresh);

            const original = originalGetScriptSnapshot(fileName);
            if (original === undefined) return;
            const sourceText = original.getText(0, original.getLength());
            const result = analyseAndPatch(sourceText, fileName);
            if (result === undefined) return;

            const bump = (versionBumps.get(fileName) ?? 0) + 1;
            versionBumps.set(fileName, bump);
            const baseVersion = originalGetScriptVersion(fileName);
            const version = `${baseVersion}.p${bump}`;
            const snapshot = tsModule.ScriptSnapshot.fromString(result.patched);
            patchedFiles.set(fileName, { version, snapshot, injections: result.injections });

            isRefreshing = true;
            try {
                (info.project as unknown as { markAsDirty(): void }).markAsDirty();
                info.project.updateGraph();
            } finally {
                isRefreshing = false;
            }
        };

        proxy.getSemanticDiagnostics = (fileName) => {
            refreshCheckerTypes(fileName);

            const diagnostics = info.languageService.getSemanticDiagnostics(fileName);
            D(`getSemanticDiagnostics(${fileName}): ${diagnostics.length} diagnostics`);
            const injections = getInjections(fileName);
            if (injections === undefined) return diagnostics;

            return diagnostics.map((d) => {
                if (d.start === undefined) return d;
                return { ...d, start: patchedToOriginal(d.start, injections) };
            });
        };

        proxy.getSyntacticDiagnostics = (fileName) => {
            const diagnostics = info.languageService.getSyntacticDiagnostics(fileName);
            const injections = getInjections(fileName);
            if (injections === undefined) return diagnostics;

            return diagnostics.map((d) => {
                if (d.start === undefined) return d;
                return { ...d, start: patchedToOriginal(d.start, injections) };
            });
        };

        proxy.getCompletionsAtPosition = (fileName, position, options) => {
            const injections = getInjections(fileName);
            const mappedPos = injections !== undefined ? originalToPatched(position, injections) : position;
            return info.languageService.getCompletionsAtPosition(fileName, mappedPos, options);
        };

        proxy.getQuickInfoAtPosition = (fileName, position) => {
            refreshCheckerTypes(fileName);
            const injections = getInjections(fileName);
            const mappedPos = injections !== undefined ? originalToPatched(position, injections) : position;
            const result = info.languageService.getQuickInfoAtPosition(fileName, mappedPos);
            if (result === undefined || injections === undefined) return result;
            return {
                ...result,
                textSpan: {
                    start: patchedToOriginal(result.textSpan.start, injections),
                    length: result.textSpan.length,
                },
            };
        };

        proxy.getDefinitionAndBoundSpan = (fileName, position) => {
            const injections = getInjections(fileName);
            const mappedPos = injections !== undefined ? originalToPatched(position, injections) : position;
            const result = info.languageService.getDefinitionAndBoundSpan(fileName, mappedPos);
            if (result === undefined) return result;
            const textSpan = injections !== undefined
                ? { start: patchedToOriginal(result.textSpan.start, injections), length: result.textSpan.length }
                : result.textSpan;
            const definitions = (result.definitions ?? []).map((d) => {
                if (d.fileName !== fileName) return d;
                const defInjections = getInjections(d.fileName);
                if (defInjections === undefined) return d;
                return { ...d, textSpan: { start: patchedToOriginal(d.textSpan.start, defInjections), length: d.textSpan.length } };
            });
            return { textSpan, definitions };
        };

        proxy.getSignatureHelpItems = (fileName, position, options) => {
            const injections = getInjections(fileName);
            const mappedPos = injections !== undefined ? originalToPatched(position, injections) : position;
            return info.languageService.getSignatureHelpItems(fileName, mappedPos, options);
        };

        proxy.getReferencesAtPosition = (fileName, position) => {
            const injections = getInjections(fileName);
            const mappedPos = injections !== undefined ? originalToPatched(position, injections) : position;
            const results = info.languageService.getReferencesAtPosition(fileName, mappedPos);
            if (results === undefined) return results;
            return results.map((r) => {
                const refInjections = getInjections(r.fileName);
                if (refInjections === undefined) return r;
                return { ...r, textSpan: { start: patchedToOriginal(r.textSpan.start, refInjections), length: r.textSpan.length } };
            });
        };

        const patchedSpanLength = (origStart: number, origLength: number, injs: Injection[]): number => {
            let extra = 0;
            const end = origStart + origLength;
            for (const inj of injs) {
                if (inj.originalPos >= origStart && inj.originalPos < end) extra += inj.text.length;
            }
            return origLength + extra;
        };

        const isInsideInjection = (patchedPos: number, injs: Injection[]): boolean => {
            let offset = 0;
            for (const inj of injs) {
                const injPatchedPos = inj.originalPos + offset;
                if (patchedPos >= injPatchedPos && patchedPos < injPatchedPos + inj.text.length) return true;
                if (injPatchedPos > patchedPos) break;
                offset += inj.text.length;
            }
            return false;
        };

        const remapClassificationSpans = (rawSpans: number[], injs: Injection[]): number[] => {
            const out: number[] = [];
            for (let i = 0; i < rawSpans.length; i += 3) {
                const pos = rawSpans[i]!;
                if (isInsideInjection(pos, injs)) continue;
                out.push(patchedToOriginal(pos, injs), rawSpans[i + 1]!, rawSpans[i + 2]!);
            }
            return out;
        };

        proxy.getEncodedSemanticClassifications = (fileName, span, format) => {
            const injections = getInjections(fileName);
            const mappedSpan = injections !== undefined
                ? { start: originalToPatched(span.start, injections), length: patchedSpanLength(span.start, span.length, injections) }
                : span;
            const result = info.languageService.getEncodedSemanticClassifications(fileName, mappedSpan, format);
            if (injections === undefined) return result;
            if (fileName.includes('navigation')) {
                D(`semClass ${fileName} origSpan={${span.start},${span.length}} mappedSpan={${mappedSpan.start},${mappedSpan.length}} injections=${JSON.stringify(injections.map(i => ({pos:i.originalPos,len:i.text.length})))}`);
                for (let i = 0; i < Math.min(result.spans.length, 30); i += 3) {
                    D(`  raw[${i/3}] pos=${result.spans[i]} len=${result.spans[i+1]} cls=${result.spans[i+2]} → orig=${patchedToOriginal(result.spans[i]!, injections)} inside=${isInsideInjection(result.spans[i]!, injections)}`);
                }
            }
            return { spans: remapClassificationSpans(result.spans.slice(), injections), endOfLineState: result.endOfLineState };
        };

        proxy.getEncodedSyntacticClassifications = (fileName, span) => {
            const injections = getInjections(fileName);
            const mappedSpan = injections !== undefined
                ? { start: originalToPatched(span.start, injections), length: patchedSpanLength(span.start, span.length, injections) }
                : span;
            const result = info.languageService.getEncodedSyntacticClassifications(fileName, mappedSpan);
            if (injections === undefined) return result;
            return { spans: remapClassificationSpans(result.spans.slice(), injections), endOfLineState: result.endOfLineState };
        };

        const lsRecord = info.languageService as unknown as Record<string, Function>;
        (proxy as unknown as Record<string, Function>)['findRenameLocations'] = (
            fileName: string, position: number, findInStrings: boolean, findInComments: boolean, preferences: unknown,
        ) => {
            const injections = getInjections(fileName);
            const mappedPos = injections !== undefined ? originalToPatched(position, injections) : position;
            const prefs: ts.UserPreferences = typeof preferences === 'boolean'
                ? { providePrefixAndSuffixTextForRename: preferences }
                : ((preferences as ts.UserPreferences | undefined) ?? {});
            const results = lsRecord['findRenameLocations']!(fileName, mappedPos, findInStrings, findInComments, prefs) as readonly ts.RenameLocation[] | undefined;
            if (results === undefined) return results;
            return results.map((r: ts.RenameLocation) => {
                const refInjections = getInjections(r.fileName);
                if (refInjections === undefined) return r;
                return { ...r, textSpan: { start: patchedToOriginal(r.textSpan.start, refInjections), length: r.textSpan.length } };
            });
        };

        return proxy;
    };

    return { create };
};

export = init;

import type ts from 'typescript';

const init = (modules: { typescript: typeof ts }): ts.server.PluginModule => {
    const tsModule = modules.typescript;

    const create = (info: ts.server.PluginCreateInfo): ts.LanguageService => {
        const log = (msg: string) => info.project.projectService.logger.info(`[yaw-ts-plugin] ${msg}`);
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
            if (!program) return undefined;
            const checker = program.getTypeChecker();
            const programSf = program.getSourceFile(fileName);
            if (!programSf) return undefined;

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

            return result.size > 0 ? result : undefined;
        };

        const mapsEqual = (a: Map<string, string>, b: Map<string, string>): boolean => {
            if (a.size !== b.size) return false;
            for (const [k, v] of a) { if (b.get(k) !== v) return false; }
            return true;
        };

        const analyseAndPatch = (sourceText: string, fileName: string): PatchResult | undefined => {
            const sf = tsModule.createSourceFile(fileName, sourceText, tsModule.ScriptTarget.Latest, true);
            const injections: Injection[] = [];

            const needsImport = !sourceText.includes('BehaviorSubject');
            if (needsImport) {
                injections.push({ originalPos: 0, text: "import type { BehaviorSubject } from 'rxjs';\n" });
            }

            const checkerTypes = checkerTypeCache.get(fileName);

            tsModule.forEachChild(sf, (node) => {
                if (!tsModule.isClassDeclaration(node)) return;
                if (!hasDecoratorNamed(node, 'Component')) return;
                const className = node.name?.text;
                if (className === undefined) return;

                const fields: StateField[] = [];
                for (const member of node.members) {
                    if (!tsModule.isPropertyDeclaration(member)) continue;
                    if (!tsModule.isIdentifier(member.name)) continue;
                    if (!hasDecoratorNamed(member, 'state')) continue;

                    const fieldName = member.name.text;
                    let typeText: string | undefined;

                    if (member.type !== undefined) {
                        typeText = sourceText.slice(member.type.pos, member.type.end).trim();
                    }

                    if (typeText === undefined) {
                        typeText = checkerTypes?.get(`${className}.${fieldName}`);
                    }

                    if (typeText === undefined && member.initializer !== undefined) {
                        typeText = inferFromNode(member.initializer, sourceText);
                    }

                    fields.push({ name: fieldName, typeText: typeText ?? 'any' });
                }

                if (fields.length > 0) {
                    const declarations = fields.map((f) =>
                        `    declare ${f.name}$: BehaviorSubject<${f.typeText}>;`
                    ).join('\n');
                    injections.push({ originalPos: node.members.end, text: '\n' + declarations + '\n' });
                }
            });

            if (injections.length === 0 || (injections.length === 1 && needsImport)) return undefined;

            injections.sort((a, b) => a.originalPos - b.originalPos);

            let patched = '';
            let cursor = 0;
            for (const inj of injections) {
                patched += sourceText.slice(cursor, inj.originalPos) + inj.text;
                cursor = inj.originalPos;
            }
            patched += sourceText.slice(cursor);

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
            if (original === undefined) return undefined;
            if (!fileName.endsWith('.ts') || fileName.endsWith('.d.ts')) return original;

            const fresh = getCheckerTypes(fileName);
            if (fresh !== undefined) {
                const prev = checkerTypeCache.get(fileName);
                if (prev === undefined || !mapsEqual(prev, fresh)) {
                    checkerTypeCache.set(fileName, fresh);
                    patchedFiles.delete(fileName);
                }
            }

            const version = originalHost.getScriptVersion(fileName);
            const cached = patchedFiles.get(fileName);
            if (cached !== undefined && cached.version === version) return cached.snapshot;

            const sourceText = original.getText(0, original.getLength());
            const result = analyseAndPatch(sourceText, fileName);
            if (result === undefined) {
                patchedFiles.delete(fileName);
                return original;
            }

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

        proxy.getEncodedSemanticClassifications = (fileName, span, format) => {
            const injections = getInjections(fileName);
            const mappedSpan = injections !== undefined
                ? { start: originalToPatched(span.start, injections), length: span.length }
                : span;
            const result = info.languageService.getEncodedSemanticClassifications(fileName, mappedSpan, format);
            if (injections === undefined) return result;
            const spans = result.spans.slice();
            for (let i = 0; i < spans.length; i += 3) {
                spans[i] = patchedToOriginal(spans[i]!, injections);
            }
            return { spans, endOfLineState: result.endOfLineState };
        };

        proxy.getEncodedSyntacticClassifications = (fileName, span) => {
            const injections = getInjections(fileName);
            const mappedSpan = injections !== undefined
                ? { start: originalToPatched(span.start, injections), length: span.length }
                : span;
            const result = info.languageService.getEncodedSyntacticClassifications(fileName, mappedSpan);
            if (injections === undefined) return result;
            const spans = result.spans.slice();
            for (let i = 0; i < spans.length; i += 3) {
                spans[i] = patchedToOriginal(spans[i]!, injections);
            }
            return { spans, endOfLineState: result.endOfLineState };
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

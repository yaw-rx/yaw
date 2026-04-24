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

        const inferTypeText = (prop: ts.PropertyDeclaration, sourceText: string): string | undefined => {
            if (prop.type !== undefined) {
                return sourceText.slice(prop.type.pos, prop.type.end).trim();
            }
            const init = prop.initializer;
            if (init === undefined) return undefined;
            switch (init.kind) {
                case tsModule.SyntaxKind.NumericLiteral: return 'number';
                case tsModule.SyntaxKind.StringLiteral: return 'string';
                case tsModule.SyntaxKind.NoSubstitutionTemplateLiteral: return 'string';
                case tsModule.SyntaxKind.TrueKeyword: return 'boolean';
                case tsModule.SyntaxKind.FalseKeyword: return 'boolean';
                case tsModule.SyntaxKind.BigIntLiteral: return 'bigint';
                case tsModule.SyntaxKind.ArrayLiteralExpression: return 'unknown[]';
                case tsModule.SyntaxKind.ObjectLiteralExpression: return 'Record<string, unknown>';
            }
            if (tsModule.isNewExpression(init) && tsModule.isIdentifier(init.expression))
                return init.expression.text;
            if (tsModule.isPrefixUnaryExpression(init)) {
                if (init.operand.kind === tsModule.SyntaxKind.NumericLiteral) return 'number';
                if (init.operand.kind === tsModule.SyntaxKind.BigIntLiteral) return 'bigint';
            }
            return undefined;
        };

        interface StateField { name: string; typeText: string; }

        interface Injection { originalPos: number; text: string; }

        interface PatchResult {
            patched: string;
            injections: Injection[];
        }

        const analyseAndPatch = (sourceText: string, fileName: string): PatchResult | undefined => {
            const sf = tsModule.createSourceFile(fileName, sourceText, tsModule.ScriptTarget.Latest, true);
            const injections: Injection[] = [];

            const needsImport = !sourceText.includes('BehaviorSubject');
            if (needsImport) {
                injections.push({ originalPos: 0, text: "import type { BehaviorSubject } from 'rxjs';\n" });
            }

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
                    const typeText = inferTypeText(member, sourceText);
                    if (typeText !== undefined) {
                        fields.push({ name: member.name.text, typeText });
                    }
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

        const originalHost = info.languageServiceHost;
        const originalGetScriptSnapshot = originalHost.getScriptSnapshot.bind(originalHost);
        const originalGetScriptVersion = originalHost.getScriptVersion.bind(originalHost);

        originalHost.getScriptSnapshot = (fileName: string): ts.IScriptSnapshot | undefined => {
            const original = originalGetScriptSnapshot(fileName);
            if (original === undefined) return undefined;
            if (!fileName.endsWith('.ts') || fileName.endsWith('.d.ts')) return original;

            const version = originalGetScriptVersion(fileName);
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

        proxy.getSemanticDiagnostics = (fileName) => {
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

        proxy.findRenameLocations = (fileName, position, findInStrings, findInComments, preferences) => {
            const injections = getInjections(fileName);
            const mappedPos = injections !== undefined ? originalToPatched(position, injections) : position;
            const results = info.languageService.findRenameLocations(fileName, mappedPos, findInStrings, findInComments, preferences as boolean);
            if (results === undefined) return results;
            return results.map((r) => {
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

import ts from 'typescript';
import { visitClass } from './visitClass.js';

/**
 * TypeScript program transformer that rewrites `@Component` classes to
 * resolve constructor-injected dependencies at connect time. Replaces
 * the need for `reflect-metadata` and `emitDecoratorMetadata` by reading
 * parameter types from the AST at compile time.
 *
 * @param program - The TypeScript program instance, used to obtain the type checker.
 * @returns A transformer factory that visits each source file and rewrites
 *          qualifying `@Component` class declarations via `visitClass`.
 */
const hasBehaviorSubjectImport = (sf: ts.SourceFile): boolean =>
    sf.statements.some(s =>
        ts.isImportDeclaration(s) &&
        ts.isStringLiteral(s.moduleSpecifier) &&
        s.moduleSpecifier.text === 'rxjs' &&
        s.importClause?.namedBindings &&
        ts.isNamedImports(s.importClause.namedBindings) &&
        s.importClause.namedBindings.elements.some(e => e.name.text === 'BehaviorSubject'),
    );

const transformer =
    (program: ts.Program): ts.TransformerFactory<ts.SourceFile> =>
    (context) => {
        const checker = program.getTypeChecker();
        const factory = context.factory;

        return (sourceFile) => {
            let needsBsImport = false;
            const visited = ts.visitEachChild(
                sourceFile,
                (node) => {
                    if (!ts.isClassDeclaration(node)) return node;
                    const result = visitClass(node, checker, factory);
                    if (result !== node && !needsBsImport) {
                        needsBsImport = result.members.some(m =>
                            ts.isPropertyDeclaration(m) &&
                            m.modifiers?.some(mod => mod.kind === ts.SyntaxKind.DeclareKeyword) &&
                            m.type && ts.isTypeReferenceNode(m.type) &&
                            ts.isIdentifier(m.type.typeName) &&
                            m.type.typeName.text === 'BehaviorSubject',
                        );
                    }
                    return result;
                },
                context,
            );

            if (needsBsImport && !hasBehaviorSubjectImport(visited)) {
                const importDecl = factory.createImportDeclaration(
                    undefined,
                    factory.createImportClause(
                        true,
                        undefined,
                        factory.createNamedImports([
                            factory.createImportSpecifier(false, undefined, factory.createIdentifier('BehaviorSubject')),
                        ]),
                    ),
                    factory.createStringLiteral('rxjs'),
                );
                return factory.updateSourceFile(visited, [...visited.statements, importDecl]);
            }
            return visited;
        };
    };

export default transformer;

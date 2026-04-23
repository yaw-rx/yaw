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
const transformer =
    (program: ts.Program): ts.TransformerFactory<ts.SourceFile> =>
    (context) => {
        const checker = program.getTypeChecker();
        const factory = context.factory;

        return (sourceFile) =>
            ts.visitEachChild(
                sourceFile,
                (node) => (ts.isClassDeclaration(node) ? visitClass(node, checker, factory) : node),
                context,
            );
    };

export default transformer;

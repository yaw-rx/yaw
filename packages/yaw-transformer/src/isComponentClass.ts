import ts from 'typescript';

/**
 * Determines whether a class declaration is decorated with `@Component(...)`.
 * Uses the type checker to resolve the decorator symbol rather than relying
 * on the identifier name alone.
 *
 * @param node - The class declaration AST node to inspect.
 * @param checker - TypeScript type checker for resolving the decorator's type.
 * @returns `true` if the class carries a `@Component` decorator, `false` otherwise.
 */
export const isComponentClass = (node: ts.ClassDeclaration, checker: ts.TypeChecker): boolean => {
    for (const decorator of ts.getDecorators(node) ?? []) {
        const expr = decorator.expression;
        if (ts.isCallExpression(expr)) {
            const type = checker.getTypeAtLocation(expr.expression);
            const sym = type.getSymbol();
            if (sym?.name === 'Component') return true;
        }
    }
    return false;
};

import ts from 'typescript';

/**
 * Collects constructor parameters that carry an access modifier (`private`,
 * `public`, `protected`, or `readonly`). These are the parameters that
 * TypeScript would normally promote to instance fields — the transformer
 * uses this list to emit explicit `__injector.resolve(Type)` assignments
 * instead.
 *
 * @param ctor - The constructor declaration to scan.
 * @returns Array of parameter declarations that have at least one access modifier.
 */
export const getPrivateParams = (ctor: ts.ConstructorDeclaration): ts.ParameterDeclaration[] =>
    ctor.parameters.filter((p) =>
        p.modifiers?.some(
            (m) =>
                m.kind === ts.SyntaxKind.PrivateKeyword ||
                m.kind === ts.SyntaxKind.PublicKeyword ||
                m.kind === ts.SyntaxKind.ProtectedKeyword ||
                m.kind === ts.SyntaxKind.ReadonlyKeyword,
        ),
    );

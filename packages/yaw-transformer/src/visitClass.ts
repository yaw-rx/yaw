import ts from 'typescript';
import { isComponentClass } from './isComponentClass.js';
import { getPrivateParams } from './getPrivateParams.js';

/**
 * Transforms a single `@Component` class declaration so that constructor-
 * injected dependencies are resolved at connect time. For each constructor
 * parameter with an access modifier, it:
 *
 *   1. Strips the access modifier from the parameter declaration.
 *   2. Emits `const __injector = RxElementBase.resolveInjector(this)` and
 *      `this.<param> = __injector.resolve(<Type>)` into `connectedCallback`,
 *      creating the method if it does not already exist.
 *
 * Returns the node unchanged if it is not a `@Component` class or has no
 * injected constructor parameters.
 *
 * @param node - The class declaration AST node to transform.
 * @param checker - TypeScript type checker, passed through to `isComponentClass`.
 * @param factory - AST node factory for creating and updating nodes.
 * @returns The original class declaration if no transform applies, or a new
 *          class declaration with access modifiers stripped and resolve
 *          statements injected into `connectedCallback`.
 */
export const visitClass = (node: ts.ClassDeclaration, checker: ts.TypeChecker, factory: ts.NodeFactory): ts.ClassDeclaration => {
    if (!isComponentClass(node, checker)) return node;

    const ctor = node.members.find(ts.isConstructorDeclaration);
    if (ctor === undefined) return node;

    const injected = getPrivateParams(ctor);
    if (injected.length === 0) return node;

    // strip access modifiers from ctor params
    const cleanParams = ctor.parameters.map((p) =>
        factory.updateParameterDeclaration(
            p,
            p.modifiers?.filter(
                (m) =>
                    m.kind !== ts.SyntaxKind.PrivateKeyword &&
                    m.kind !== ts.SyntaxKind.PublicKeyword &&
                    m.kind !== ts.SyntaxKind.ProtectedKeyword &&
                    m.kind !== ts.SyntaxKind.ReadonlyKeyword,
            ),
            p.dotDotDotToken,
            p.name,
            p.questionToken,
            p.type,
            p.initializer,
        ),
    );

    // build: this.store = __injector.resolve(TaskStore)
    const resolveStatements = injected.map((p) => {
        const name = ts.isIdentifier(p.name) ? p.name.text : '';
        const typeName =
            p.type && ts.isTypeReferenceNode(p.type) && ts.isIdentifier(p.type.typeName)
                ? p.type.typeName.text
                : name;

        return factory.createExpressionStatement(
            factory.createAssignment(
                factory.createPropertyAccessExpression(factory.createThis(), name),
                factory.createCallExpression(
                    factory.createPropertyAccessExpression(
                        factory.createIdentifier('__injector'),
                        'resolve',
                    ),
                    undefined,
                    [factory.createIdentifier(typeName)],
                ),
            ),
        );
    });

    // inject into connectedCallback or create one
    const connected = node.members.find(
        (m): m is ts.MethodDeclaration =>
            ts.isMethodDeclaration(m) &&
            ts.isIdentifier(m.name) &&
            m.name.text === 'connectedCallback',
    );

    const injectorVar = factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
            [
                factory.createVariableDeclaration(
                    '__injector',
                    undefined,
                    undefined,
                    factory.createCallExpression(
                        factory.createPropertyAccessExpression(
                            factory.createIdentifier('RxElementBase'),
                            'resolveInjector',
                        ),
                        undefined,
                        [factory.createThis()],
                    ),
                ),
            ],
            ts.NodeFlags.Const,
        ),
    );

    let newMembers = node.members.filter((m) => !ts.isConstructorDeclaration(m));

    if (connected !== undefined) {
        const newConnected = factory.updateMethodDeclaration(
            connected,
            connected.modifiers,
            connected.asteriskToken,
            connected.name,
            connected.questionToken,
            connected.typeParameters,
            connected.parameters,
            connected.type,
            factory.updateBlock(connected.body!, [
                injectorVar,
                ...resolveStatements,
                ...connected.body!.statements,
            ]),
        );
        newMembers = newMembers.map((m) => (m === connected ? newConnected : m));
    } else {
        const newConnected = factory.createMethodDeclaration(
            undefined,
            undefined,
            'connectedCallback',
            undefined,
            undefined,
            [],
            undefined,
            factory.createBlock([injectorVar, ...resolveStatements], true),
        );
        newMembers = [...newMembers, newConnected];
    }

    const newCtor = factory.updateConstructorDeclaration(
        ctor,
        ctor.modifiers,
        cleanParams,
        ctor.body,
    );

    return factory.updateClassDeclaration(
        node,
        node.modifiers,
        node.name,
        node.typeParameters,
        node.heritageClauses,
        [newCtor, ...newMembers],
    );
};

import ts from 'typescript';
import { isComponentClass } from './isComponentClass.js';
import { getPrivateParams } from './getPrivateParams.js';
import { getStateTypes, getStateFieldInfos, type StateFieldInfo } from './getStateTypes.js';

const buildStateTypesProperty = (
    stateTypes: Map<string, string>,
    factory: ts.NodeFactory,
): ts.PropertyDeclaration => {
    const properties = [...stateTypes].map(([key, typeName]) =>
        factory.createPropertyAssignment(
            factory.createIdentifier(key),
            factory.createStringLiteral(typeName),
        ),
    );
    return factory.createPropertyDeclaration(
        [factory.createModifier(ts.SyntaxKind.StaticKeyword)],
        '__stateTypes',
        undefined,
        undefined,
        factory.createObjectLiteralExpression(properties, false),
    );
};

const typeNodeForName = (typeName: string, factory: ts.NodeFactory): ts.TypeNode => {
    const unknown = () => factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    switch (typeName) {
        case 'number':  return factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
        case 'string':  return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
        case 'boolean': return factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
        case 'bigint':  return factory.createKeywordTypeNode(ts.SyntaxKind.BigIntKeyword);
        case 'Array':   return factory.createArrayTypeNode(unknown());
        case 'Object':  return factory.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword);
        case 'Map':     return factory.createTypeReferenceNode('Map', [unknown(), unknown()]);
        case 'Set':     return factory.createTypeReferenceNode('Set', [unknown()]);
        default:        return factory.createTypeReferenceNode(typeName);
    }
};

const buildDollarDeclarations = (
    fields: Map<string, StateFieldInfo>,
    factory: ts.NodeFactory,
): ts.PropertyDeclaration[] =>
    [...fields].map(([key, info]) => {
        const innerType = info.typeNode !== undefined
            ? info.typeNode
            : typeNodeForName(info.typeName, factory);
        return factory.createPropertyDeclaration(
            [factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
            `${key}$`,
            undefined,
            factory.createTypeReferenceNode('BehaviorSubject', [innerType]),
            undefined,
        );
    });

export const visitClass = (node: ts.ClassDeclaration, checker: ts.TypeChecker, factory: ts.NodeFactory): ts.ClassDeclaration => {
    if (!isComponentClass(node, checker)) return node;

    const stateTypes = getStateTypes(node, checker);
    const stateFieldInfos = getStateFieldInfos(node, checker);
    const ctor = node.members.find(ts.isConstructorDeclaration);
    const injected = ctor !== undefined ? getPrivateParams(ctor) : [];

    if (injected.length === 0 && stateTypes.size === 0) return node;

    let members = [...node.members];

    if (stateTypes.size > 0) {
        members = [
            buildStateTypesProperty(stateTypes, factory),
            ...buildDollarDeclarations(stateFieldInfos, factory),
            ...members,
        ];
    }

    if (injected.length > 0 && ctor !== undefined) {
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

        const connected = members.find(
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

        members = members.filter((m) => !ts.isConstructorDeclaration(m));

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
            members = members.map((m) => (m === connected ? newConnected : m));
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
            members = [...members, newConnected];
        }

        const newCtor = factory.updateConstructorDeclaration(
            ctor,
            ctor.modifiers,
            cleanParams,
            ctor.body,
        );

        members = [newCtor, ...members];
    }

    return factory.updateClassDeclaration(
        node,
        node.modifiers,
        node.name,
        node.typeParameters,
        node.heritageClauses,
        members,
    );
};

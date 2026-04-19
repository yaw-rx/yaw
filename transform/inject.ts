import ts from 'typescript';

const isComponentClass = (node: ts.ClassDeclaration, checker: ts.TypeChecker): boolean => {
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

const getPrivateParams = (ctor: ts.ConstructorDeclaration): ts.ParameterDeclaration[] =>
    ctor.parameters.filter((p) =>
        p.modifiers?.some(
            (m) =>
                m.kind === ts.SyntaxKind.PrivateKeyword ||
                m.kind === ts.SyntaxKind.PublicKeyword ||
                m.kind === ts.SyntaxKind.ProtectedKeyword ||
                m.kind === ts.SyntaxKind.ReadonlyKeyword,
        ),
    );

const transformer =
    (program: ts.Program): ts.TransformerFactory<ts.SourceFile> =>
    (context) => {
        const checker = program.getTypeChecker();
        const factory = context.factory;

        const visitClass = (node: ts.ClassDeclaration): ts.ClassDeclaration => {
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

        return (sourceFile) =>
            ts.visitEachChild(
                sourceFile,
                (node) => (ts.isClassDeclaration(node) ? visitClass(node) : node),
                context,
            );
    };

export default transformer;

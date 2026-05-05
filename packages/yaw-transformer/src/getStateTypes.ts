import ts from 'typescript';

export const isStateDecorator = (decorator: ts.Decorator, checker: ts.TypeChecker): boolean => {
    const expr = decorator.expression;
    const sym = checker.getSymbolAtLocation(expr);
    return sym?.name === 'state';
};

const inferTypeFromInitializer = (init: ts.Expression): string | undefined => {
    switch (init.kind) {
        case ts.SyntaxKind.NumericLiteral: return 'number';
        case ts.SyntaxKind.StringLiteral: return 'string';
        case ts.SyntaxKind.NoSubstitutionTemplateLiteral: return 'string';
        case ts.SyntaxKind.TrueKeyword: return 'boolean';
        case ts.SyntaxKind.FalseKeyword: return 'boolean';
        case ts.SyntaxKind.BigIntLiteral: return 'bigint';
        case ts.SyntaxKind.ArrayLiteralExpression: return 'Array';
        case ts.SyntaxKind.ObjectLiteralExpression: return 'Object';
    }
    if (ts.isNewExpression(init) && ts.isIdentifier(init.expression)) {
        return init.expression.text;
    }
    if (ts.isPrefixUnaryExpression(init)) {
        if (init.operand.kind === ts.SyntaxKind.NumericLiteral) return 'number';
        if (init.operand.kind === ts.SyntaxKind.BigIntLiteral) return 'bigint';
    }
    return undefined;
};

const resolveTypeName = (prop: ts.PropertyDeclaration, checker: ts.TypeChecker): string | undefined => {
    if (prop.type !== undefined) {
        if (ts.isTypeReferenceNode(prop.type) && ts.isIdentifier(prop.type.typeName)) {
            return prop.type.typeName.text;
        }
        if (prop.type.kind === ts.SyntaxKind.NumberKeyword) return 'number';
        if (prop.type.kind === ts.SyntaxKind.StringKeyword) return 'string';
        if (prop.type.kind === ts.SyntaxKind.BooleanKeyword) return 'boolean';
        if (prop.type.kind === ts.SyntaxKind.BigIntKeyword) return 'bigint';
    }
    if (prop.initializer !== undefined) {
        const inferred = inferTypeFromInitializer(prop.initializer);
        if (inferred !== undefined) return inferred;
    }
    const type = checker.getTypeAtLocation(prop);
    const sym = type.getSymbol() ?? type.aliasSymbol;
    if (sym !== undefined) return sym.name;
    return checker.typeToString(type) || undefined;
};

export interface StateFieldInfo {
    typeName: string;
    typeNode: ts.TypeNode | undefined;
    fullTypeText: string;
}

export const getStateTypes = (
    node: ts.ClassDeclaration,
    checker: ts.TypeChecker,
): Map<string, string> => {
    const result = new Map<string, string>();
    for (const member of node.members) {
        if (!ts.isPropertyDeclaration(member)) continue;
        if (!ts.isIdentifier(member.name)) continue;
        const decorators = ts.getDecorators(member);
        if (decorators === undefined) continue;
        const hasState = decorators.some((d) => isStateDecorator(d, checker));
        if (!hasState) continue;
        const typeName = resolveTypeName(member, checker);
        if (typeName !== undefined) {
            result.set(member.name.text, typeName);
        }
    }
    return result;
};

export const getStateFieldInfos = (
    node: ts.ClassDeclaration,
    checker: ts.TypeChecker,
): Map<string, StateFieldInfo> => {
    const result = new Map<string, StateFieldInfo>();
    for (const member of node.members) {
        if (!ts.isPropertyDeclaration(member)) continue;
        if (!ts.isIdentifier(member.name)) continue;
        const decorators = ts.getDecorators(member);
        if (decorators === undefined) continue;
        const hasState = decorators.some((d) => isStateDecorator(d, checker));
        if (!hasState) continue;
        const typeName = resolveTypeName(member, checker);
        if (typeName !== undefined) {
            const type = checker.getTypeAtLocation(member);
            const fullTypeText = member.type !== undefined
                ? member.getSourceFile().getFullText().slice(member.type.pos, member.type.end).trim()
                : checker.typeToString(type);
            result.set(member.name.text, { typeName, typeNode: member.type, fullTypeText });
        }
    }
    return result;
};

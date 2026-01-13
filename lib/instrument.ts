import babelTraverse from '@babel/traverse';
import { parse, parseExpression, type ParseResult } from '@babel/parser';
import { objectExpression, objectProperty, callExpression, identifier, stringLiteral } from '@babel/types';
import { generate } from '@babel/generator'
export default function(code: string, filename?: string) {
    let ast: ParseResult;
    if (filename) {
        ast = parse(code, { sourceFilename: filename });
    } else {
        ast = parse(code);
    }

    babelTraverse(ast, {
        exit(path) {
            if (path.isNewExpression() || path.isObjectExpression() || path.isFunctionExpression()) {
                path.replaceWith(callExpression(
                    parseExpression('Object.defineProperty') as any,
                    [path.node, stringLiteral('__globalid__'), parseExpression('{value: getGlobalId(), enumerable: false}')]
                ))
            }
            if (path.isCallExpression() && path.node.callee.type === 'MemberExpression') {
                if (path.node.callee.object.type === 'Identifier' && path.node.callee.object.name === 'Object'
                    && path.node.callee.property.type === 'Identifier' && path.node.callee.property.name === 'create') {
                    path.replaceWith(callExpression(
                        parseExpression('Object.defineProperty') as any,
                        [path.node, stringLiteral('__globalid__'), parseExpression('{value: getGlobalId(), enumerable: false}')]
                    ))
                }
            }
            path.skip();
        }
    });
    return generate(ast).code;
}


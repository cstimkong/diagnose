import babelTraverse from '@babel/traverse';
import { parse, parseExpression, type ParseResult } from '@babel/parser';
import { objectExpression, objectProperty, callExpression, identifier, stringLiteral } from '@babel/types';
import { generate } from '@babel/generator';
import babelTemplate from '@babel/template';

/**
 * Instrument the code for forced execution.
 * 
 * @param code The code to instrument
 * @param filename optional filename
 * @returns The instrumented code
 */
export default function(code: string, filename?: string) {
    let ast: ParseResult;
    if (filename) {
        ast = parse(code, { sourceFilename: filename });
    } else {
        ast = parse(code);
    }

    babelTraverse(ast, {
        exit(path) {
            // Set global ID for object allocation sites
            if (path.isNewExpression() || path.isObjectExpression() || path.isFunctionExpression()) {
                path.replaceWith(callExpression(
                    parseExpression('Object.defineProperty') as any,
                    [path.node, stringLiteral('__globalid__'), parseExpression('{value: getGlobalId(), enumerable: false}')]
                ))
            }
            // Set global ID for the objects created via `Object.create` calls
            if (path.isCallExpression() && path.node.callee.type === 'MemberExpression') {
                if (path.node.callee.object.type === 'Identifier' && path.node.callee.object.name === 'Object'
                    && path.node.callee.property.type === 'Identifier' && path.node.callee.property.name === 'create') {
                    path.replaceWith(callExpression(
                        parseExpression('Object.defineProperty') as any,
                        [path.node, stringLiteral('__globalid__'), parseExpression('{value: getGlobalId(), enumerable: false}')]
                    ))
                }
            }
            // Patch typeof operator
            if (path.isUnaryExpression() && path.node.operator === 'typeof') {
                if (path.node.argument.type === 'Identifier') {
                    let replaced = babelTemplate('typeof %%VARNAME%% === "undefined" ? undefined : __typeof__(%%VARNAME%%)')({VARNAME: path.node.argument});
                    path.replaceWith(replaced as any);
                }
                else {
                    path.replaceWith(callExpression(
                        identifier('__typeof__'),
                        [path.node.argument]
                    ));
                }
            }
            path.skip();
        }
    });
    return generate(ast).code;
}


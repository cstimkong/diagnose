/**
 * Instrumentation for forced execution.
 * 
 * This file is part of Diagnose.
 */

import babelTraverse from '@babel/traverse';
import { parse, ParseResult} from '@babel/parser';
import { objectProperty, callExpression, identifier, stringLiteral, parenthesizedExpression, Statement, functionExpression, blockStatement, Expression } from '@babel/types';
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

    babelTraverse.default(ast, {
        enter(path) {
            if (path.isBlock()) {
                let functionDecls: Statement[] = [];
                let otherStmts: Statement[] = [];
                let childPaths = path.get('body');
                for (let c of childPaths) {
                    if (c.isFunctionDeclaration()) {
                        functionDecls.push(c.node);
                    } else {
                        otherStmts.push(c.node);
                    }
                }
                path.node.body = functionDecls.concat(otherStmts);
            }
        }
    });
    
    babelTraverse.default(ast, {
        exit(path) {
            // Patch function declarations
            if (path.isFunctionDeclaration()) {
                let funcName = path.node.id!.name;
                path.insertAfter(callExpression(
                    identifier('__setglobalid__'), [identifier(funcName)]
                ))
            }

            // Patch class declaration
            if (path.isClassDeclaration()) {
                let className = path.node.id!.name;
                path.insertAfter(callExpression(
                    identifier('__setglobalid__'),
                    [identifier(className)]
                ))
            }

            if (path.isObjectMethod()) {
                path.replaceWith(objectProperty(path.node.key, 
                    callExpression(identifier('__setglobalid__'), [functionExpression(null, path.node.params, path.node.body)])
                ));
            }

            // Set global ID for object allocation sites
            if (path.isNewExpression() || path.isObjectExpression() || path.isFunctionExpression() || path.isClassExpression()) {
                path.replaceWith(callExpression(
                    identifier('__setglobalid__'), [path.node]
                ))
            }

            // Set global ID for the objects created via `Object.create` calls
            if (path.isCallExpression() && path.node.callee.type === 'MemberExpression') {
                if (path.node.callee.object.type === 'Identifier' && path.node.callee.object.name === 'Object'
                    && path.node.callee.property.type === 'Identifier' && path.node.callee.property.name === 'create') {
                    path.replaceWith(callExpression(
                        identifier('__setglobalid__'), [path.node]
                    ))
                }
            }
            // Patch Object.keys
            if (path.isCallExpression() && path.node.callee.type === 'MemberExpression') {
                if (path.node.callee.object.type === 'Identifier' && path.node.callee.object.name === 'Object'
                    && path.node.callee.property.type === 'Identifier' && path.node.callee.property.name === 'keys') {
                    path.replaceWith(callExpression(
                        identifier('__objectkeys__'),
                        path.node.arguments
                    ))
                }
            }

            // Patch Object.getOwnPropertyNames
            if (path.isCallExpression() && path.node.callee.type === 'MemberExpression') {
                if (path.node.callee.object.type === 'Identifier' && path.node.callee.object.name === 'Object'
                    && path.node.callee.property.type === 'Identifier' && path.node.callee.property.name === 'getOwnPropertyNames') {
                    path.replaceWith(callExpression(
                        identifier('__getownpropertynames__'),
                        path.node.arguments
                    ))
                }
            }

            // Patch Object.getOwnPropertyDescriptors
            if (path.isCallExpression() && path.node.callee.type === 'MemberExpression') {
                if (path.node.callee.object.type === 'Identifier' && path.node.callee.object.name === 'Object'
                    && path.node.callee.property.type === 'Identifier' && path.node.callee.property.name === 'getOwnPropertyDescriptors') {
                    path.replaceWith(callExpression(
                        identifier('__getownpropertydescriptors__'),
                        path.node.arguments
                    ))
                }
            }

            // Patch Reflect.ownKeys
            if (path.isCallExpression() && path.node.callee.type === 'MemberExpression') {
                if (path.node.callee.object.type === 'Identifier' && path.node.callee.object.name === 'Reflect'
                    && path.node.callee.property.type === 'Identifier' && path.node.callee.property.name === 'ownKeys') {
                    path.replaceWith(callExpression(
                        identifier('__reflectownkeys__'),
                        path.node.arguments
                    ))
                }
            }

            // Patch typeof operator
            if (path.isUnaryExpression() && path.node.operator === 'typeof') {
                if (path.node.argument.type === 'Identifier') {
                    let replaced = babelTemplate.expression('typeof %%VARNAME%% === "undefined" ? "undefined" : __typeofimpl__(%%VARNAME%%)')({VARNAME: path.node.argument});
                    path.replaceWith(parenthesizedExpression(replaced as any));
                }
                else {
                    path.replaceWith(callExpression(
                        identifier('__typeofimpl__'),
                        [path.node.argument]
                    ));
                }
            }

            if (path.isBinaryExpression() && path.get('left').isExpression() && (path.node.operator === '===' || path.node.operator === '==')) {
                path.replaceWith(callExpression(
                    identifier('__comparison__'),
                    [path.node.left as Expression, path.node.right, stringLiteral(path.node.operator)]
                ));
            }
            path.skip();
        }
    });
    return generate(ast).code;
}


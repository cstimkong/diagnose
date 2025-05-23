'use strict'

let babelParser = require('@babel/parser')
let traverse = require('@babel/traverse').default
let generator = require('@babel/generator')
let {variableDeclaration,
    variableDeclarator,
    memberExpression,
    binaryExpression,
    logicalExpression,
    callExpression,
    functionExpression,
    identifier,
    returnStatement, 
    blockStatement,
    conditionalExpression,
    unaryExpression,
    stringLiteral,
    parenthesizedExpression,
    numericLiteral,
    assignmentExpression,
    ifStatement,
    isIdentifier} = require('@babel/types');
const { breakStatement } = require('@babel/types');

function makeRandomId(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}


function wrapCode(code) {
    let ast = babelParser.parse(code);
    traverse(ast, {
        exit(path) {
            // Wrap loop statements
            if (path.isForStatement() || path.isWhileStatement()) {
                let varName = makeRandomId(6);
                let loopVarDecl = variableDeclaration("let", [
                    variableDeclarator(identifier(varName), numericLiteral(0))
                ]);
                
                path.get('body').pushContainer('body', assignmentExpression('+=', identifier(varName), numericLiteral(1)));
                path.get('body').unshiftContainer('body', ifStatement(
                    binaryExpression('>=', identifier(varName), numericLiteral(500)),
                    breakStatement()
                ));
                let newBlock = blockStatement(
                    [loopVarDecl, path.node]
                );
                path.replaceWith(newBlock);

                path.skip();
            }

            // Wrap typeof expressions
            if (path.isUnaryExpression() && path.node.operator === 'typeof') {
                let tmpFunc = functionExpression(
                    null,
                    [identifier("x")],
                    blockStatement(
                        [returnStatement(
                            conditionalExpression(

                                logicalExpression('||',
                                    binaryExpression(
                                        "!==",
                                        unaryExpression("typeof", identifier("x")), 
                                        stringLiteral("object")
                                    ),
                                    binaryExpression('===', identifier('x'), identifier('null'))
                                ),
                                unaryExpression('typeof', identifier('x')),
                                conditionalExpression(
                                    binaryExpression(
                                        '===',
                                        memberExpression(identifier("x"), identifier("__fakevalue__"), false),
                                        identifier("undefined")
                                    ),
                                    stringLiteral("object"),
                                    memberExpression(identifier("x"), identifier("__typeof__"))
                                )
                            )
                        )]
                    )
                );
                let callExp = callExpression(
                    parenthesizedExpression(tmpFunc),
                    [path.node.argument]
                );
                if (path.node.argument.type === 'Identifier') {
                    callExp = conditionalExpression(
                        binaryExpression('===',
                            unaryExpression('typeof', path.node.argument),
                            stringLiteral('undefined')
                        ),
                        stringLiteral('undefined'),
                        callExp
                    )
                }
                path.replaceWith(callExp);
                path.skip();
            }

            // Wrap call expressions
            if (path.isCallExpression()) {
                if (path.node.callee.type === 'MemberExpression') {
                    if (path.node.callee.property.type === 'Identifier' && path.node.callee.property.name === 'call') {
                        return
                    }
                    if (path.node.callee.object.type === 'Super') {
                        return
                    }
                    let randomId = makeRandomId(8);
                    let tmpVar = variableDeclaration("var", [
                        variableDeclarator(identifier(randomId), path.node.callee.object)
                    ]);
                    let tmpArguments = [];
                    for (let x of path.node.arguments) {
                        tmpArguments.push(x)
                    }
                    
                    tmpArguments.unshift(identifier(randomId))
                    let returnExp = returnStatement(
                        callExpression(
                            memberExpression(
                                memberExpression(
                                    identifier(randomId), 
                                    path.node.callee.property,
                                    path.node.callee.computed
                                ),
                                identifier('call')
                            ), 
                            tmpArguments
                        )
                    );

                    let tmpCall = callExpression(
                        callExpression(
                            memberExpression(
                                parenthesizedExpression(
                                    functionExpression(null, [], 
                                        blockStatement([tmpVar, returnExp])
                                    )
                                ),
                                identifier('bind'),
                                false
                            ),
                            [identifier('this')]
                        ),
                        []
                    );
                    path.replaceWith(tmpCall);
                    path.skip();
                } else {
                    if (!(path.node.callee.type === 'Super')) {
                        let tmpArguments = [identifier('undefined')];
                        for (let x of path.node.arguments) {
                            tmpArguments.push(x)
                        }
                        let tmpCall = callExpression(
                            memberExpression(
                                path.node.callee,
                                identifier('call'),
                                false
                            ),
                            tmpArguments
                        );
                        path.replaceWith(tmpCall);
                        path.skip();
                    }
                    
                }
            }
        }
    })
    let newCode = generator.default(ast).code;
    return newCode;
}

module.exports = wrapCode;
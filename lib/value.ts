import { parseExpression } from "@babel/parser";
import babelTraverse from '@babel/traverse';
import { randomChoose, randomString, randomNumber } from "./random";
import {generate} from '@babel/generator';
import { stringLiteral, numericLiteral, objectExpression } from "@babel/types";

/**
 * Replace the Any symbols in the value representation.
 * 
 * @param valueRep 
 * @returns the replaced code for the value representation
 */
export function replacePlaceholders(valueRep: string): string {
    let ast = parseExpression(valueRep);
    babelTraverse(ast, {
        noScope: true,
        exit(path) {
            if (path.isCallExpression()) {
                if (valueRep.slice(path.node.start!, path.node.end!) === 'Symbol.for("Any")') {
                    randomChoose([
                        function() { path.replaceWith(stringLiteral(randomString())); },
                        function() { path.replaceWith(numericLiteral(randomNumber())); },
                        function() { path.replaceWith(objectExpression([])); }
                    ])
                }
                if (valueRep.slice(path.node.start!, path.node.end!) === 'Symbol.for("AnyString")') {
                    path.replaceWith(stringLiteral(randomString()));
                }
                if (valueRep.slice(path.node.start!, path.node.end!) === 'Symbol.for("AnyNumber")') {
                    path.replaceWith(numericLiteral(randomNumber()));
                }
            }
        }
    });
    return generate(ast).code;
}
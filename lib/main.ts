/**
 * 
 * Entry file of Diagnose
 */

import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import process from 'process';
import loadmodule from './loadmodule.js';
import instrument from './instrument.js';
import forcedExecution from './forcedexecution.js';
import { parseExpression } from '@babel/parser';
import babelTraverse from '@babel/traverse';
import { randomChoose, randomNumber, randomString } from './random.js';
import { numericLiteral, objectExpression, stringLiteral } from '@babel/types';
import generate from '@babel/generator';

(async function () {
    const argv: any = yargs(hideBin(process.argv))
        .usage('Generate object relation graph for a JavaScript package')
        .option('library-path', { alias: 'l', type: 'string' })
        .option('max-execution-time', { type: 'number', default: 100 })
        .option('max-arg-number', { type: 'number', default: 5 })
        .demandOption(['library-path'])
        .parse();

    const mod = loadmodule(argv.libraryPath as string, instrument);
    let nodes: any = {};
    let edges: any = {};


    function findNewObjects(obj: any) {
        if (nodes[obj.__globalid__]) {
            return;
        }
        if (!edges[obj.__globalid__]) {
            edges[obj.__globalid__] = { ownProps: {}, calls: {}, hasProps: {} };
        }

        if (typeof obj === 'object' && obj !== null && Object.getPrototypeOf(obj) !== Object.prototype) {
            let proto = Object.getPrototypeOf(obj);
            if (proto !== null && proto.__globalid__) {
                if (!nodes[proto.__globalid__]) {
                    nodes[proto.__globalid__] = { id: proto.__globalid__, objRef: proto };
                }
            }
            findNewObjects(proto);
        }

        for (let x of Object.getOwnPropertyNames(obj)) {
            if ((typeof obj[x] === 'function' || typeof obj[x] === 'object') && obj[x] !== null && obj[x].__globalid__) {
                if (!nodes[obj[x].__globalid__]) {
                    nodes[obj[x].__globalid__] = { id: obj[x].__globalid__, objRef: obj[x], visited: false };
                    edges[obj.__globalid__].ownProps[x] = obj[x].__globalid__;
                }
                findNewObjects(obj[x]);
            }
        }
    }

    function replacePlaceholders(valueRep: string): string {
        let ast = parseExpression(valueRep);
        babelTraverse(ast, {
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

    async function createCallEdges(func: Function) {
        for (let i = 0; i < argv.maxExecutionTime; i++) {
            try {
                let [args, result] = forcedExecution(func, argv.maxArgNumber);
                if (result instanceof Promise) {
                    result = await result;
                }
                
            } catch (e) {
                // ignore
            }
        }
    }
})()

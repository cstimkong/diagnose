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
        .option('max-iteration', {type: 'number', default: 100})
        .option('max-arg-number', { type: 'number', default: 5 })
        .demandOption(['library-path'])
        .parse();

    const mod = loadmodule(argv.libraryPath as string, instrument);
    let nodes: any = {};
    let edges: any = {};


    function findNewObjects(obj: any): any[] {
        let result: any[] = [];
        if (nodes[obj.__globalid__]) {
            return [];
        }
        if (!edges[obj.__globalid__]) {
            edges[obj.__globalid__] = { ownProps: {}, calls: [], hasProps: {} };
        }

        if (typeof obj === 'object' && obj !== null && Object.getPrototypeOf(obj) !== Object.prototype) {
            let proto = Object.getPrototypeOf(obj);
            if (proto !== null && proto.__globalid__) {
                if (!nodes[proto.__globalid__]) {
                    nodes[proto.__globalid__] = { id: proto.__globalid__, objRef: proto };
                }
            }
            result = result.concat(findNewObjects(proto));
        }

        for (let x of Object.getOwnPropertyNames(obj)) {
            if ((typeof obj[x] === 'function' || typeof obj[x] === 'object') && obj[x] !== null && obj[x].__globalid__) {
                if (!nodes[obj[x].__globalid__]) {
                    nodes[obj[x].__globalid__] = { id: obj[x].__globalid__, objRef: obj[x], visited: false };
                    edges[obj.__globalid__].ownProps[x] = obj[x].__globalid__;
                }
                result = result.concat(findNewObjects(obj[x]));
            }
        }

        return result;
    }
    
    function constructValue(valueRep: string): any {
        return new Function(`return ${valueRep}`)();
    }

    /**
     * Replace the Any symbols in the value representation.
     * 
     * @param valueRep 
     * @returns the replaced code for the value representation
     */
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

    /**
     * Get the type representation of a value.
     * @param value any value of JavaScript
     * @returns the type representation
     */
    function getType(value: any) {
        if (value === Symbol.for('Any')) {
            return 'any';
        }
        if (typeof value === 'string' || value === Symbol.for('AnyString')) {
            return 'string';
        }
        else if (typeof value === 'number' || value === Symbol.for('AnyNumber')) {
            return 'number';
        }
        if (value === undefined) {
            return 'undefined';
        }
        if (value === null) {
            return 'null';
        }

        else if (typeof value === 'object') {
            let result: any = {};
            for (let x of Object.getOwnPropertyNames(value)) {
                Object.defineProperty(result, x, {value: value[x]});
            }
            result['[[prototype]]'] = getType(Object.getPrototypeOf(value));
            
            if (value.__globalid__) {
                result.__globalid__ = value.__globalid__;
            }
            return result;
        }

        throw new Error('Unsupported value.');
    }

    async function createCallEdges(func: Function) {
        let calldata = [];
        for (let i = 0; i < argv.maxExecutionTime; i++) {
            try {
                let [thisArg, args, result] = forcedExecution(func, argv.maxArgNumber);
                if (result instanceof Promise) {
                    result = await result;
                }
                let input = [];
                for (let i = 0; i < args.length; i++) {
                    input.push(constructValue(replacePlaceholders(args[i])));
                }

                calldata.push([constructValue(replacePlaceholders(thisArg)), input]);
            } catch (e) {
                // ignore
            }
        }
        let calldataReturns = [];
        for (let cd of calldata) {
            for (let e of cd) {
                let thisArg = cd[0];
                let result = func.apply(thisArg, cd[1]);
                if (result instanceof Promise) {
                    result = await result;
                }
                calldataReturns.push(getType(result));
            }
        }
        
    }

    let queue: any[] = [];
    // main loop
    while (queue.length > 0) {
        let o = queue.shift();
        let newObjects = findNewObjects(o);
        for (let x of newObjects) {
            if (typeof x === 'function') {
                createCallEdges(x);
            }
        }
    }
})()

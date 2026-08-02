/**
 * 
 * Generate graph for a JavaScript library.
 * 
 * This file is part of Diagnose.
 */

import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import process from 'process';
import loadmodule from './load-module.js';
import instrument from './instrument.js';
import forcedExecution from './forced-execution.js';
import { replacePlaceholders } from './value.js';
import internalObjects from './internalobjects.js';
import objectHash from 'object-hash';
import { __getGlobalId__, __setglobalid__, patchGlobalFunctions } from './patch.js'
import { randomNumber } from './random.js';
import { writeFileSync } from 'fs';

(async function () {
    const argv: any = yargs(hideBin(process.argv))
        .usage('Generate object relation graph for a JavaScript package')
        .option('library-path', { alias: 'l', type: 'string' })
        .option('max-execution-time', { type: 'number', default: 1000 })
        .option('max-iteration', {type: 'number', default: 100})
        .option('max-arg-number', { type: 'number', default: 5 })
        .option('output-path', {type: 'string'})
        .demandOption(['library-path'])
        .parse();

    patchGlobalFunctions();
    (globalThis as any).__enablesetglobalid__ = true;
    const mod = loadmodule(argv.libraryPath as string, instrument);
    if (!mod.__globalid__) {
        __setglobalid__(mod);
    }
    (globalThis as any).__enablesetglobalid__ = false;

    // Initially there are only 4 type nodes for primitive types
    // The IDs in nodes and edges:
    //  object -> a global ID
    //  type -> a hash string starting with `typehash:`
    //  special type: a string, 'string', 'number', etc.
    //  Node specification: {id: <some ID>, objRef: <object reference>, entry: <boolean>}
    let nodes: any = {string: {}, number: {}, true: {}, false: {}};
    let edges: any = {};

    nodes[mod.__globalid__] = {id: mod.__globalid__, objRef: mod, start: true};
    
    function deepClone(obj: any): any {
        if (Array.isArray(obj)) {
            let o = [];
            for (let x of obj) {
                o.push(deepClone(x));
            }
            return o;
        }
        else if (typeof obj === 'object' && obj !== null) {
            let o: any = {};
            for (let key of Object.keys(obj)) {
                if (key === 'objRef') {
                    continue;
                }
                o[key] = deepClone(obj[key]);
            }
            return o;
        }
        else {
            return obj;
        }
    }

    function exportGraph() {
        return {
            nodes: deepClone(nodes),
            edges: deepClone(edges)
        }
    }

    function findNewObjects(obj: any, depth?: number): any[] {
        if (typeof obj !== 'object' && typeof obj !== 'function')
            return [];
        if (obj === null)
            return[];
        if (!depth) depth = 0;
        if (depth && depth > 10)
            return [];
        let result: any[] = [];

        if (Object.hasOwn(obj, '__globalid__') && !nodes[obj.__globalid__]) {
            nodes[obj.__globalid__] = {id: obj.__globalid__, objRef: obj};
            result.push(obj.__globalid__);
        }

        if (Object.hasOwn(obj, '__globalid__') && !edges[obj.__globalid__]) {
            edges[obj.__globalid__] = { ownProps: {}, calls: [], hasProps: {} };
        }

        if (typeof obj === 'object' && obj !== null && Object.getPrototypeOf(obj) !== Object.prototype) {
            let proto = Object.getPrototypeOf(obj);
            if (proto !== null && Object.hasOwn(proto, '__globalid__')) {
                if (!nodes[proto.__globalid__]) {
                    nodes[proto.__globalid__] = { id: proto.__globalid__, objRef: proto };
                }
            }
            result = result.concat(findNewObjects(proto, depth + 1));
        }

        for (let x of Object.getOwnPropertyNames(obj)) {
            if ((typeof obj[x] === 'function' || typeof obj[x] === 'object')) {
                if (obj[x] !== null && Object.hasOwn(obj[x], '__globalid__') && !nodes[obj[x].__globalid__]) {
                    nodes[obj[x].__globalid__] = { id: obj[x].__globalid__, objRef: obj[x] };
                    edges[obj[x].__globalid__] = { ownProps: {}, calls: [], hasProp: {} };
                    edges[obj.__globalid__].ownProps[x] = obj[x].__globalid__;
                    result.push(obj[x].__globalid__);
                }
                result = result.concat(findNewObjects(obj[x], depth + 1));
            }
        }
        let s = new Set();
        for (let x of result)
            s.add(x);
        return Array.from(s);
    }
    
    function constructValue(valueRep: string): any {
        return new Function(`return ${valueRep}`)();
    }


    /**
     * Get the type representation of a value.
     * @param value any value of JavaScript
     * @returns the type representation
     */
    function getType(value: any) : string | NodeJS.Dict<any> {
        for (let [k, v] of Object.entries(internalObjects)) {
            if (v === value) {
                return k;
            }
        }
        
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
            // For the objects initialized in the loading phase
            if (Object.hasOwn(value, '__globalid__') && value.__globalid__ !== undefined) {
                if (!nodes[value.__globalid__]) {
                    nodes[value.__globalid__] = {id: value.__globalid__, objRef: value};
                    edges[value.__globalid__] = {ownProps: {}, calls: []};
                    queue.push(value);
                }
                return {'__globalid__': value.__globalid__, value: value};
            }

            let result: any = {};
            for (let x of Object.getOwnPropertyNames(value)) {
                Object.defineProperty(result, x, {value: getType(value[x]), enumerable: true});
            }
            result['[[prototype]]'] = getType(Object.getPrototypeOf(value));
            return result;
        }
        else if (typeof value === 'function') {
            if (Object.hasOwn(value, '__globalid__') && value.__globalid__) {
                return {'__globalid__': value.__globalid__};
            }
            let result: any = {};
            for (let x of Object.getOwnPropertyNames(value)) {
                if (['length', 'name', 'arguments', 'caller'].indexOf(x) < 0) {
                    Object.defineProperty(result, x, {value: value[x]});
                }
            }
            return Object.defineProperty(result, '__functiontype__', {value: true});
        }

        throw new Error('Unsupported value.');
    }

    /**
     * Create a type node (and subtype nodes) in the graph
     * @param typeDef the type definition, a string or a dict
     * @returns the ID of the type node
     */
    function createTypeNode(typeDef: string | NodeJS.Dict<any>): any {
        if (typeof typeDef === 'string') {
            return typeDef;
        }

        if ('__globalid__' in typeDef) {
            let obj = typeDef['__globalid__'];
            if (!nodes[typeDef['__globalid__']]) {
                nodes[typeDef['__globalid__']] = {id: typeDef['__globalid__'], objRef: typeDef.value};
                edges[typeDef['__globalid__']] = {ownProps: {}, calls: [], hasProps: {}};
            }

            return typeDef['__globalid__'];
        }

        let hash = objectHash(typeDef);
        if (nodes['typehash:' + hash]) {
            return 'typehash:' + hash;
        }

        let typeNode: any = {};
        for (let x of Object.keys(typeDef)) {
            typeNode[x] = createTypeNode(typeDef[x]);
        }

        nodes['typehash:' + hash] = typeNode;
        return 'typehash:' + hash;
    }

    async function createCallEdges(func: Function) {
        let calldata = [];
        let calldataRep = []
        for (let i = 0; i < argv.maxExecutionTime; i++) {
            try {
                let useNew = Math.floor(randomNumber(2)) === 0;
                let {thisArg, args, } = await forcedExecution(func, argv.maxArgNumber, false, useNew);
                let input = [];
                let inputRep = [];
                for (let i = 0; i < args.length; i++) {
                    let replacedRep = replacePlaceholders(args[i]);
                    inputRep.push(replacedRep);
                    input.push(constructValue(replacedRep));
                }
                let replacedRepThisArg = replacePlaceholders(thisArg);
                calldataRep.push([replacedRepThisArg, inputRep, useNew]);
                calldata.push([constructValue(replacedRepThisArg), input, useNew]);
            } catch (e) {
                console.log(func.toString(), e);
                // ignore
            }
        }
        let calldataReturns = [];
        let returnTypeMap: NodeJS.Dict<any> = {};
        for (let cd of calldata) {
            let thisArg = cd[0];
            let result;
            if (cd[2]) {
                console.log(func, cd[1]);
                result = Reflect.construct(func, cd[1]);
            } else {
                result = func.apply(thisArg, cd[1]);
            }
            let returnType = getType(result);
            let returnTypeHash = objectHash(returnType);
            returnTypeMap[returnTypeHash] = returnType;
            calldataReturns.push(returnTypeHash);
        }
        
        for (let i = 0; i < calldata.length; i++) {
            let typeDef = returnTypeMap[calldataReturns[i]!];
            let typeNodeId = createTypeNode(typeDef);
            edges[(func as any).__globalid__].calls.push({calldata: calldataRep[i], target: typeNodeId});
        }
    }

    let queue: any[] = [];
    let iterationCount = 0;
    queue.push(mod);

    // main loop
    while (queue.length > 0 && iterationCount < argv.maxIteration) {
        let o = queue.shift();
        let newObjects = findNewObjects(o, 0);
        for (let x of newObjects) {
            queue.push(nodes[x].objRef);
        }

        if (typeof o === 'function') {
            await createCallEdges(o);
        }

        iterationCount += 1;
    }
    let outputData = exportGraph();
    if (argv.outputPath) {
        writeFileSync(argv.outputPath, JSON.stringify(outputData));
    } else {
        console.log(JSON.stringify(outputData));
    }

})()

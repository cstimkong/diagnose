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
import { replacePlaceholders } from './value.js';
import internalObjects from './internalobjects.js';
import objectHash from 'object-hash';

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

    // Initially there are only 4 type nodes for primitive types
    // The IDs in nodes and edges:
    //  object -> a global ID
    //  type -> a hash string starting with `typehash:`
    //  special type: a string, 'string', 'number', etc.
    //  Node specification: {id: <some ID>, objRef: <object reference>, entry: <boolean>}
    let nodes: any = {string: {}, number: {}, true: {}, false: {}};
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
            if (value.__globalid__) {
                return {'__globalid__': value.__globalid__};
            }

            let result: any = {};
            for (let x of Object.getOwnPropertyNames(value)) {
                Object.defineProperty(result, x, {value: value[x]});
            }
            result['[[prototype]]'] = getType(Object.getPrototypeOf(value));
            return result;
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
                nodes[typeDef['__globalid__']] = {id: typeDef['__globalid__'], objRef: obj};
                edges[typeDef['__globalid__']] = {ownProps: {}, calls: [], hasProps: {}};
            }

            return typeDef['__globalid__'];
        }

        let hash = objectHash(typeDef);
        if (nodes['typehash:' + hash]) {
            return nodes['typehash:' + hash];
        }

        let typeNode: any = {};
        for (let x of Object.keys(typeDef)) {
            typeNode[x] = createTypeNode(typeDef[x]);
        }

        nodes['typehash:' + hash] = typeNode;
        return 'tyehash:' + hash;
    }

    async function createCallEdges(func: Function) {
        let calldata = [];
        let calldataRep = []
        for (let i = 0; i < argv.maxExecutionTime; i++) {
            try {
                let [thisArg, args, result] = await forcedExecution(func, argv.maxArgNumber);
                if (result instanceof Promise) {
                    result = await result;
                }
                let input = [];
                let inputRep = [];
                for (let i = 0; i < args.length; i++) {
                    let replacedRep = replacePlaceholders(args[i]);
                    inputRep.push(replacedRep);
                    input.push(constructValue(replacedRep));
                }
                let replacedRepThisArg = replacePlaceholders(thisArg)
                calldataRep.push([replacedRepThisArg, inputRep])
                calldata.push([constructValue(replacedRepThisArg), input]);
            } catch (e) {
                // ignore
            }
        }
        let calldataReturns = [];
        let returnTypeMap: NodeJS.Dict<any> = {};
        for (let cd of calldata) {
            let thisArg = cd[0];
            let result = func.apply(thisArg, cd[1]);
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
    
    // main loop
    while (queue.length > 0 && iterationCount < argv.maxIteration) {
        let o = queue.shift();
        let newObjects = findNewObjects(o);
        for (let x of newObjects) {
            if (typeof x === 'function') {
                createCallEdges(x);
            }
        }
        iterationCount += 1;
    }
})()

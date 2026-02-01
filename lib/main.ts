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
import { __getGlobalId__, __setglobalid__, patchGlobalFunctions } from './patch.js'
(async function () {
    const argv: any = yargs(hideBin(process.argv))
        .usage('Generate object relation graph for a JavaScript package')
        .option('library-path', { alias: 'l', type: 'string' })
        .option('max-execution-time', { type: 'number', default: 100 })
        .option('max-iteration', {type: 'number', default: 100})
        .option('max-arg-number', { type: 'number', default: 5 })
        .demandOption(['library-path'])
        .parse();

    patchGlobalFunctions();
    (globalThis as any).__enablesetglobalid__ = true;
    const mod = loadmodule(argv.libraryPath as string, instrument);
    __setglobalid__(mod);
    (globalThis as any).__enablesetglobalid__ = false;

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
        if (Object.hasOwn(obj, '__globalid__') && obj.__globalid__ && nodes[obj.__globalid__]) {
            return [];
        }

        if (Object.hasOwn(obj, '__globalid__') && obj.__globalid__ && !edges[obj.__globalid__]) {
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
            if ((typeof obj[x] === 'function' || typeof obj[x] === 'object') && obj[x] !== null && obj[x].__globalid__ !== undefined) {
                if (!nodes[obj[x].__globalid__]) {
                    nodes[obj[x].__globalid__] = { id: obj[x].__globalid__, objRef: obj[x], visited: false };
                    edges[obj[x].__globalid__] = { ownProps: {}, calls: [], hasProp: {} };
                    if (!edges[obj.__globalid__]) {
                        edges[obj.__globalid__] = {ownProps: {}, calls: [], hasProps: {}};
                    }
                    edges[obj.__globalid__].ownProps[x] = obj[x].__globalid__;
                    result.push(obj[x].__globalid__);
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
            if (Object.hasOwn(value, '__globalid__') && value.__globalid__ !== undefined) {
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
            return nodes['typehash:' + hash];
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
                let [thisArg, args, result] = await forcedExecution(func, argv.maxArgNumber);
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
                // console.log(e);
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
    queue.push(mod);

    // main loop
    while (queue.length > 0 && iterationCount < argv.maxIteration) {
        let o = queue.shift();
        let newObjects = findNewObjects(o);
        for (let x of newObjects) {
            queue.push(nodes[x].objRef);
        }

        if (typeof o === 'function') {
            await createCallEdges(o);
        }

        iterationCount += 1;
    }
    console.log(nodes);
    console.log(edges);
})()

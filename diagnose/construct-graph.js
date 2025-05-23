'use strict'

/**
 * The entry point of Diagnose.
 * 
 */

const process = require('process');
const fs = require('node:fs');
const wrapCode = require('./wrapCode');
const {getFake, 
    FakeValue, FakeNumber, FakeString,
    FakeObject, FakeDate, FakeFunction} = require('./fake');
const {addHook} = require('pirates');
const yargs = require('yargs/yargs');
const {hideBin} = require('yargs/helpers');
const {evalObject} = require('./utils.js');
const deepEqual = require('deep-equal');
const pretty = require('pino-pretty');
const pino = require('pino').default;
const logger = pino(pretty());

yargs(hideBin(process.argv)).usage('Construct Object relation graph for a given JavaScript library')
.option('library', {
    alias: 'l',
    type: 'string',
    description: 'The path of a JavaScript library (a .js file or a CommonJS module)'
})
.option('max-iteration', {
    type: 'number',
    description: 'Max iteration of forced execution'
})
.option('max-execution-time', {
    type: 'number',
    description: 'Max time of executing a function call'
})
.option('max-argument-count', {
    type: 'number',
    description: 'Max number of arguments'
})
.option('output', {
    alias: 'o',
    type: 'string',
    description: 'Output path of the generated graph'
})
.demandOption(['library'])
.help()
.parse();

(function() {
    let maxIteration = Number(argv.maxIteration) || 500
    let maxExecutionTime = Number(argv.maxExecutionTime) || 500

    function loadLibrary(libName) {
        const revert = addHook((code, _) => {
            return wrapCode(code)
        }, {exts: ['.js'], ignoreNodeModules: false})
        
        let lib = require(libName)
        revert()
        return lib;
    }


    /**
     *  Get runtime ID of an object.
     */
    function getObjectId(obj) {
        return obj['@@__ID__@@'];
    }

    function isFunction(objId) {
        /* todo */
    } 

    function getType(obj) {
        if (obj === Object.prototype) {
            return 'Object.prototype';
        }
        if (obj instanceof Promise) {
            return 'promise';
        }
        if (obj === undefined) {
            return 'undefined';
        }
        if (typeof obj === 'string') {
            return 'string';
        }
        if (typeof obj === 'number') {
            return 'number';
        }
        if (typeof obj === 'undefined') {
            return 'undefined';
        }
        if (obj === null) {
            return 'null';
        }
        if (Array.isArray(obj)) {
            return 'array';
        }
        if (obj === true) {
            return 'true';
        }
        if (obj === false) {
            return 'false';
        }

        let typeObj = {};
        for (let k of Object.keys(obj)) {
            typeObj[k] = getType(obj[k])
        }
        let proto = Object.getPrototypeOf(obj)
        typeObj['[[Prototype]]'] = proto
        return {objId: obj['@@__ID__@@'], type: typeObj}
    }

    /**
     * Determine if two types are the same.
     */
    function isSameType(o1, o2) {
        if (o1 === o2) {
            return true;
        }
        if (typeof o1 === 'string' && typeof o2 === 'string') {
            return true;
        }
        if (typeof o1 === 'number' && typeof o2 === 'number') {
            return true;
        } 
        if (o1 === undefined && o2 === undefined) {
            return true;
        }
        if (o1 === null && o2 === null) {
            return true;
        }
        if (o1 instanceof Date && o2 instanceof Date) {
            return true;
        }
        if (o1 instanceof Map && o2 instanceof Map) {
            return true;
        }

        if (Array.isArray(o1) && Array.isArray(o2)) {
            return true;
        }

        if (typeof o1 === 'function' && typeof o2 === 'function') {
            return o1['@@__ID__@@'] === o2['@@__ID__@@']
        }

        if (typeof o1 === 'object' && typeof o2 === 'object' && o1 !== null && o2 !== null) {
            let keys1 = Object.keys(o1.type);
            let keys2 = Object.keys(o2.type);
            keys1.sort();
            keys2.sort();
            if (!deepEqual(keys1, keys2)) {
                return false;
            }
            for (let k of keys1) {
                if (!isSameType(o1.type[k], o2.type[k])) {
                    return false;
                }
            }
            return true;
        }

        return false;
    }

    /**
     * 
     * Determine whether o1 is a subtype of o2. Assume that o1 and o2 are both objects.
     * Since the generated object o2 never includes prototype information, isSubtype does not check [[Prototype]].
     */
    function isSubtype(o1, o2) {
        if (o1 === 'string') {
            for (let x of Object.getOwnPropertyNames(o2)) {
                if (String.prototype[x] === undefined) {
                    return false;
                }
                let matched = true;
                if (x === 'match') {
                    let retValue = o2[x]();
                    if (typeof retValue === 'object' && retValue !== null) {
                        let keys = Object.keys(o2);
                        for (let k of keys) {
                            if  (!(/^\d+$/.test(k) || k === 'index' && k === 'input' && k === 'groups')) {
                                matched = false;
                                break;
                            }
                        }
                    } else if (retValue !== null) {
                        matched = false;
                    }
                }
                else if (x === 'charAt') {
                    let retValue = o2[x]();
                    if (typeof retValue !== string && Object.entries(Object.getOwnPropertyDescriptor(retValue)).length !== 0) {
                        matched = false;
                    }
                }
                if (!matched) {
                    return false;
                }
            }
            return true;
        }
        else if (typeof o1 === 'object' && o1.nodeType === 'type') {
            let keys = Object.getOwnPropertyNames(o2);

            for (let k of keys) {
                let edge = (function() {
                    for (let e of o1.edges) {
                        if (e.propName === k) {
                            return e;
                        }
                    }
                })();
                if (!edge) {
                    return false;
                }
                if (edge.target.nodeId) {
                    if (!isSubtype(nodeList[edge.target.nodeId], o2[k])) {
                        return false;
                    }
                }

                if (edge.target.nativeObject) {
                    if (!isSubtype(edge.target.nativeObject, o2[k])) {
                        return false;
                    }
                }
            }
            return true;
        }

    }

    function generateCode(obj) {
        if (typeof obj === 'string') {
            return '"' + obj + '"';
        }
        if (typeof obj === 'number') {
            return '' + obj + '';
        }
        if (obj === undefined || obj === null) {
            return String(obj);
        }
        if (typeof obj === 'function') {
            return 'function() { }';
        }
        if (obj instanceof FakeValue || obj instanceof FakeObject) {
            return '{}';
        }
        if (obj instanceof FakeNumber) {
            return '"' + getRandomInt(1000) + '"';
        }
        if (obj instanceof FakeString) {
            return '"' + makeRandomString(10) + '"';
        }
        if (obj instanceof FakeDate) {
            return `new Date(${getRandomInt(1000000000)})`;
        }
        if (obj instanceof FakeFunction) {
            return `function() { return ${generateCode(obj.returnValue)}  }`
        }
        
        let s = '{ '
        for (let k of Object.getOwnPropertyNames(obj)) {
            s += `['${k}']: ${generateCode(obj[k])}, `
        }
        s += '}'
        return s
    }

    /**
     * 
     * Forced Execution. Returns the inferred input arguments and the returned object.
     */
    function forcedExecution(funcObj) {
        let thisArg = getFake();
        let argArray = []
        for (let p = 0; p < maxArguments; p++) {
            argArray.push(getFake())
        }
        try {
            let result = funcObj.apply(thisArg, argArray);

            let t = {}
            t['this'] = generateCode(thisArg.__internalvalue__)
            t['arguments'] = []
            for (let i = 0; i < maxArguments; i++) {
                t['arguments'].push(generateCode(argArray[i].__internalvalue__))
            }

            let newInput = {}
            newInput['this'] = evalObject(t['this'])
            newInput['arguments'] = []
            for (let i = 0; i < maxArguments; i++) {
                newInput['arguments'].push(evalObject(t['arguments'][i]));
            }
            funcObj.apply(newInput['this'], newInput['arguments']);
            
            return [t, result];
        } catch (e) {
            return undefined;
        }

    }

    let iteration = 0;
    let lib = loadLibrary(argv.library);
    let nodeList = [
        {
            id: 0, type: 'start', 
            obj: lib, objId: getObjectId(lib),
            edges: [], path: 'lib'
        }
    ];

    function findObjNode(obj) {
        for (let i = 0; i < nodeList.length; i++) {
            if (nodeList[i].obj === obj) {
                return i;
            }
        }
        return -1;
    }

    function createTypeNode(returnObjGroup) {
        if (returnObjGroup.length === 0) {
            throw new Error('The length of returned object cannot be zero.')
        }
        let typeNode = {type: 'type', edges: []};
        let keys = Object.keys(returnObjGroup[0])
        for (let k of keys) {
            if (typeof returnObjGroup[0][k] === 'string') {
                typeNode.edges.push({nodeId: undefined, type: 'hasProp', propName: k, nativeType: 'string'});
                continue;
            }
            
            if (typeof returnObjGroup[0][k] === 'number') {
                typeNode.edges.push({nodeId: undefined, type: 'hasProp', propName: k, nativeType: 'number'});
                continue;
            }

            if (returnObjGroup[0][k] instanceof Map) {
                typeNode.edges.push({nodeId: undefined, type: 'hasProp', propName: k, nativeType: 'map'});
                continue;
            }

            if (returnObjGroup[0][k] instanceof Set) {
                typeNode.edges.push({nodeId: undefined, type: 'hasProp', propName: k, nativeType: 'set'});
                continue;
            }

            if (returnObjGroup[0][k] instanceof RegExp) {
                typeNode.edges.push({nodeId: undefined, type: 'hasProp', propName: k, nativeType: 'regexp'});
                continue;
            }

            let i = 0;
            for (; i < returnObjGroup.length; i++) {
                if (returnObjGroup[i][k] !== returnObjGroup[0][k]) {
                    break
                }
            }
            if (i === returnObjGroup.length) {
                let nodeId = findObjNode(returnObjGroup[0][k]);
                if (nodeId < 0) {
                    nodeList.push({id: nodeList.length, type: 'object', obj: returnObjGroup[0][k], edges: []});
                    typeNode.edges.push({nodeId: nodeList.length, type: 'hasProp', propName: k});
                } else {
                    typeNode.edges.push({nodeId: nodeId, type: 'hasProp', propName: k});
                }
            } else {
                let newObjGroup = [];
                returnObjGroup.forEach((x) => {
                    newObjGroup.push(x[k]);
                });
                let newTypeNode = createTypeNode(newObjGroup);
                typeNode.edges.push({nodeId: newTypeNode.id, type: 'hasProp', propName: k});
            }
        }
        return typeNode;
    }

    let workList = [nodeList[0]];

    while (true) {
        if (iteration > maxIteration || workList.length === 0) {
            break;
        }

        iteration += 1;
        var n = workList.shift()
        var ownProperties = Object.getOwnPropertyNames(n.obj)
        for (let x of ownProperties) {
            if (typeof n.obj === 'function' && 
                (x === 'prototype' || x === 'arguments' || x === 'name' || x === 'caller' || x === 'length')) {
                continue
            }
            if (n.obj[x] === null || n.obj[x] === undefined || typeof n.obj[x] === 'string' || typeof n.obj[x] === 'number') {
                continue
            }

            else if (typeof n.obj[x] === 'function' && 
              n.obj[x].toString().indexOf('native code') >= 0) {
                n.edges.push({nodeId: undefined, edgeType: 'ownProperty', nativeFunction: n.obj[x].name})
            }

            else if (n.obj[x] === Object.prototype) {
                n.edges.push({nodeId: undefined, edgeType: 'ownProperty', nativeObject: 'Object.prototype'});
            }

            else if (n.obj[x] === String.prototype) {
                n.edges.push({nodeId: undefined, edgeType: 'ownProperty', nativeObject: 'String.prototype'})
            }

            else if (n.obj[x] === Array.prototype) {
                n.edges.push({nodeId: undefined, edgeType: 'ownProperty', nativeObject: 'Array.prototype'})
            }

            else if (n.obj[x] === RegExp.prototype) {
                n.edges.push({nodeId: undefined, edgeType: 'ownProperty', nativeObject: 'RegExp.prototype'});
            }

            else if (n.obj[x] === Date.prototype) {
                n.edges.push({nodeId: undefined, edgeType: 'ownProperty', nativeObject: 'Date.prototype'})
            }
            
            else if (n.obj[x] === Function.prototype) {
                n.edges.push({nodeId: undefined, edgeType: 'ownProperty', nativeObject: 'Function.prototype'})
            }

            else if (n.obj[x] !== null && n.obj[x] !== undefined 
                && (typeof n.obj[x] === 'object' || typeof n.obj[x] === 'function')) {
                var p = (function(t) {
                    for (let i = 0; i < nodeList.length; i++) {
                        if (nodeList[i].obj === t) {
                            return nodeList[i].id
                        }
                        return -1
                    }
                })(n.obj[x])
                
                if (p === -1) {
                    var newNode = {
                        id: nodeList.length,
                        type: 'object',
                        obj: n.obj[x],
                        edges: [],
                        path: `${n.path}.${x}`
                    };
                    nodeList.push(newNode);
                    workList.push(newNode);
                    n.edges.push({nodeId: newNode.id, type: 'ownProperty', name: x});
                } else {
                    n.edges.push({nodeId: p, type: 'ownProperty', name: x});
                }
            }
        }

        if ((typeof n.obj) === 'function') {
            let callEdges = [];
            let returnObjGroups = [];

            for (let j = 0; j < maxExecutionTime; j++) {
                let s = forcedExecution(n.obj);
                if (!s) {
                    continue;
                }

                let [t, returnObj] = s;

                if (typeof returnObj === 'number') {
                    callEdges.push([t, 'number']);
                }

                else if (typeof returnObj === 'string') {
                    callEdges.push([t, 'string']);
                }

                else if (returnObj instanceof Date) {
                    callEdges.push([t, 'date']);
                }

                else if (returnObj instanceof Map) {
                    callEdges.push([t, 'map']);
                } else {
                    if (returnObjGroups.length === 0) {
                        returnObjGroups.push([returnObj]);
                        callEdges.push([t, 0]);
                    } else {
                        let k = 0;
                        for (; k < returnObjGroups.length; k++) {
                            if (isSameType(returnObjGroups[k][0], returnObj)) {
                                returnObjGroups[k].push(returnObj);
                                callEdges.push([t, k]);
                                break
                            }
                        }
                        if (k === returnObjGroups.length) {
                            returnObjGroups.push([returnObj]);
                            callEdges.push([t, k]);
                        }
                    }
                }
                
            }
            for (let j = 0; j < callEdges.length; j++) {
                if (typeof callEdges[i][1] === 'string') {
                    n.edges.push({nodeId: undefined, type: 'call', 
                        data: callEdges[i][0], nativeType: callEdges[i][1]}
                    );
                    
                } else {
                    let typeNode = createTypeNode(returnObjGroups[callEdges[i][1]]);
                    n.edges.push({
                        nodeId: typeNode.id,
                        type: 'call',
                        data: callEdges[i][0],
                    });
                }
            }
        }
    }

    for (let i = 0; i < nodeList.length; i++) {
        if (nodeList[i].nodeType === 'object') {
            for (let e of nodeList[i].edges) {
                if (e.edgeType === 'call') {
                    let thisObj = new Function(`return ${e.data.this}`)();
                    let argArray = []
                    for (let j = 0; j < e.data.arguments.length; j++) {
                        argArray.push(new Function(`return ${e.data.arguments[i]}`)());
                    }

                    for (let p = 0; p < nodeList.length; p++) {
                        if (nodeList[p].nodeType === 'type') {
                            if (isSubtype(nodeList[p], thisObj)) {
                                // TODO
                            }
                        }
                    }
                }
            }
        }
    }
    let dumpedNodeList = []
    for (let n of nodeList) {
        let o = {}
        for (let k of Object.keys(n)) {
            if (k !== 'obj') {
                o[k] = n[k];
            }
        }
        dumpedNodeList.push(o);
    }
    
    if (argv.output) {
        fs.writeFileSync(argv.output, JSON.stringify(dumpedNodeList));
    }

})()

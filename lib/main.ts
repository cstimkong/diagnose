/**
 * 
 * Entry file of Diagnose
 */

import {hideBin} from 'yargs/helpers';
import yargs from 'yargs';
import process from 'process';
import loadmodule from './loadmodule.js';
import instrument  from './instrument.js';
const argv: any = yargs(hideBin(process.argv))
.usage('Generate object relation graph for a JavaScript package')
.option('library-path', {alias: 'l', type: 'string'})
.option('max-execution-time', {type: 'number', default: 100})
.demandOption(['library-path'])
.parse();

(function() {
    let nodes: any = {};
    let edges: any = {};

    function findNewObjects(obj: any) {
        if (nodes[obj.__globalid__]) {
            return;
        }

        if (typeof obj === 'object' && obj !== null && Object.getPrototypeOf(obj) !== Object.prototype) {
            let proto = Object.getPrototypeOf(obj);
            if (proto !== null && proto.__globalid__) {
                if (!nodes[proto.__globalid__]){
                    nodes[proto.__globalid__] = {id: proto.__globalid__, objRef: proto};
                }
            }
            findNewObjects(proto);
        }

        for (let x of Object.getOwnPropertyNames(obj)) {
            if ((typeof obj[x] === 'function' || typeof obj[x] === 'object') && obj[x] !== null && obj[x].__globalid__) {
                if (!nodes[obj[x].__globalid__]) {
                    nodes[obj[x].__globalid__] = {id: obj[x].__globalid__, objRef: obj[x], visited: false};
                    if (!edges[obj.__globalid__]) {
                        edges[obj.__globalid__] = {ownProps: {}, calls: {}, hasProps: {}};
                    }
                    edges[obj.__globalid__].ownProps[x] = obj[x].__globalid__;
                }
                findNewObjects(obj[x]);
            }
        }
    }

    function createCallEdges(func: Function) {
        // TODO
    }

})()


const mod = loadmodule(argv.libraryPath as string, instrument);
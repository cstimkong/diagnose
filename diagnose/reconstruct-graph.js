/**
 * Reconstruct graph for an updated library.
 */

'use strict'
const process = require('process')
const wrapCode = require('./wrap-code')
const {addHook} = require('pirates')
const yargs = require('yargs/yargs')
const {hideBin} = require('yargs/helpers')
const {evalObject} = require('./utils')
const pretty = require('pino-pretty');
const pino = require('pino').default;
const fs = require('node:fs');
const deepEqual = require('deep-equal');
const child_process = require('node:child_process');
const logger = pino(pretty());

let argv = yargs(hideBin(process.argv)).usage('Reconstruct graph for a given library')
.option('library', {
    alias: 'l',
    description: 'library path',
    type: 'string'
})
.option('graph-path', {
    alias: 'g',
    description: 'path of the graph',
    type: 'string'
})
.demandOption(['library', 'graph-path'])
.help().parse();


(function() {
    const revert = addHook((code, _filename) => {
        return wrapCode(code)
    }, {exts: ['.js'], ignoreNodeModules: false})
    
    let lib = require(argv.library)
    revert()

    let jsonContent = fs.readFileSync(argv['graph-path'], {encoding: 'utf-8'})
    let nodeList = JSON.parse(jsonContent)
    let startNode = nodeList[0]
    let workList = [[startNode, lib]]
    let visitedNode = new Set();
    
    while (workList.length > 0) {
        let [node, obj] = workList.shift();

        for (let i = 0; i < node.edges.length; i++) {
            let edge = node.edges[i];
            if (edge.type === 'ownProp') {
                if (!obj[edge.name]) {
                    console.error(`The edge ${i} of Node ${node.id} does not exist.`);
                }

                workList.push([graph[edge.target.nodeId], obj[edge.name]]);
            }
            else if (edge.type === 'call') {
                let inputData = evalObject(edge.data);
                let result = obj.apply(
                    new Function(`return ${inputData.this}`)(), 
                    new Function(`return ${inputData.arguments}`)()
                );

                if (edge.target.nodeId) {
                    nodeList[edge.target.nodeId]
                }
            }
        }
    }
})()
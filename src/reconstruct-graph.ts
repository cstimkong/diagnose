/**
 * 
 * Reconstruct graph for a JavaScript library.
 * 
 * This file is part of Diagnose.
 */

import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { cwd } from 'node:process';

const argv: any = yargs(hideBin(process.argv))
    .usage('Reconstruct graph to detect breaking changes for a JavaScript library')
    .option('graph-path', { alias: 'g', type: 'string' })
    .option('library-path', { alias: 'l', type: 'string' })
    .option('max-iteration', { type: 'number', default: 1000 })
    .demandOption(['graph-path', 'library-path'])
    .parse();

let content: any = JSON.parse(readFileSync(argv.graphPath, { encoding: 'utf-8' }));

let entryNodeId = null;
for (let id of Object.keys(content.nodes)) {
    if (content.nodes[id].start) {
        entryNodeId = id;
    }
}

if (!entryNodeId) {
    console.error('No entry node.');
    process.exit(-1);
}

const r = createRequire('file://' + cwd() + '/');

(async function () {
    let c = entryNodeId;
    content.nodes[c].objRef = r(argv.libraryPath);

    function findNewObjects(nodeId: string | number) {
        let q = [nodeId];
        while (q.length > 0) {
            let id = (q.shift() as number);
            for (let [prop, oid] of Object.entries(content.edges[id].ownProps)) {
                if (Object.hasOwn(content.nodes[(oid as string)], 'objRef')) {
                    if (content.nodes[id].objRef[prop] === undefined) {
                        console.error('Cannot find property.');
                    } else {
                        content.nodes[(oid as string)].objRef = content.nodes[id].objRef[prop];
                        q.push((oid as string));
                    }
                }
            }
        }
    }

    function constructValue(s: string) {
        return new Function(`return ${s}`)();
    }

    function checkTypeConsistency(result: any, nodeId: number | string) {
        if (nodeId === 'string' || nodeId === 'number') {
            return typeof result === nodeId;
        }
        if (nodeId === 'true' || nodeId === 'false') {
            return typeof nodeId === 'boolean' && result.toString() === nodeId;
        }

        for (let key of Object.keys(content.nodes[nodeId])) {
            let t;
            if (key === '[[prototype]]') {
                t = Object.getPrototypeOf(result);
            } else {
                t = result[key];
            }
            if (!checkTypeConsistency(t, content.nodes[nodeId][key])) {
                return false;
            }
        }
        return true;
    }

    async function createCallEdges(nodeId: string | number) {
        if (typeof content.nodes[nodeId].objRef !== 'function') {
            console.error('Not a function');
            return;
        }
        for (let c of content.edges[nodeId].calls) {
            let f: Function = content.nodes[nodeId].objRef;
            try {
                let result = f.apply(constructValue(c.calldata[0]), c.calldata[1].map((x: any) => constructValue(x)));

                if ((result instanceof Promise && !c.async) || (!(result instanceof Promise) && c.async)) {
                    console.error('Return type not match');
                }
                if (result instanceof Promise) {
                    result = await result;
                }
                checkTypeConsistency(result, c.target);
            } catch (e) {
                console.error(`Error occurs in executing node ${nodeId}.`);
            }
        }
    }

    let iteration = 0;
    while (iteration < argv.maxIteration) {
        findNewObjects(entryNodeId);
        iteration += 1;
    }
})()

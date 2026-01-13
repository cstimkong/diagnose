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

let nodeMap = {};

const mod = loadmodule(argv.libraryPath as string, instrument);

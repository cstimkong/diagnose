/**
 * 
 * Entry file of Diagnose
 */

import {hideBin} from 'yargs/helpers';
import yargs from 'yargs';
import process from 'process';

const argv = yargs(hideBin(process.argv))
.option('max-execution-time', {type: 'number', })
.demandOption([])
.parse();


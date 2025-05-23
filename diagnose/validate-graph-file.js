const Ajv = require('ajv');
const fs = require('node:fs');
const yargs = require('yargs/yargs');
const {hideBin} = require('yargs/helpers');

const schema = require('./schema.json');

let argv = yargs().usage('Validate an object relation graph file')
.option('input', {
    alias: 'i',
    type: 'string',
    description: 'Input file for validation'
})
.demandOption(['input'])
.help().parse(hideBin(process.argv));

let ajv = new Ajv();

let validate = ajv.compile(schema);
let fileContent = fs.readFileSync(argv.input, {encoding: 'utf-8'});
const valid = validate(fileContent);

if (!valid) {
    console.warn(validate.errors);
} else {
    console.log('The input file is OK');
}
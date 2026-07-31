import instrument from '../instrument.js'
import {readFile} from 'fs';
import {join} from 'path';
console.log(instrument('let a = {}, b = Object.create(null), c = function() { }; console.log(typeof a); class A {}'));

readFile(join(__dirname, '../../example_packages/minimal_module.js'), {encoding: 'utf-8'}, (err, data) => {
    if (!err) {
        console.log(instrument(data));
    }
});
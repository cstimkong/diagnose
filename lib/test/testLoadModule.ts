import loadmodule from '../loadmodule.js';
import {resolve, join} from 'path';
import instrument from '../instrument.js';

(globalThis as any).getGlobalId = (function() {
    let i = 0;
    return function() {
        return i++;
    }
})();

const mod: any = loadmodule(join(__dirname, '../../example_packages/qs.js'), instrument);
console.log(mod);
console.log(mod.__globalid__, mod.formats.__globalid__);
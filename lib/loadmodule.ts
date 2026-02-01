/**
 * 
 * A simple implementation of module loader
 */

import {addHook} from 'pirates';

export default function(path: string, instrumentFunc?: (code: string) => string) {
    const revert = addHook((code, _) => {
        return instrumentFunc ? instrumentFunc(code) : code
    }, {ext: ['.js'], ignoreNodeModules: true});

    const obj = require(path);
    revert();
    return obj;
}


/**
 * 
 * A simple implementation of module loader
 */

import {addHook} from 'pirates';
import {cwd} from 'process';
import {createRequire} from 'module';
export default function(path: string, instrumentFunc?: (code: string) => string) {
    const r = createRequire('file://' + cwd() + '/');
    const revert = addHook((code, _) => {
        return instrumentFunc ? instrumentFunc(code) : code
    }, {ext: ['.js'], ignoreNodeModules: true});
    
    const obj = r(path);
    revert();
    return obj;
}


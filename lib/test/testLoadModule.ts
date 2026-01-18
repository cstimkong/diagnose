import loadmodule from '../loadmodule.js';
import {resolve, join} from 'path';
import instrument from '../instrument.js';
import { __getGlobalId__, __typeofimpl__, __defineproperty__, 
    __getownpropertynames__, __objectkeys__, 
    __reflectownkeys__, __getownpropertydescriptors__ } from '../patch.js';
(globalThis as any).__getGlobalId__ = __getGlobalId__;
(globalThis as any).__typeofimpl__ = __typeofimpl__;
(globalThis as any).__defineproperty__ = __defineproperty__;
(globalThis as any).__getownpropertynames__ = __getownpropertynames__;
(globalThis as any).__objectkeys__ = __objectkeys__;
(globalThis as any).__reflectownkeys__ = __reflectownkeys__;
(globalThis as any).__getownpropertydescriptors__ = __getownpropertydescriptors__;

const mod: any = loadmodule(join(__dirname, '../../example_packages/mongoose.js'), instrument);
console.log(mod);
console.log(mod.__globalid__);
// console.log(mod.string.__globalid__);
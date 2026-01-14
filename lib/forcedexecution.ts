/**
 * 
 * Forced Execution
 */
import {randomString, randomNumber, randomChoose} from './random.js';

function getProxy(): any {
    let state = 'any';
    let internalValue: any = undefined;
    let target: any = {};
    return new Proxy(function() {}, {
        get(_, p) {
            if (p === '__value__') {
                if (internalValue !== undefined) {
                    return internalValue;
                }
                if (state === 'string') {
                    return Symbol.for('AnyString');
                }
                if (state === 'number') {
                    return Symbol.for('AnyNumber');
                }
                if (state === 'any') {
                    return Symbol.for('Any');
                }
                if (state === 'object') {
                    let result = {};
                    for (let p of Object.getOwnPropertyNames(target)) {
                        (result as any)[p] = target[p].__value__;
                    }
                    return result;
                }
            }
            if (Object.hasOwn(target, p)) {
                return target[p];
            }
            if (p === Symbol.toPrimitive) {
                return function(hint: string) {
                    if (internalValue !== undefined) {
                        return internalValue;
                    }
                    if (state === 'string') {
                        internalValue = randomString();
                    }
                    if (state === 'number') {
                        internalValue = randomNumber();
                    }
                    if (state === 'object') {
                        throw new Error('Should not coerce an object to a string');
                    }
                    if (state === 'any') {
                        if (hint === 'number') {
                            state = 'number';
                            internalValue = randomNumber();
                        }
                        else if (hint === 'string') {
                            state = 'string';
                            internalValue = randomString();
                        }
                    }
                    return internalValue;
                }
            }
            if (state === 'object') {
                return randomChoose([
                    () => undefined,
                    function() {
                        target[p] = getProxy();
                        return target[p];
                    }
                ]);
            }
            if (state === 'any') {
                let choices = [];
                if (typeof (String.prototype as any)[p] === 'function') {
                    choices.push(function() {
                        state = 'string';
                        return (String.prototype as any)[p];
                    })
                }
                if (typeof (Array.prototype as any)[p] === 'function') {
                    choices.push(function() {
                        state = 'array';
                        return (Array.prototype as any)[p];
                    })
                }
                if (typeof (Number.prototype as any)[p] === 'function') {
                    choices.push(function() {
                        state = 'number';
                        return (Number.prototype as any)[p];
                    })
                }
                choices.push(function() {
                        state = 'object'; 
                        return undefined; 
                    },
                    function() {
                        state = 'object';
                        target[p] = getProxy();
                        return target[p];
                    }
                );
                return randomChoose(choices);
            }
            if (state === 'string') {
                internalValue = randomString();
                return (String.prototype as any)[p];
            }
            
        },

        set(_, p, newValue) {
            if (state === 'string' || state === 'number') {
                throw new Error('Should not set a property for a primitive value');
            }
            state = 'object';
            target[p] = newValue;
            return true;
        },

        apply(_, thisArg, argArray) {
            if (state === 'any') {
                state = 'function';
            }
        }
    })
}

export default function(func: Function, argNum: number) {
    let args = [];
    for (let i = 0; i < argNum; i++) {
        args.push(getProxy());
    }
    let result = func.apply(undefined, args);
    let argReps = [];
    for (let i = 0; i < args.length; i++) {
        argReps.push(args[i].__value__);
    }
    return [argReps, result];
}
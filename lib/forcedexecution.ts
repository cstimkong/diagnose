/**
 * 
 * Forced Execution
 */
import { randomString, randomNumber, randomChoose, randomSample } from './random.js';

function getProxy(): any {
    let state = 'any';
    let internalValue: any = undefined;
    let target: any = {};
    let retValues: any[] = [];
    let elements: any = undefined;
    return new Proxy(function() {}, {
        get(_, p) {
            if (p === '__value__') {
                if (typeof internalValue === 'number') {
                    return `${internalValue}`;
                }
                if (typeof internalValue === 'string') {
                    return `"${internalValue}"`;
                }
                if (state === 'string') {
                    return 'Symbol.for(\"AnyString\")';
                }
                if (state === 'number') {
                    return 'Symbol.for(\"AnyNumber\")';
                }
                if (state === 'true') {
                    return true;
                }
                if (state === 'false') {
                    return false;
                }
                if (state === 'any') {
                    return 'Symbol.for(\"Any\")';
                }

                if (state === 'object') {
                    let result = '{';
                    for (let p of Object.getOwnPropertyNames(target)) {
                        result += `"${p.replace('"', '\\"')}": ${target[p].__value__}, `;
                    }
                    if (elements !== undefined) {
                        let elementRep = '[';
                        for (let e of elements) {
                            elementRep += `${e.__value__}, `;
                        }
                        elementRep += ']';
                        result += `[Symbol.iterator]: function() { let e = ${elementRep}, i = 0; return {next: function() { if (i < e.length) {return {value: e[i++], done: false} } else {return {value: undefined, done: true} } } } }`;
                    }
                    result += '}';
                    return result;
                }
                if (state === 'function') {
                    let retv = randomSample(retValues).__value__;
                    return `function() { return ${retv} }`;
                }
            }
            if (p === '__typeof__') {
                if (state === 'string') {
                    return 'string';
                }
                if (state === 'number') {
                    return 'number';
                }
                if (state === 'true' || state === 'false') {
                    return 'boolean';
                }
                if (state === 'object') {
                    return 'object';
                }
                if (state === 'any') {
                    return randomChoose([
                        function() { state = 'string'; return 'string'; },
                        function() { state = 'number'; return 'number'; },
                        function() { state = 'object'; return 'object'; },
                        function() { state = 'function'; return 'function'; }
                    ]);
                }
            }
            if (Object.hasOwn(target, p)) {
                return target[p];
            }
            
            // Special symbol Symbol.toPrimitive
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
                    if (state === 'true') {
                        return hint === 'string' ? 'true' : 1;
                    }
                    if (state === 'false') {
                        return hint === 'string' ? 'true' : 1;
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

            // Special symbol Symbol.iterator
            if (p === Symbol.iterator) {
                state = 'object';
                if (elements === undefined) {
                    elements = [];
                    let len = randomNumber(10);
                    for (let i = 0; i < len; i++) {
                        elements.push(getProxy());
                    }
                }
                
                return function() {
                    let c = 0;
                    return {
                        next: function() {
                            if (c < elements.length) {
                                return {value: elements[c++], done: false};
                            }
                            else {
                                return {value: undefined, done: true};
                            }
                        }
                    }
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
            if (state === 'any' || state === 'function') {
                state = 'function';
                let retValue = getProxy();
                retValues.push(retValue);
                return retValue;
            } else {
                throw new Error('Cannot be called');
            }
        }
    })
}

function getValueRepresentation(value: any) {
    if (value === undefined) {
        return 'undefined';
    }
    else if (value === null) {
        return 'null';
    }
    else if (typeof value === 'string') {
        return `"${value}"`;
    }
    else if (typeof value === 'number' || typeof value === 'boolean') {
        return `${value}`;
    }
    else if (typeof value === 'object' || typeof value === 'function') {
        return value.__value__;
    }
    throw new Error('Cannot get representation.' + typeof value);
}

/**
 * Forcefully execute a function.
 * 
 * @param func The function to forcefully execute
 * @param argNum the number of the argument
 * @param thisArg whether to set a proxy object for thisArg
 * @returns the representation of thisArg, arguments and the concrete value of the result
 */
export default async function(func: Function, argNum: number, thisArg?: boolean, construct?: boolean): Promise<[any, any[], any]> {
    let args = [];
    for (let i = 0; i < argNum; i++) {
        args.push(getProxy());
    }
    let thisArgValue = thisArg ? getProxy() : undefined;
    let result;
    if (construct) {
        result = Reflect.construct(func, args);
    } else {
        result = func.apply(thisArgValue, args);
    }
    if (result instanceof Promise) {
        result = await result;
    }
    let argReps = [];
    for (let i = 0; i < args.length; i++) {
        argReps.push(getValueRepresentation(args[i]));
    }
    return [getValueRepresentation(thisArg), argReps, result];
}
/**
 * 
 * Forced Execution.
 * 
 * This file is part of Diagnose.
 */
import { randomString, randomNumber, randomChoose, randomSample } from './random.js';

function getProxy(): any {
    return new Proxy({}, {
        get(target, p) {
            if (p === '__value__') {
                let result = '{';
                for (let p of Object.getOwnPropertyNames(target)) {
                    result += `"${p.replace('"', '\\"')}": ${(target as any)[p].__value__}, `;
                }
                result += '}';
                return result;
            }

            if (p === '__typeof__') {
                return 'object';
            }

            // Special symbol Symbol.toPrimitive
            if (p === Symbol.toPrimitive) {
                throw new Error('Unsupported operation');
            }

            // Special symbol Symbol.iterator
            if (p === Symbol.iterator) {
                throw new Error('Unsupported operation');
            }

            if (Object.hasOwn(target, p)) {
                return (target as any)[p];
            } else {
                return randomChoose([
                    () => undefined,
                    function () {
                        (target as any)[p] = getProxy();
                        return (target as any)[p];
                    }
                ]);
            }
        },

        set(target, p, newValue) {
            (target as any)[p] = newValue;
            return true;
        },

        apply(_) {
            throw new Error('Cannot be called');
        }
    })
}

function getArray() {
    let a = [];
    let c = randomNumber(5);
    for (let i = 0; i < c; i++) {
        a.push(randomChoose([
            () => getProxy(),
            () => randomNumber(),
            () => randomString(),
            () => true,
            () => false,
            () => undefined,
            () => null,
            () => getFunctionProxy()
        ]));
    }
    return a;
}

function getFunctionProxy() {
    let returnValues: any[] = [];
    return new Proxy(function() {}, {
        apply(_, thisArg, argArray) {
            let returnValue = randomChoose([
                () => getProxy(),
                () => randomNumber(),
                () => randomString(),
                () => true,
                () => false,
                () => undefined,
                () => null,
                () => getFunctionProxy(),
                () => getArray()
            ]);
            returnValues.push(returnValue);
            return returnValue;
        },

        get(target, p) {
            if (p === '__value__') {
                return `function() { return ${getValueRepresentation(randomSample(returnValues))}`; 
            } else {
                return (target as any)[p];
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
export default async function (func: Function, argNum: number, thisArg?: boolean, construct?: boolean) {
    let args = [];
    let _async = false;
    for (let i = 0; i < argNum; i++) {
        args.push(randomChoose([
            () => getProxy(),
            () => randomNumber(),
            () => randomString(),
            () => true,
            () => false,
            () => undefined,
            () => null,
            () => getFunctionProxy(),
            () => getArray()
        ]));
    }
    let thisArgValue = thisArg ? getProxy() : undefined;
    let result;
    if (construct) {
        result = Reflect.construct(func, args);
    } else {
        result = func.apply(thisArgValue, args);
    }
    if (result instanceof Promise) {
        _async = true;
        result = await result;
    }
    let argReps = [];
    for (let i = 0; i < args.length; i++) {
        argReps.push(getValueRepresentation(args[i]));
    }
    return { thisArg: getValueRepresentation(thisArg), args: argReps, result: result, async: _async };
}
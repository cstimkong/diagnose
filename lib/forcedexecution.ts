/**
 * 
 * Forced Execution
 */

function randomString(): string {
    let length = Math.floor(Math.random() * 10);
    let str = '';
    for (let i = 0; i < length; i++) {
        str += String.fromCharCode(Math.floor(Math.random() * 26) + 97); // a-z
    }
    return str;
}

function randomNumber(): number {
    return randomChoose([
        function () {
            return Math.floor(Math.random() * 10);
        },
        function () {
            return Math.floor(Math.random() * 100);
        },
        function () {
            return Math.floor(Math.random() * 1000);
        },
        function () {
            return Math.floor(Math.random() * 10000);
        },
        function () {
            return Math.floor(Math.random() * 100000);
        },
    ])
}

function randomChoose<T>(funcs: {(): T}[]) {
    let idx = Math.floor(Math.random() * funcs.length);
    return funcs[idx]!();
}

function getProxy() {
    let state = 'any';
    let internalValue: any = undefined;

    return new Proxy({}, {
        get(target: any, p) {
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

        set(target, p, newValue) {
            if (state === 'string' || state === 'number') {
                throw new Error('Should not set a property for a primitive value');
            }
            state = 'object';
            target[p] = newValue;
            return true;
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
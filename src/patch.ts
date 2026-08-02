/**
 * 
 * Patch for forced execution.
 * 
 * This file is part of Diagnose.
 */
import { randomChoose } from "./random.js";

export function __typeofimpl__(value: any) {
    if (value === undefined) {
        return 'undefined';
    }
    else if (value === null) {
        return 'object';
    }
    else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return typeof value;
    }
    else if (typeof value === 'object') {
        if (value.__typeof__) {
            return value.__typeof__;
        }
        else {
            return 'object';
        }
    }
    else {
        return typeof value;
    }
}

export const __getGlobalId__ = (function () {
    let i = 0;
    return function () {
        return i++;
    }
})();

export function __setglobalid__(obj: any) {
    if ((globalThis as any).__enablesetglobalid__) {
        Object.defineProperty(obj, '__globalid__', { value: __getGlobalId__(), enumerable: false });
        if (typeof obj === 'function') {
            Object.defineProperty(obj.prototype, '__globalid__', {value: __getGlobalId__(), enumerable: false});
        }
    }
    return obj;
}


export function __getownpropertynames__(obj: any): string[] {
    return Object.getOwnPropertyNames(obj).filter(x => x !== '__globalid__');
}

export function __objectkeys__(obj: any) {
    return Object.keys(obj).filter(x => x !== '__globalid__');
}

export function __reflectownkeys__(obj: any) {
    return Reflect.ownKeys(obj).filter(x => x !== '__globalid__');
}

export function __getownpropertydescriptors__(obj: any) {
    let o = Object.getOwnPropertyDescriptors(obj);
    if (o.__globalid__) {
        delete o['__globalid__'];
    }
    return o;
}

export function __comparison__(left: any, right: any, op: string) {
    let leftProxy = false, rightProxy = false;
    if (typeof left === 'object' && left !== null && left.__typeof__ === 'string') {
        leftProxy = true;
    }
    if (typeof right === 'object' && right !== null && right.__typeof__ === 'string') {
        rightProxy = true;
    }

    if (leftProxy && !rightProxy && typeof right === 'string') {
        return randomChoose([function() {
            left.__setvalue__(right);
            return true;
        },
        function() {
            return false;
        }]);
    }
    if (rightProxy && !leftProxy && typeof left === 'string') {
        return randomChoose([function() {
            right.__setvalue__(left);
            return true;
        },
        function() {
            return false;
        }]);
    }
    if (op === '===')
        return left === right;
    else if (op === '==')
        return left == right;
}

/**
 * Patch the critical global functions related to object manipulation.
 */
export function patchGlobalFunctions(globalThisObj?: object) {
    if (!globalThisObj) {
        globalThisObj = globalThis;
    }

    (globalThisObj as any).__getGlobalId__ = __getGlobalId__;
    (globalThisObj as any).__typeofimpl__ = __typeofimpl__;
    (globalThisObj as any).__getownpropertynames__ = __getownpropertynames__;
    (globalThisObj as any).__objectkeys__ = __objectkeys__;
    (globalThisObj as any).__reflectownkeys__ = __reflectownkeys__;
    (globalThisObj as any).__getownpropertydescriptors__ = __getownpropertydescriptors__;
    (globalThisObj as any).__setglobalid__ = __setglobalid__;
    (globalThisObj as any).__comparison__ = __comparison__;
}
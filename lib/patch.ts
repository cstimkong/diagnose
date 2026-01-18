
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

export const __getGlobalId__ = (function() {
    let i = 0;
    return function() {
        return i++;
    }
})();

export function __defineproperty__(obj: any, key: string, value: any) {
    if (Object.hasOwn(obj, key)) {
        console.log(obj, key);
    }
    return Object.defineProperty(obj, key, { enumerable: false, value: value });
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
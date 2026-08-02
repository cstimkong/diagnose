
/**
 * 
 * This file is part of Diagnose.
 */

export function randomString(): string {
    let length = Math.floor(Math.random() * 10);
    let str = '';
    let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*().,/\\? '
    for (let i = 0; i < length; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}

export function randomNumber(limit?: number): number {
    if (limit) {
        return Math.floor(Math.random() * limit);
    }
    
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

/**
 * Randomly choose a function to execute. The function should have no argument.
 * @param funcs Funtion list
 * @returns any value returned by the chosen function
 */
export function randomChoose(funcs: Function[]): any {
    let idx = Math.floor(Math.random() * funcs.length);
    return funcs[idx]!();
}


export function randomSample(elements: any[]) {
    let idx = Math.floor(Math.random() * elements.length);
    return elements[idx];
}
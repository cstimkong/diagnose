
export function randomString(): string {
    let length = Math.floor(Math.random() * 10);
    let str = '';
    for (let i = 0; i < length; i++) {
        str += String.fromCharCode(Math.floor(Math.random() * 26) + 97); // a-z
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
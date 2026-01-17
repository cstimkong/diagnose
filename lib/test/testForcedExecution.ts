import forcedExecution from '../forcedexecution.js'

let testfunc = function (a: any, b: any, callback: (x: any, y: any) => any) {
    ((x) => { })(a.charAt(0) === 'b');
    if (b.value < 100) {
        ((x) => { })(a.hello);
    }
    callback(a, b).elements;
}

var qs = require('../../example_packages/qs.js');

for (let i = 0; i < 1000; i++) {
    try {
        let [thisArg, args, result] = forcedExecution(qs.parse, 3, true);
        console.log(thisArg);
        console.log(args);
    } catch (e) {
        // console.log(e);
    }

}
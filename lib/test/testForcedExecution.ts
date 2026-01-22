import forcedExecution from '../forcedexecution.js';
// let testfunc = function (a: any, b: any, callback: (x: any, y: any) => any) {
//     ((x) => { })(a.charAt(0) === 'b');
//     if (b.value < 100) {
//         ((x) => { })(a.hello);
//     }
//     callback(a, b).elements;
// }

(async function() {
    var lib = require('../../example_packages/joi.js');

    for (let i = 0; i < 200; i++) {
        try {
            let [thisArg, args, result] = await forcedExecution(lib.string, Math.floor(Math.random() * 6), true);
            console.log(thisArg);
            console.log(args);
        } catch (e) {
            // console.log(e);
        }

    }
})()
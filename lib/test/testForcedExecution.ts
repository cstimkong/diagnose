import forcedExecution from '../forcedexecution.js'

for (let i = 0; i < 1000; i++) {
    try {
        let [args, result] = forcedExecution(function(a: any, b: any, callback: (x: any, y: any) => any) {
            ((x) => {})(a.charAt(0) === 'b');
            if (b.value < 100) {
                ((x) => {})(a.hello);
            }
            console.log(callback(a, b).elements);
        }, 3)
        console.log(args);
    } catch(e) {
        // ignore
    }

}
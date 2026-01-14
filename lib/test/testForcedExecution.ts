import forcedExecution from '../forcedexecution.js'

for (let i = 0; i < 100; i++) {
    try {
        let [args, result] = forcedExecution(function(a: any, b: any) {
            ((x) => {})(a.name);
            if (b.value < 100) {
                ((x) => {})(a.hello);
            }
        }, 2)
        console.log(args);
    } catch(e) {

    }

}
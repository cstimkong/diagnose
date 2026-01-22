import instrument from '../instrument.js'

console.log(instrument('let a = {}, b = Object.create(null), c = function() { }; console.log(typeof a); class A {}'));

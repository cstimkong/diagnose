const { fromJS } = require('immutable');
const nested = fromJS({ a: { b: { c: [3, 4, 5] } } });
// Map { a: Map { b: Map { c: List [ 3, 4, 5 ] } } }
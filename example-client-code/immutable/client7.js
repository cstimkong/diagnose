const { Seq } = require('immutable');
const myObject = { a: 1, b: 2, c: 3 };
Seq(myObject)
  .map(x => x * x)
  .toObject();
// { a: 1, b: 4, c: 9 }
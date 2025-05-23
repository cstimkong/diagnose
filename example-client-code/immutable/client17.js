const { Seq } = require('immutable');
const oddSquares = Seq([1, 2, 3, 4, 5, 6, 7, 8])
  .filter(x => x % 2 !== 0)
  .map(x => x * x);
const { Map } = require('immutable');
const originalMap = Map({ a: 1, b: 2, c: 3 });
const updatedMap = originalMap.set('b', 2);
updatedMap === originalMap; // No-op .set() returned the original reference.
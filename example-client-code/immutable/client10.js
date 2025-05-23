const { List } = require('immutable');
const aList = List([1, 2, 3]);
const anArray = [0, ...aList, 4, 5]; // [ 0, 1, 2, 3, 4, 5 ]
import { replacePlaceholders } from "../value.js";

console.log(replacePlaceholders('{a: Symbol.for("Any"), b: 3}'));
console.log(replacePlaceholders('{a: Symbol.for("Any"), b: Symbol.for("AnyNumber"), c: function() { return Symbol.for("AnyString") } }'));
const commander = require('commander');
const program = new commander.Command();

program
  .option('--no-sauce', 'Remove sauce')
  .option('--cheese <flavour>', 'cheese flavour', 'mozzarella')
  .option('--no-cheese', 'plain with no cheese');

program.parse();

const options = program.opts();
const sauceStr = options.sauce ? 'sauce' : 'no sauce';
const cheeseStr =
  options.cheese === false ? 'no cheese' : `${options.cheese} cheese`;
console.log(`You ordered a pizza with ${sauceStr} and ${cheeseStr}`);

// Try the following:
//    node options-negatable.js
//    node options-negatable.js --sauce
//    node options-negatable.js --cheese=blue
//    node options-negatable.js --no-sauce --no-cheese
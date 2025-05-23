function getRandomInt(n) {
    return Math.floor(Math.random() * n)
}

function makeRandomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_.-+=?/[]()<>,';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

function evalObject(s) {
    return new Function(`return ${s}`)()
}

module.exports = {getRandomInt, makeRandomString, evalObject}
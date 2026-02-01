
module.exports.test = function(x) {
    let a = new A();
    a.s = x.s;
    return a;
}

class A {
    num;
    s;
}
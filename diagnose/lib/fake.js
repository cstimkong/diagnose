'use strict'

const {getRandomInt, makeRandomString} = require('./utils');

/* The following classes are only for representation of fake values */

class FakeValue { }

class FakeNumber { }

class FakeObject { }

class FakeString { }

class FakeBoolean { }

class FakeDate { }

class FakeFunction {
    constructor(returnValue) {
        this.returnValue = returnValue
    }
}

var __fakeValue = new FakeValue()
var __fakeNumber = new FakeNumber()
var __fakeObject = new FakeObject()
var __fakeString = new FakeString()
var __fakeBoolean = new FakeBoolean()
var __fakeDate = new FakeDate()


function getFake(options) {
    let internalObject = {}
    options = options || {}
    let isObject = undefined || options.isObject,
      isNumber = undefined || options.isNumber,
      isBoolean = undefined || options.isBoolean,
      isString = undefined || options.isString,
      isArray = undefined || options.isArray,
      isDate = undefined || options.isDate,
      isFunction = undefined || options.isFunction

    let internalValue = undefined
    let fakeFunctionObject = undefined
    let targetObj = {}

    return new Proxy(targetObj, {
        get: function(_target, p, _receiver) {

            // A special property for access the current determined part of the fake value. The result contain no proxies.
            if (p === '__internalvalue__') {
                if (isNumber || isString || isBoolean) {
                    if (internalValue) {
                        return internalValue
                    }
                }
                if (isNumber) {
                    return __fakeNumber
                }
                if (isString) {
                    return __fakeString
                }
                
                if (isBoolean) {
                    return __fakeBoolean
                }
                if (isFunction) {
                    return new FakeFunction(fakeFunctionObject.__returnval__)
                }
                if (isDate) {
                    return __fakeDate
                }

                if (!isObject && !isNumber && !isString && !isFunction && !isArray && 
                    !isDate && Object.keys(internalObject).length === 0) {
                    return __fakeValue
                }

                let o = {}
                let properties = Object.getOwnPropertyNames(internalObject)
                for (let key of properties) {
                    if (internalObject[key] !== null && internalObject[key] !== undefined) {
                        if (internalObject[key].__fakevalue__) {
                            o[key] = internalObject[key].__internalvalue__
                        } else {
                            o[key] = internalObject[key]
                        }
                    }
                    
                }
                
                return o
            }
            // a special property for determining whether an object is a ``fake'' value
            if (p === '__fakevalue__') {
                return true
            }

            // a special property representing the result of typeof operation
            if (p === '__typeof__') {
                if (isObject) {
                    return "object"
                } else if (isString) {
                    return "string"
                } else if (isNumber) {
                    return "number"
                } else if (isFunction) {
                    return "function"
                } else {
                    switch (getRandomInt(3)) {
                        case 0:
                            isObject = true
                            return "object"
                        case 1:
                            isString = true
                            return "string"
                        case 2:
                            isNumber = true
                            return "number"
                    }
                }
            }

            // if the ``call'' or ``apply'' property of a fake value is accessed, then the 
            // fake value should be a function
            if (p === 'call' || p === 'apply') {
                if (isNumber === true || isBoolean === true || isString === true 
                    || isArray === true || isObject === true) {
                    return undefined
                }
                isFunction = true
                isNumber = isBoolean = isString = isObject = isArray = isDate = false
                let returnVal = undefined
                fakeFunctionObject = new Proxy(function() { }, {
                    apply: function(_target, _thisArg, _argArray) {
                        if (!returnVal) {
                            returnVal = getFake()
                        }
                        return returnVal
                    },
                    get: function(target, p, receiver) {
                        if (p === '__returnval__') {
                            return returnVal.__internalvalue__
                        }
                        return target[p]
                    }
                })
                return fakeFunctionObject
            }

            // mock toString method
            if (p === 'toString') {
                return function() {
                    if (internalValue !== undefined) {
                        return internalValue.toString()
                    }
                    if (isNumber) {
                        if (internalValue === undefined) {
                            internalValue = getRandomInt(1000000)
                        }
                        return internalValue.toString()
                    }
                    if (isString) {
                        if (internalValue === undefined) {
                            internalValue = makeRandomString(10)
                        }
                        return internalValue
                    }
                    if (isBoolean) {
                        if (internalValue === undefined) {
                            internalValue = getRandomInt(2) === 0
                        }
                        return internalValue
                    }
                    if (isArray) {
                        return '[]'
                    }
                    if (isObject) {
                        return Object.prototype.toString.call(internalObject)
                    }
                    if (isFunction) {
                        return 'function() { }'
                    }
                    return '<Fake Any>'
                }
            }

            // mock well-known symbol Symbol.toStringTag
            if (p === Symbol.toStringTag) {
                if (isObject === true) {
                    return 'Object'
                } else if (isString === true) {
                    return 'String'
                } else if (isNumber === true) {
                    return 'Number'
                } else if (isDate === true) {
                    return 'Date'
                } else if (isArray === true) {
                    return 'Array'
                } else if (isBoolean === true) {
                    return 'Boolean'
                } else if (isFunction === true) {
                    return 'Function'
                }
                switch (getRandomInt(6)) {
                    case 0:
                        isObject = true
                        isString = isNumber = isDate = isArray = isFunction = isBoolean = false
                        return 'Object'
                    case 1:
                        isString = true
                        isNumber = isObject = isDate = isArray = isFunction = isBoolean = false
                        internalObject = {}
                        return 'String'
                    case 2:
                        isNumber = true
                        isString = isObject = isDate = isArray = isFunction = isBoolean = false
                        internalObject = {}
                        return 'Number'
                    case 3:
                        isArray = true
                        isString = isNumber = isDate = isFunction = isArray = isBoolean = false
                        internalObject = {}
                        return 'Array'
                    case 4:
                        isDate = true
                        isString = isNumber = isObject = isFunction = isArray = isBoolean = false
                        return 'Date'
                    case 5:
                        isBoolean = true
                        isString = isNumber = isObject = isFunction = isArray = isDate = false
                        return 'Boolean'
                }
            }

            // mock well-known symbol Symbol.toPrimitive
            if (p === Symbol.toPrimitive) {
                if (isObject || isFunction || isDate) {
                    return undefined
                }
                return function(hint) {
                    if (hint === 'number') {
                        isNumber = true
                        isString = isObject = isDate = isArray = isFunction = isBoolean = false
                        internalValue = Math.floor(Math.random() * 100000000)
                        return internalValue
                    }
                    if (hint === 'string') {
                        isString = true
                        isNumber = isDate = isArray = isFunction = isBoolean = false
                        internalValue = makeRandomString(10)
                        return internalValue
                    }
                }
            }


            if (isNumber) {
                return Number.prototype[p]
            }

            if (isString) {
                if (String.prototype[p]) {
                    return String.prototype[p]
                }

                if (internalValue !== undefined) {
                    return internalValue[p]
                }

                internalValue = makeRandomString(10)
                return internalValue[p]
            }
            
            if (!isString && !isNumber && !isFunction) {
                if (String.prototype[p] === undefined && Number.prototype[p] === undefined
                     && Function.prototype[p] === undefined) {
                    isObject = true
                }
                if (internalObject.hasOwnProperty(p)) {
                    return internalObject[p]
                }
                switch (getRandomInt(2)) {
                    case 0:
                        internalObject[p] = getFake()
                        return internalObject[p]
                    case 1:
                        return undefined
                }
            }
            return undefined
            
        },
        set: function(_target, p, newValue, _receiver) {
            if (isString || isNumber) {
                return false
            }
            internalObject[p] = newValue
            return true
        },
        ownKeys: function(target) {
            if (isNumber) {
                return []
            }
            if (isString) {
                if (internalValue === undefined) {
                    internalValue = makeRandomString(10)
                }
                return Object.keys(internalValue)
            }
            if (isArray) {
                return Object.keys(internalObject)
            }
            if (isFunction) {
                return []
            }
            return Object.keys(internalObject)
        }
    });
}

function isFake(obj) {
    return typeof obj === 'object' && obj !== null && obj.__fakevalue__
}

module.exports = {getFake, isFake, FakeValue, FakeObject, 
    FakeNumber, FakeString, FakeBoolean, FakeDate, FakeFunction
}
/* global describe, it */
const fs = require('fs')
const { optimizeJs } = require('../')
const assert = require('assert')
const testCases = fs.readdirSync('test/cases')
const benchmarkLibs = fs.readdirSync('benchmarks').filter(function (script) {
  return !script.includes('.min') &&
    !script.includes('.optimized') &&
    script.includes('.js')
})

describe('main test suite', function () {
  it('smoke', function () {
    assert.equal(
      optimizeJs('var x=function(){}()'),
      'var x=(function(){})()'
    )
    assert.equal(
      optimizeJs('var do1=function(){},do2=()=>{},dont1=function dont1(){}'),
      'var do1=(function(){}),do2=(()=>{}),dont1=function dont1(){}'
    )
    assert.equal(
      optimizeJs('[].concat([function(a){},b=>{},(function(c){}),(d=>{})])'),
      '[].concat([(function(a){}),(b=>{}),(function(c){}),(d=>{})])'
    )
    assert.equal(
      optimizeJs('chunk.push([{1:function(a){},2:b=>{},x:function(a){},y:b=>{}}])'),
      'chunk.push([{1:(function(a){}),2:(b=>{}),x:(function(a){}),y:(b=>{})}])'
    )
  })

  testCases.forEach(function (testCase) {
    it('test ' + testCase, function () {
      return Promise.all([
        fs.promises.readFile(`test/cases/${testCase}/input.js`, 'utf8'),
        fs.promises.readFile(`test/cases/${testCase}/output.js`, 'utf8')
      ]).then(function ([input, expected]) {
        const actual = optimizeJs(input)
        assert.equal(actual, expected)
      })
    })
  })

  // test all the benchmark libs for good measure
  benchmarkLibs.forEach(function (script) {
    it('check benchmark lib ' + script, function () {
      return fs.promises.readFile('benchmarks/' + script, 'utf8').then(function (input) {
        optimizeJs(input) // ensure no crashes
      })
    })
  })
})

describe('options', function () {
  it('sourceMap', function () {
    const res = optimizeJs('var baz = function () { console.log("foo") }()', { sourceMap: true })
    assert.equal(res, 'var baz = (function () { console.log("foo") })()' +
      '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxXQUFVLG1DQUFrQyJ9')
  })

  describe('handleFunctionDeclarations', function () {
    it('skips FunctionDeclarations, if set to "none"', function () {
      const res = optimizeJs('function a(){}', { handleFunctionDeclarations: 'none' })
      assert.equal(res, 'function a(){}')
    })

    it('handles all FunctionDeclarations, if set to "unsafe"', function () {
      const res = optimizeJs('a(); function a(){} function b(){} b();', { handleFunctionDeclarations: 'unsafe' })
      assert.equal(res, 'a(); var a=(function(){}); var b=(function(){}); b();')
    })

    it('preserves FunctionDeclarations for functions used before declaration, if set to "safe"', function () {
      const res = optimizeJs('a(); function a(){} function b(){} b();', { handleFunctionDeclarations: 'safe' })
      assert.equal(res, 'a(); function a(){} var b=(function(){}); b();')
    })
  })
})

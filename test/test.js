/* global describe, it */
const denodeify = require('denodeify')
const fs = require('fs')
const readFile = denodeify(fs.readFile)
const optimizeJs = require('../')
const assert = require('assert')
const testCases = fs.readdirSync('test/cases')
const benchmarkLibs = fs.readdirSync('benchmarks').filter(function (script) {
  return !script.includes('.min') &&
    !script.includes('.optimized') &&
    script.includes('.js')
})

describe('main test suite', function () {
  it('test sourcemaps', function () {
    var res = optimizeJs('var baz = function () { console.log("foo") }()', {
      sourceMap: true
    })
    assert.equal(res, 'var baz = (function () { console.log("foo") })()' +
      '\n//# sourceMappingURL=data:application/json;charset=utf-8;' +
      'base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbbn' +
      'VsbF0sInNvdXJjZXNDb250ZW50IjpbbnVsbF0sIm5hbWVzIjpbXSwibWFwcGl' +
      'uZ3MiOiJBQUFBLFVBQVUsQ0FBQSxrQ0FBa0MsQ0FBQSJ9')
  })
  testCases.forEach(function (testCase) {
    it('test ' + testCase, function () {
      return Promise.all([
        readFile('test/cases/' + testCase + '/input.js', 'utf8'),
        readFile('test/cases/' + testCase + '/output.js', 'utf8')
      ]).then(function (results) {
        var input = results[0]
        var expected = results[1]
        var actual = optimizeJs(input)
        assert.equal(actual, expected)
      })
    })
  })
  // test all the benchmark libs for good measure
  benchmarkLibs.forEach(function (script) {
    it('check benchmark lib ' + script, function () {
      return readFile('benchmarks/' + script, 'utf8').then(function (input) {
        optimizeJs(input) // ensure no crashes
      })
    })
  })
})

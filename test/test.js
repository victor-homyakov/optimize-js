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
    let res = optimizeJs.run('var baz = function () { console.log("foo") }()', {
      sourceMap: true
    })
    assert.equal(res, 'var baz = (function () { console.log("foo") })()' +
      '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxXQUFVLG1DQUFrQyJ9')

    res = optimizeJs.run('function xxx() { console.log("foo") }', {
      sourceMap: true
    })
    assert.equal(res, 'var xxx=(function xxx() { console.log("foo") });' +
        '\n//# sourceMappingURL=data:application/json;charset=utf-8;' +
        'base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiU0FBQSJ9')
  })

  it('test optimizeJsRollupPlugin', function () {
    const plugin = optimizeJs.optimizeJsRollupPlugin()
    const bundle = {
      testJs: {
        fileName: 'test.js',
        code: 'function x(){}'
      },
      testCss: {
        fileName: 'test.css',
        code: '.root{display:block}'
      }
    }
    plugin.generateBundle({}, bundle)
    assert.equal(bundle.testJs.code, 'var x=(function x(){});')
    assert.equal(bundle.testCss.code, '.root{display:block}')
  })

  testCases.forEach(function (testCase) {
    it('test ' + testCase, function () {
      return Promise.all([
        readFile('test/cases/' + testCase + '/input.js', 'utf8'),
        readFile('test/cases/' + testCase + '/output.js', 'utf8')
      ]).then(function (results) {
        const input = results[0]
        const expected = results[1]
        const actual = optimizeJs.run(input)
        assert.equal(actual, expected)
      })
    })
  })

  // test all the benchmark libs for good measure
  benchmarkLibs.forEach(function (script) {
    it('check benchmark lib ' + script, function () {
      return readFile('benchmarks/' + script, 'utf8').then(function (input) {
        optimizeJs.run(input) // ensure no crashes
      })
    })
  })
})

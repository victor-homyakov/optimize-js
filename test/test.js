/* global describe, it */
const fs = require('fs')
const { optimizeJs, optimizeJsRollupPlugin } = require('../')
const assert = require('assert')
const testCases = fs.readdirSync('test/cases')
const benchmarkLibs = fs.readdirSync('benchmarks').filter(function (script) {
  return !script.includes('.min') &&
    !script.includes('.optimized') &&
    script.includes('.js')
})

describe('main test suite', function () {
  it('test sourcemaps', function () {
    const res = optimizeJs('var baz = function () { console.log("foo") }()', { sourceMap: true })
    assert.equal(res, 'var baz = (function () { console.log("foo") })()' +
      '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxXQUFVLG1DQUFrQyJ9')
  })

  it('test optimizeJsRollupPlugin', function () {
    const plugin = optimizeJsRollupPlugin()
    const bundle = {
      testJs: {
        fileName: 'test.js',
        code: 'function x(){}'
      },
      testJs2: {
        fileName: 'test2.js',
        code: '[].concat([function(a){},function(b){}])'
      },
      testCss: {
        fileName: 'test.css',
        code: '.root{display:block}'
      }
    }
    plugin.generateBundle({}, bundle)
    assert.equal(bundle.testJs.code, 'function x(){}')
    assert.equal(bundle.testJs2.code, '[].concat([(function(a){}),(function(b){})])')
    assert.equal(bundle.testCss.code, '.root{display:block}')
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

'use strict'

const acorn = require('acorn')
const MagicString = require('magic-string')
const walk = require('estree-walker').walk

function optimizeJs (jsString, opts) {
  opts = opts || {}
  const ast = acorn.parse(jsString, { ecmaVersion: 2020 })
  const magicString = new MagicString(jsString)

  walk(ast, {
    enter: function (node, parent) {
      let prePreChar
      let preChar
      let postChar
      let postPostChar

      // assuming this node is an argument to a function or an element in an array,
      // return true if it itself is already padded with parentheses
      function isPaddedArgument (node, parent) {
        const parentArray = parent.arguments || parent.elements
        const idx = parentArray.indexOf(node)
        if (idx === 0) { // first arg
          if (prePreChar === '(' && preChar === '(' && postChar === ')') { // already padded
            return true
          }
        } else if (idx === parentArray.length - 1) { // last arg
          if (preChar === '(' && postChar === ')' && postPostChar === ')') { // already padded
            return true
          }
        } else { // middle arg
          if (preChar === '(' && postChar === ')') { // already padded
            return true
          }
        }
        return false
      }

      function isCallExpression (node) {
        return node && node.type === 'CallExpression'
      }

      // returns true iff node is an argument to a function call expression.
      function isArgumentToFunctionCall (node, parent) {
        return isCallExpression(parent) &&
          parent.arguments.length &&
          parent.arguments.indexOf(node) !== -1
      }

      // returns true iff node is an IIFE
      function isIIFE (node, parent) {
        return node.type === 'FunctionExpression' &&
          isCallExpression(parent) &&
          parent.callee === node
      }

      function isPlainExpression (node, parent) {
        if (node.id) {
          // ignore function expression with name
          return false
        }
        if (!parent) {
          return true
        }
        // ignore constructors, getters and methods
        if (parent.type === 'MethodDefinition') {
          return false
        }
        return parent.type === 'Property'
          ? parent.kind === 'init' && parent.method === false
          : true
      }

      // ignore node.type === 'FunctionDeclaration': padding breaks function hoisting
      if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
        prePreChar = jsString.charAt(node.start - 2)
        preChar = jsString.charAt(node.start - 1)
        postChar = jsString.charAt(node.end)
        postPostChar = jsString.charAt(node.end + 1)

        if (isArgumentToFunctionCall(node, parent)) {
          if (!isPaddedArgument(node, parent)) { // don't double-pad
            magicString
              .appendLeft(node.start, '(')
              .appendLeft(node.end, ')')
          }
        } else if (isIIFE(node, parent)) {
          // this function is getting immediately invoked, e.g. function(){}()
          if (preChar !== '(') {
            magicString
              .appendLeft(node.start, '(')
              .appendLeft(node.end, ')')
          }
        } else if (isPlainExpression(node, parent)) {
          if (preChar !== '(' && postChar !== ')') {
            magicString
              .appendLeft(node.start, '(')
              .appendLeft(node.end, ')')
          }
        }
      }
    }
  })

  let out = magicString.toString()
  if (opts.sourceMap) {
    out += '\n//# sourceMappingURL=' + magicString.generateMap().toUrl()
  }
  return out
}

function optimizeJsRollupPlugin () {
  return {
    name: 'optimize-js',
    generateBundle (options, outputBundle) {
      for (const key of Object.keys(outputBundle)) {
        const file = outputBundle[key]
        if (file.fileName.endsWith('.js')) {
          file.code = optimizeJs(file.code)
        }
      }
    }
  }
}

// noinspection JSUnusedGlobalSymbols
module.exports = { optimizeJs, optimizeJsRollupPlugin }

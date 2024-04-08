'use strict'

const acorn = require('acorn')
const MagicString = require('magic-string')
const walk = require('estree-walker').walk

function optimizeJs (jsString, opts) {
  opts = opts || {}
  const handleFunctionDeclarations = opts.handleFunctionDeclarations || 'safe'
  const ast = acorn.parse(jsString, { ecmaVersion: opts.ecmaVersion || 2020 })
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

      if (
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression' ||
        (node.type === 'FunctionDeclaration' && handleFunctionDeclarations !== 'none')
      ) {
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
        } else if (node.type === 'FunctionDeclaration') {
          if (handleFunctionDeclarations !== 'unsafe') {
            // handle only declarations used after the identifier is declared
            let shouldHoist = false
            walk(parent, {
              enter: function (searchNode) {
                if (
                  searchNode.start < node.start &&
                  searchNode.type === 'Identifier' &&
                  searchNode.name === node.id.name
                ) {
                  shouldHoist = true
                }
              }
            })
            if (shouldHoist) {
              return
            }
          }

          // function x() {} => var x=(function() {});
          magicString
            .appendLeft(node.start, `var ${node.id.name}=(`)
            .appendLeft(node.end, ');')
            .remove(node.id.start - 1, node.id.end)
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

module.exports = { optimizeJs }

'use strict'

const acorn = require('acorn')
const MagicString = require('magic-string')
const walk = require('estree-walker').walk

function optimizeJs (jsString, opts) {
  opts = opts || {}
  const ast = acorn.parse(jsString, { ecmaVersion: 2020 })
  const magicString = new MagicString(jsString)

  const parents = new Map()

  function setParent (node, parent) {
    parents.set(node, parent)
  }

  function getParent (node) {
    return parents.get(node)
  }

  walk(ast, {
    enter: function (node, parent) {
      let prePreChar
      let preChar
      let postChar
      let postPostChar

      // estree-walker does not automatically add a parent node pointer to nodes,
      // which we need for some of our context checks below.
      // normally I would just write "node.parentNode = parent" here, but that makes
      // estree-walker think that parentNode is a child node of the node, which leads to
      // infinite loops as it walks a circular tree. if we make parent a function, though,
      // estree-walker does not follow the link.
      setParent(node, parent)

      // assuming this node is an argument to a function or an element in an array,
      // return true if it itself is already padded with parentheses
      function isPaddedArgument (node) {
        const parent = getParent(node)
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
      function isArgumentToFunctionCall (node) {
        const parent = getParent(node)
        return isCallExpression(parent) &&
          parent.arguments.length &&
          parent.arguments.indexOf(node) !== -1
      }

      // returns true iff node is an IIFE
      function isIIFE (node) {
        return node &&
          node.type === 'FunctionExpression' &&
          isCallExpression(getParent(node)) &&
          getParent(node).callee === node
      }

      function isPlainExpression (node) {
        if (node.id) {
          // ignore function expression with name
          return false
        }
        const parent = getParent(node)
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

        if (isArgumentToFunctionCall(node)) {
          if (!isPaddedArgument(node)) { // don't double-pad
            magicString
              .appendLeft(node.start, '(')
              .appendLeft(node.end, ')')
          }
        } else if (isIIFE(node)) {
          // this function is getting immediately invoked, e.g. function(){}()
          if (preChar !== '(') {
            magicString
              .appendLeft(node.start, '(')
              .appendLeft(node.end, ')')
          }
        } else if (isPlainExpression(node)) {
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

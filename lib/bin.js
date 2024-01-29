#!/usr/bin/env node

'use strict'

const concat = require('concat-stream')
const { optimizeJs } = require('./')
const fs = require('fs')
const yargs = require('yargs')
const argv = yargs
  .usage('Usage: $0 [ options ]')
  .example('$0 input.js > output.js', 'optimize input.js')
  .example('$0 < input.js > output.js', 'read from stdin, write to stdout')
  .option('source-map', {
    alias: 'sourceMap',
    boolean: true,
    describe: 'Include source map'
  })
  .option('ecma-version', {
    alias: 'ecmaVersion',
    choices: [3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 'latest'],
    describe: 'The ECMAScript version to parse. Must be either 3, 5, 6 (or 2015), 7 (2016), 8 (2017), 9 (2018), 10 (2019), 11 (2020), 12 (2021), 13 (2022), 14 (2023), or "latest" (the latest version the library supports). This influences support for strict mode, the set of reserved words, and support for new syntax features.'
  })
  .help('h')
  .alias('h', 'help')
  .argv

const inStream = argv._[0] ? fs.createReadStream(argv._[0], 'utf8') : process.stdin
inStream.pipe(concat(function (buf) {
  const str = buf.toString('utf8')
  const opts = {
    sourceMap: argv['source-map'],
    ecmaVersion: argv['ecma-version']
  }
  try {
    const out = optimizeJs(str, opts)
    console.log(out)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})).on('error', function (err) {
  console.error(err)
  process.exit(1)
})

#!/usr/bin/env node

var argv = require('optimist')
    .default('port', 8136)
    .default('host', 'localhost')
    .argv,
    pkg = require('../package.json');


console.log('Usage: blendnode --blender=/path/to/blender [--port=8136] [--slave --host=localhost]');

if (argv.slave) {
  require('../lib/slave')(argv);
} else {
  require('../lib/master')(argv);
}

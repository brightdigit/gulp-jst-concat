"use strict";

var gUtil = require('gulp-util')
  , PluginError = gUtil.PluginError
  , File = gUtil.File
  , through = require('through')
  , _ = require('lodash')
  , printf = require('util').format

var AMD_HEADER = 'define(function(){\n';
var AMD_FOOTER = 'return this["JST"];\n});';
var JST_HEADER = 'this["JST"] = this["JST"] || {};\n';

function pluginError (message) {
  return new PluginError('gulp-jst-concat', message)
}

function compile (file, renameKeys) {
  var name = file.path.replace(new RegExp(renameKeys[0]), renameKeys[1])
    , contents = String(file.contents)

  return {
    name: name,
    fnSource: _.template(contents).source
  }
}

function buildJSTString(files, opts) {
  function compileAndRender (file) {
    var template = compile(file, opts.renameKeys)
    return printf('["%s"] = %s', template.name, template.fnSource)
  }

  var output = (opts.amd) ? AMD_HEADER + JST_HEADER : JST_HEADER;
  output += printf('this["JST"]%s;', files.map(compileAndRender).join('\nthis["JST"]'))
  output += (opts.amd) ? AMD_FOOTER : '';
  return output;
}

module.exports = function jstConcat(fileName, _opts) {
  if (!fileName) throw pluginError('Missing fileName')

  var defaults = { renameKeys: ['.*', '$&'], amd: false }
    , opts = _.extend({}, defaults, _opts)
    , files = []

  function write (file) {
    /* jshint validthis: true */
    if (file.isNull()) return
    if (file.isStream()) return this.emit('error', pluginError('Streaming not supported'))

    files.push(file)
  }

  function end () {
    /* jshint validthis: true */
    var jstString = buildJSTString(files, opts)

    this.queue(new File({
      path: fileName,
      contents: new Buffer(jstString)
    }))

    this.queue(null)
  }

  return through(write, end)
}

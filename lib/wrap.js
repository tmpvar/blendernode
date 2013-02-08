var child = require('child_process'),
    split = require('split');

module.exports = function(options, fn) {
  var start = Date.now();
  var proc = child.spawn(options.blender, [
    '-b', options.blend,
    '-o', __dirname + '/../tmp/',
    '-f', options.frame
  ], {
    stdio : 'pipe'
  });

  var regex = /([0-9]+)[\/-]([0-9]+)/, last;
  proc.stdout.pipe(split()).on('data', function(d) {
    last = d;
    var matches = d.match(regex);
    if (matches) {
      var current = parseInt(matches[1]);
      var total = parseInt(matches[2]);
      proc.emit('progress', Math.floor((current/total)*100));
    }
  });

  proc.stdout.pipe(process.stdout);
  proc.stderr.pipe(process.stdout);

  proc.on('exit', function() {
    var parts = last.trim().split(' ');
    parts.shift();
    parts.pop();
    parts.pop();

    fn && fn({
      file: parts.join(' '),
      duration: Date.now() - start
    });
  });

  return proc;
};

if (require.main === module) {
  module.exports(require('optimist').argv).on('progress', function(percent) {
    console.log(percent + '% complete');
  });
}

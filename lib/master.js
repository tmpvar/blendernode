var net = require('net'),
    http = require('http'),
    awssum = require('awssum'),
    split = require('split'),
    skateboard = require('skateboard'),
    url = require('url'),
    child = require('child_process'),
    fs = require('fs'),
    path = require('path'),
    blendClient = require('knox').createClient({
      'key'     : process.env.ID,
      'secret' : process.env.SECRET,
      'bucket' : 'blends',
    });

var amazon = awssum.load('amazon/amazon');
var Ec2 = awssum.load('amazon/ec2').Ec2;

var ec2 = new Ec2({
  'accessKeyId'     : process.env.ID,
  'secretAccessKey' : process.env.SECRET,
  'region'          : amazon.US_EAST_1
});

var job = 0;
module.exports = function(options) {
  var wsconn = null;
  var blends = {};
  skateboard({
    dir: __dirname + '/../public',
    port: 8080,
    requestHandler : function(req, res) {

      if (req.method.toLowerCase() === 'post' && req.url.substring(0,4) === '/job') {
        var filename = 'job-' + (job++) + '-' + req.url.split('=').pop().toLowerCase();
        var blendFile = __dirname + '/../tmp/test-' + filename;
        req.pipe(fs.createWriteStream(blendFile));

        blendClient.putStream(req, filename, req.headers, function(e) {
          if (e) {
            res.writeHead(500);
            return res.end('{}');
          }

          res.writeHead(201);
          res.end('{}');

        });

        // Calculate the number of frame we're going to render
        var startFrame = 0, endFrame = 0;
        req.on('end', function() {
          var blender = child.spawn(options.blender, [
            '-b', blendFile,
            '--python', __dirname + '/../bin/blendsettings.py'
          ], { stdio: 'pipe' });

          // collect all the output from the child's stdout and parse
          // it into an object (json)
          var out = "";
          blender.stdout.on('data', function(d) {
            out += d.toString();
          });

          blender.on('exit', function() {
            blends[filename] = JSON.parse(out);
            createSlaves();
          });
        });

        // spawn up some servers
        var createSlaves = function() {

          var client = net.createConnection({
            host:'localhost',
            port: 8136,
          }, function() {
            send('blend', {
              blend: filename
            });

            client.pipe(split()).on('data', function(data) {
              console.log('MASTER', data);
              data = JSON.parse(data);
              client.emit(data.name, data);
            });
          });

          // queue up all the frames!
          var send = function(name, data) {
            data.name = name;
            client.write(JSON.stringify(data) + '\n');
          };

          var frame = blends[filename].start;

          client.on('blend.done', function() {
            console.log('blend downloaded on slave')
            send('frame', { frame: frame });
          });

          client.on('progress', function(d) {
            console.log('PROGRESS', d.percent)
            if (wsconn) {
              d.blend = path.basename(d.blend);
              d.totalFrames = blends[filename].end - blends[filename].start;
              wsconn.write(JSON.stringify(d) + '\n')
            }
          })

          client.on('complete', function() {
            frame++;
            if (frame < blends[filename].end) {
              send('frame', { blend: filename, frame: frame });
            }
          });
        }

      } else {
        res.writeHead('400');
        res.end('bad request');
      }
    }
  }, function(connection) {
    wsconn = connection;
    connection.on('end', function() {
      wsconn = false;
    });
    // handle AUTH
  });
};
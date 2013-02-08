var net = require('net'),
    split = require('split'),
    wrap = require('./wrap'),
    fs = require('fs'),
    defaults = require('defaults'),
    knox = require('knox'),
    path = require('path');

client = knox.createClient({
  'key'     : process.env.ID,
  'secret' : process.env.SECRET,
  'bucket' : 'blends',
});

var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var S3 = awssum.load('amazon/s3').S3;

var s3 = new S3({
  'accessKeyId'     : process.env.ID,
  'secretAccessKey' : process.env.SECRET,
  'region'          : amazon.US_EAST_1
});

module.exports = function(options, fn) {
  defaults(options, {
    blend: __dirname + '/../tmp/job.blend'
  });

  var server = net.createServer(function(conn) {
    var send = function(name, data) {
      data.name = name;
      conn.write(JSON.stringify(data) + '\n');
    };

    conn.pipe(split()).on('data', function(line) {
      var obj = JSON.parse(line);
      conn.emit(obj.name, obj);
    });

    var renderBucket;
    conn.on('blend', function(data) {
      console.log('CLIENT', data);
      options.blend = __dirname + '/../tmp/' + data.blend;

      client.getFile(data.blend, function(err, res) {
        console.log('fetching blendfile')
        if (err) throw err;
        res.pipe(fs.createWriteStream(options.blend));
        res.on('end',function(){

          console.log('blendfile fetched');
          console.log('creating s3 bucket', data.blend);
          s3.CreateBucket({ BucketName: data.blend }, function(err) {
            console.log('attempting to create client for', data.blend);
            renderBucket = knox.createClient({
              'key'     : process.env.ID,
              'secret' : process.env.SECRET,
              'bucket' : data.blend
            });
            console.log('bucket created!', err);

            send('blend.done', {});
          });
        });
      });
    });



    renderBucket = knox.createClient({
      'key'     : process.env.ID,
      'secret' : process.env.SECRET,
      'bucket' : 'job-0-tmp_pad16.265.blend'
    });

    conn.on('frame', function(data) {
      defaults(data, options);
      data.blend = __dirname + '/../tmp/' + data.blend;

      console.log('RENDER FRAME', data.frame);
      // expect: frame
      wrap(data, function(results) {

        renderBucket.putFile(results.file, path.basename(results.file), function(e, r) {
          if (e) {
            return renderBucket.putFile(results.file, path.basename(results.file), function(e, r) {
              send('complete', results);
            });
          }

          send('complete', results);
        });

      }).on('progress', function(percent) {
        send('progress', {
          blend: data.blend,
          frame: data.frame,
          percent: percent
        });
      });
    });
  });

  server.listen(options.port, function() {
    fn && fn();
  });
};

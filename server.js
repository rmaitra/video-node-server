const express = require('express')
const fs = require('fs')
const path = require('path')
const app = express()
const pretty = require('express-prettify');
const ffmpeg = require('ffmpeg');

// find -name "* *" -type d | rename 's/ /_/g'    # do the directories first
// find -name "* *" -type f | rename 's/ /_/g'
 
var assets_path = "./assets/videos/";
var file_map = {
    "videos":[]
}
var one = 0
var walkSync = function(dir, map) {
    files = fs.readdirSync(dir);
    
    var obj;
    
    files.forEach(function(file) {
        obj = {};
        if (fs.statSync(dir + '/' + file).isDirectory()) {
            obj.type = "dir";
            obj.name = file;
            obj.videos = [];
            map.videos.push(obj)
            walkSync(dir + '/' + file, obj);
        }
        else if (file.indexOf('mp4') > -1){
            obj.type = "video"
            obj.name = file.split(".mp4")[0];
            obj.path = dir + '/' + file;
            //createThumbnails(file.split(".mp4")[0], obj.path)
            map.videos.push(obj);
        }
    });
};

walkSync(assets_path, file_map)


function createThumbnails(name, path){
    try {
        var process = new ffmpeg(path);
        process.then(function (video) {
            video.addCommand('-ss', '00:01:30')
            video.addCommand('-vframes', '1')
            video.save('./assets/imgs/' + name + '.jpg', function (error, file) {
                  console.log(error)
                  
                  if (!error){
                      console.log('Video file: ' + file);
                  }
            });
        }, function (err) {
          console.log('Error: ' + err);
        });
    } catch (e) {
        console.log(e.code);
        console.log(e.msg);
    }
}
//createThumbnails("test", "./assets/videos/Dragonball_Z_Complete_Series/Saiyan_Saga/Episode__23-Saibamen Attack\!.mp4")

app.use(pretty({ query: 'pretty' }));
app.use(express.static('assets/imgs/'))

app.get('/list.json', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.end("var VIDEOS=" + JSON.stringify(file_map));
})

app.get('/list-pretty.json', function(req, res) {
    res.json(file_map)
})


app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'))
})

app.get('/video', function(req, res) {
    let page = req.query.path.split("./")[1];
    let path = page
    
    const stat = fs.statSync(path)
    const fileSize = stat.size
    const range = req.headers.range

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1]
        ? parseInt(parts[1], 10)
        : fileSize-1

      const chunksize = (end-start)+1
      const file = fs.createReadStream(path, {start, end})
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      }

      res.writeHead(206, head)
      file.pipe(res)
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      }
      res.writeHead(200, head)
      fs.createReadStream(path).pipe(res)
    }
})

app.listen(3000, function () {
  console.log('Listening on port 3000!')
})

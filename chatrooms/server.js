var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var chatServer = require('./lib/chat_server');

var cache = {};


var server = http.createServer(function(req,res) {
    var filePath = false;
    
    if(req.url == '/') {
        filePath = 'public/index.html';
    }else {
        filePath = 'public' + req.url;
    }
    
    var absPath = './' + filePath;
    serveStatic(res, cache, absPath);
});

chatServer.listen(server);

function NotFind(res) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.write('Error 404: resource not found');
    res.end();
}

function sendFile(res, filePath, fileContents) {
    res.writeHead(200, { 'Content-Type': mime.lookup(path.basename(filePath)) });
    res.end(fileContents);
}

/* 先从缓存查找文件，如果没有查看文件是否存在，存在读取，不存在返回404 */
function serveStatic(res, cache, absPath) {
    if(cache[absPath]) {
        sendFile(res, absPath, cache[absPath]);
    }else {
        fs.exists(absPath, function(exists) {
            if(exists) {
                fs.readFile(absPath, function(err, data){
                    if(err) {
                        NotFind(res);
                    }else {
                        cache[absPath] = data;
                        sendFile(res, absPath, data);
                    }
                });
            }else {
                NotFind(res);
            }
        });
    }
}

server.listen(3000, function() {
    console.log('Server listening on port 3000.');
});
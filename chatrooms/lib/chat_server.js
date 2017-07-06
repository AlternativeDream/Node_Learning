var sockerio = require('socket.io');
var io,
    guestNumber = 1,
    nickNames = {},
    namesUsed = [],
    currentRoom = {};

/* 分配访客名 */
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    var name = 'Guest' + guestNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult', {
        success: true,
        name: name
    });
    nameUsed.push(name);
    return guestNumber + 1;
}

function joinRoom(socket, room) {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult', { room: room });
    socket.broadcase.to(room).emit('message', {
        text: nickNames[socket.id] + ' 加入了' + 'room' + '.'
    });
    
    var userInRoom = io.sockets.clients(room);
    if( userInRoom.length > 1 ) {
        var usersInRoomSummary = room + '中当前用户：';
        for(var i in userInRoom) {
            var userSockerId = userInRoom[i].id;
            if(userSockerId != socker.id) {
                if(i > 0) {
                    usersInRoomSummary += ', ';
                }
                usersInRoomSummary += nickNames[userSockerId];
            }
        }
        usersInRoomSummary += '.';
        socket.emit('message', { text: usersInRoomSummary });
    }
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    socket.on('nameAttempt', function(name) {
        if(name.indexOf('Guest') == 0) {
            socket.emit('nameResult', {
                success: false,
                message: '昵称中请勿包含"Guest".'
            });
        }else {
            if(namesUsed.indexOf(name) == -1) {
                var previousName = nickNames[socket.id];
                var previoutNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previoutNameIndex];
                
                socket.emit('nameResult', {
                    success: true,
                    name: name
                });
                
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: previousName + ' 更名为:' + name + '.'
                });
            }else {
                socket.emit('nameResult', {
                    success: false,
                    message: '该昵称已存在.'
                });
            }
        }
    });
}

function handleMessageBroadcasting(socket) {
    socket.on('message', function (message) {
        socket.broadcast.to(message.room).emit('message', {
            text: nickNames[socket.id] + ': ' + message.text
        });
    });
}

function handleRoomJoining(socket) {
    socket.on('join', function(room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}

function handleClinetDisconnection(socket) {
    socket.on('disconnect', function() {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    });
}

exports.listen = function(server) {
    /* 启动Socket IO服务器，搭载在已有的HTTP服务器上 */
    io = sockerio.listen(server);
    
    io.set('log level', 1);
    /* 定义每个用户连接的处理逻辑 */
    io.sockets.on('connection', function(socket) {
        /* 在用户连接上是赋予其一个访客名 */
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
        /* 用户连接时放入聊天室的Lobby */
        joinRoom(socket, 'Lobby');
        /* 处理用户操作 */
        handleMessageBroadcasting(socket, nickNames);
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);
        /* 提供已被占用的房间列表 */
        socket.on('rooms', function() {
            socket.emit('rooms', io.sockets.manager.rooms);
        });
        /* 用户断开连接逻辑处理 */
        handleClinetDisconnection(socket, nickNames, namesUsed);
    });
};
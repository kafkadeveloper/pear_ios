// https://devcenter.heroku.com/articles/getting-started-with-nodejs#push-local-changes

var http = require('http');
var server = http.createServer();
var io = require('socket.io')(server);
/* Custom namespace */
var nsp = io.of('/api/webrtc');

var openRooms = {};
var connectCounter = 0;

/* Helper functions  */
function socketIdsInRoom(roomId) {
  var socketIds = nsp.adapter.rooms[roomId];
  if (socketIds) {
    var collection = [];
    for (var key in socketIds.sockets) {
      collection.push(key);
    }
    return collection;
  }
  return [];
}

/* Authentication */
io.use((socket, next) => {
  if (socket.request._query['secret'] === 'abcde') {
    next();
  }
});

/* Request handling */
nsp.on('connection', socket => {
  connectCounter++;
  console.log('<connection>', connectCounter);

  socket.on('join' , (data, callback) => {
    if (openRooms[data.name]) {
      /* Join existing room */
      data.id = openRooms[data.name];
      delete openRooms[data.name];
    } else {
      /* Create and join new room */
      openRooms[data.name] = data.id;
    }

    console.log('\tdevice', data.device);
    console.log('\tloc', data.loc);
    console.log('\topenRooms', openRooms);

    var socketId = socketIdsInRoom(data.id);
    callback(socketId);
    socket.join(data.id);
    socket.room = data.id;
    socket.roomName = data.name;
  });

  socket.on('exchange', data => {
    data.from = socket.id;
    socket.broadcast.to(data.to).emit('exchange', data);
  });

  socket.on('disconnect', () => {
    connectCounter--;
    console.log('<disconnect>', connectCounter);

    if (openRooms[socket.roomName] === socket.room) {
      /* When one leaves without pairing */
      delete openRooms[socket.roomName];
    } else {
      /* Kick partner off the room */
      socket.broadcast.to(socket.room).emit('end');
    }
  });
});


/* Start server */
server.listen((process.env.PORT || 8000), () => {
  console.log('Pear server is running');
});
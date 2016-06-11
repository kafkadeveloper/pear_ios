var http = require('http');
var server = http.createServer();
var io = require('socket.io')(server);
var nsp = io.of('/api/webrtc');

var KEY = 'RWNBQm8wITA5TUtSSSVmeHphQg';
var openRooms = [];

/* Helper functions  */
function socketIdsInRoom(roomId) {
  var socketIds = nsp.adapter.rooms[roomId];
  if (socketIds)
    for (var id in socketIds.sockets)
      return [id];
  openRooms.push(roomId);
  return [];
}

/* Authentication */
io.use((socket, next) => {
  if (socket.request._query['secret'] === KEY)
    next();
});

/* Request handling */
nsp.on('connection', socket => {

  socket.on('join', (data, callback) => {
    
    var local_room = openRooms.pop();
    if (local_room)  /* Join existing room */
      data.room = local_room;

    callback(socketIdsInRoom(data.room));
    socket.join(data.room);
  });

  socket.on('exchange', data => {
    data.from = socket.id;
    socket.broadcast.to(data.to).emit('exchange', data);
  });

  socket.on('lochange', data => {
    data.from = socket.id;
    socket.broadcast.to(data.to).emit('lochange', data);
  });

  // socket.on('disconnect', () => {});
});


/* Start server */
server.listen((process.env.PORT || 8000), () => {
  console.log('Pear server is running');
});
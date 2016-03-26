var express = require('express');
var app = express();
var fs = require('fs');
var options = {
  key: fs.readFileSync('./fake-keys/privatekey.pem'),
  cert: fs.readFileSync('./fake-keys/certificate.pem')
};
var serverPort = 8000;
var https = require('https');
var server = https.createServer(options, app);
var io = require('socket.io')(server);

var WEBRTC_SECRET = 'abcde';

var openRooms = {};
var trendData;
var trendUpdateTime;

/* HTTPS SERVER */
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});

app.post('/api/donotion', (req, res) => {
	// check for secret
	res.send('Got a POST request /api/donotion');
});

/* SOCKET.IO */
/* Authentication */
io.use((socket, next) => {
	if (socket.request._query['secret'] === WEBRTC_SECRET) {
		next();
	}
});

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

/* Custom namespace */
var nsp = io.of('/api/webrtc');
nsp.on('connection', socket => {
	console.log('<connection>');

	socket.on('disconnect', () => {
		console.log('<disconnect>');

		// in case a person leaves without connection
		if (openRooms[socket.roomName] === socket.room) {
			delete openRooms[socket.roomName];
		}
		
		console.log("\topenRooms", openRooms);

		// kick people off
		socket.broadcast.to(socket.room).emit('end');

		// if (nsp.adapter.rooms[socket.room]) {
		// 	for (var id in nsp.adapter.rooms[socket.room].sockets) {
		// 		nsp.to(id).emit('leave');
		// 	}
		// }
	});

	socket.on('join' , (data, callback) => {

		if (openRooms[data.name]) {					// join existing room
			data.id = openRooms[data.name];
			delete openRooms[data.name];
		} else {															// create new room
			openRooms[data.name] = data.id;
		}

		console.log('\tdevice', data.device)
		console.log('\tjoin', data.id);
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
});

server.listen(serverPort, () => {
	console.log('listening on *:' + serverPort.toString());
});
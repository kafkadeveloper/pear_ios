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

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

server.listen(serverPort, () => {
  console.log('listening on *:' + serverPort.toString());
});
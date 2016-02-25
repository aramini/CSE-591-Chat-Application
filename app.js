var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require("path");
var mongoose = require('mongoose');
var Message = require('./models/messagemodel');

mongoose.connect('mongodb://127.0.0.1:27017/TOLC-chat',function(err){
  console.log(err);
});

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

http.listen(3003, function() {
    console.log('listening on *:3000');

});

var usernames = {};

io.on('connection', function(socket) {
    console.log('a user connected');
    socket.on('adduser', function(username) {
        socket.username = username;
        usernames[username] = username;
        io.sockets.emit('enteruser', username);

        Message.find(function(err,data){
          if(err) console.log(err);
          else{
            io.sockets.emit('clearchat');
            data.forEach(function(mes){
              io.sockets.emit('updatechat',mes.user,mes.text);
            });
          }
        })

    });
    socket.on('sendchat', function(data) {
        var message = new Message({
          user: socket.username,
          text: data
        });
        message.save(function(err){
          if(err) console.log(err);
          else console.log("saved");
        });
        io.sockets.emit('updatechat', socket.username, data);
    });
    socket.on('disconnect', function() {
        username = socket.username;
        io.sockets.emit('deleteuser', username);
    });
});

app.get('/chat', function(req, res) {
    res.sendFile(path.join(__dirname + '/chat.html'));
});

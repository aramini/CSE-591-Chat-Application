var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require("path");
var mongoose = require('mongoose');
var Message = require('./models/messagemodel');
var Room = require('./models/roommodel');

mongoose.connect('mongodb://127.0.0.1:27017/TOLC-chat',function(err){
  console.log(err);
});

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

http.listen(3000, function() {
    console.log('listening on *:3000');

});

var usernames = {};
var count=0;
io.on('connection', function(socket) {
    console.log('a user connected');
    socket.on('adduser', function(username) {

        socket.username = username;
        usernames[username] = username;
        if(Object.keys(usernames).length == 1){
          var r = new Room({
            room : 'Room1',
            summary : '',
            participants : [username]
          });
          r.save(function(err){
            if(err) console.log(err);
            else console.log("saved room");
          });
        }

        else{
          Room.update({
            room : 'Room1'
          },{$push : {participants : username}},function(err){
            if(err) console.log(err);
            else console.log("pushed");
          })
          Room.find({room:'Room1'},function(err,data){
          if(err) console.log(err);
          else {
            io.sockets.emit('summary',data[0].summary);
          }
        });
        }



        io.sockets.emit('enteruser',usernames);

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

    socket.on('savesummary',function(data){
        console.log("hi"+data);
        Room.update({room:'Room1'},{summary:data},{multi:true},function(err){
          if(err)
          console.log(err);
        });
        io.sockets.emit('summary',data);
    });

    socket.on('disconnect', function() {
        username = socket.username;
        io.sockets.emit('deleteuser', username);
        delete usernames[username];
    });
});

app.get('/chat', function(req, res) {
    res.sendFile(path.join(__dirname + '/chat.html'));
});

var app=require('express')();
var http=require('http').Server(app);
var io = require('socket.io')(http);
var path=require("path");

app.get('/', function(req, res){
  res.sendFile(path.join(__dirname + '/index.html'));
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

var usernames={};

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('adduser',function(username){
  	socket.username=username;
        usernames[username]=username;
        io.sockets.emit('enteruser',username);
  
});
  socket.on('sendchat',function(data){
        
  	io.sockets.emit('updatechat',socket.username,data);
});
  socket.on('disconnect',function(){
 	username=socket.username;	
	io.sockets.emit('deleteuser',username);
});
});

app.get('/chat',function(req,res){
  res.sendFile(path.join(__dirname+'/chat.html'));
});


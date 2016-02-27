var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require("path");
var mongoose = require('mongoose');
var fs = require('fs');
var bodyParser = require('body-parser');

var path = require('path');


var Message = require('./models/messagemodel');
var Room = require('./models/roommodel');

var COMMENTS_FILE = path.join(__dirname, 'comments.json');

mongoose.connect('mongodb://127.0.0.1:27017/TOLC-chat', function(err) {
  if(err) console.log(err);
});

app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Additional middleware which will set headers that we need on each request.
app.use(function(req, res, next) {
    // Set permissive CORS header - this allows this server to be used only as
    // an API server in conjunction with something like webpack-dev-server.
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Disable caching so we'll always get the latest comments.
    res.setHeader('Cache-Control', 'no-cache');
    next();
});


app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

http.listen(3000, function() {
  console.log('listening on *:3000');
});

app.get('/api/comments', function(req, res) {
  fs.readFile(COMMENTS_FILE, function(err, data) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    res.json(JSON.parse(data));
  });
});

app.post('/api/comments', function(req, res) {
  fs.readFile(COMMENTS_FILE, function(err, data) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    var comments = JSON.parse(data);
    // NOTE: In a real implementation, we would likely rely on a database or
    // some other approach (e.g. UUIDs) to ensure a globally unique id. We'll
    // treat Date.now() as unique-enough for our purposes.
    var newComment = {
      id: Date.now(),
      author: req.body.author,
      text: req.body.text,
    };
    comments.push(newComment);
    fs.writeFile(COMMENTS_FILE, JSON.stringify(comments, null, 4), function(err) {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      res.json(comments);
    });
  });
});


var usernames = {};
var count = 0;
io.on('connection', function(socket) {
  console.log('a user connected');
  socket.on('adduser', function(username) {

    socket.username = username;
    usernames[username] = username;
    if (Object.keys(usernames).length == 1) {
      var r = new Room({
        room: 'Room1',
        summary: '',
        participants: [username]
      });
      r.save(function(err) {
        if (err) console.log(err);
        else console.log("saved room");
      });
    } else {
      Room.update({
        room: 'Room1'
      }, {
        $push: {
          participants: username
        }
      }, function(err) {
        if (err) console.log(err);
        else console.log("pushed");
      })
      Room.find({
        room: 'Room1'
      }, function(err, data) {
        if (err) console.log(err);
        else {
          io.sockets.emit('summary', data[0].summary);
        }
      });
    }



    io.sockets.emit('enteruser', usernames);

    Message.find(function(err, data) {
      if (err) console.log(err);
      else {
        io.sockets.emit('clearchat');
        data.forEach(function(mes) {
          io.sockets.emit('updatechat', mes.user, mes.text);
        });
      }
    })

  });


  socket.on('sendchat', function(data) {
    var message = new Message({
      user: socket.username,
      text: data
    });
    message.save(function(err) {
      if (err) console.log(err);
      else console.log("saved");
    });
    io.sockets.emit('updatechat', socket.username, data);
  });

  socket.on('savesummary', function(data) {
    console.log("hi" + data);
    Room.update({
      room: 'Room1'
    }, {
      summary: data
    }, {
      multi: true
    }, function(err) {
      if (err)
        console.log(err);
    });
    io.sockets.emit('summary', data);
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

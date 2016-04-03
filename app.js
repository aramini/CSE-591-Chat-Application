var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require("path");
var mongoose = require('mongoose');
var fs = require('fs');
var bodyParser = require('body-parser');
var cors = require('cors')
var path = require('path');


var Message = require('./models/messagemodel');
var Room = require('./models/roommodel');
var Archive = require('./models/archivemodel');
var Point = require('./models/pointmodel');

var COMMENTS_FILE = path.join(__dirname, 'comments.json');
var ARCHIVE_COMMENTS_FILE = path.join(__dirname, 'archivecomments.json');
mongoose.connect('mongodb://127.0.0.1:27017/TOLC-chat', function(err) {
    if (err) console.log(err);
});



app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({
    extended: true
}));

// Additional middleware which will set headers that we need on each request.
app.use(function(req, res, next) {
    // Set permissive CORS header - this allows this server to be used only as
    // an API server in conjunction with something like webpack-dev-server.
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');

    // Disable caching so we'll always get the latest comments.
    res.setHeader('Cache-Control', 'no-cache');
    next();
});


app.get('/', function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.sendFile(path.join(__dirname + '/home.html'));
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

app.get('/api/saveChat', function(req, res) {
    var archive = {};
    Room.find({
        room: 'Room1'
    }, function(err, data) {
        if (err) console.log(err);
        else {
            archive.summary = data[0].summary;
            Message.find().lean().exec(function(err, data) {
                if (err) console.log(err);
                else {
                    archive.messages = JSON.stringify(data);
                    fs.readFile(COMMENTS_FILE, function(err, datalinks) {
                        if (err) {
                            console.error(err);
                            process.exit(1);
                        }
                        archive.links = datalinks;
                        archive.title = req.query.saveName;
                        archive.created = Date.now();
                        var a = new Archive(archive);
                        a.save(function(err) {
                            if (err) console.log(err); });
                        res.json(archive);

                        Message.remove(function(err) {
                            if (err) console.log(err);
                        });

                        Room.remove({ room: "Room1" }, function(err) {
                            if (err) console.log(err);
                        });

                        
                        fs.writeFile(COMMENTS_FILE, '[]', function(){console.log('done clearing file')});
                           
                    });

                }
            })

        }
    });


});


app.get('/api/archiveslist', function(req, res) {
    Archive.find({}, function(err, docs) {
        res.json(docs);
    });
});

app.get('/api/updatearchivechat', function(req, res) {
    Archive.find({ title: req.query.title }, function(err, data) {
        if (err) console.log(err);
        else {
            res.json(data[0].messages);
        }
    });
});

app.get('/api/updatearchivelinks', function(req, res) {
    Archive.find(function(err, data) {
        if (err) console.log(err);
        else {
            res.json(data[0].links);
        }
    });
});

app.get('/api/updatearchivesummary', function(req, res) {
    Archive.find(function(err, data) {
        if (err) console.log(err);
        else {
            res.json(data[0].summary);
        }
    });
});


app.get('/api/points',function(req,res){
  Point.count({user:req.query.user}, function(err,count){
    if(count==0){
      var a = new Point({
        user : req.query.user,
      points : 10
      });
      a.save(function(err){
        if(err) console.log(err);
        else console.log("added user to points");
      });
    }
  });
  Point.update({ user: req.query.user }, { $inc: { points: 10 } }, function(err, data) {
        if (err)
            res.send(err);
        else
            res.send(data);
    });
});



app.post('/api/comments', function(req, res) {
    fs.readFile(COMMENTS_FILE, function(err, data) {
        console.log("GOT POST REQUEST");
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
            title: req.body.title,
            url: req.body.url,
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

        Room.count({}, function(err, count) {
            if (count > 0) {
                Room.update({
                    room: 'Room1'
                }, {
                    $push: {
                        participants: username
                    }
                }, function(err, data) {
                    if (err) console.log(err);

                    console.log("Save user to room", data)
                });

                Room.find({
                    room: 'Room1'
                }, function(err, data) {
                    if (err) console.log(err);
                    else {
                        io.sockets.emit('summary', data[0].summary);
                    }
                });
            } else {
                var r = new Room({
                    room: 'Room1',
                    summary: '',
                    participants: [username]
                });
                r.save(function(err) {
                    if (err) console.log(err);
                    else console.log("saved room");
                });
            }
        });


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


app.get('/api/upvoteChat', function(req, res) {
    console.log(req.query.msgid);
    Message.update({ text: req.query.msgid }, { $inc: { votes: 1 } }, function(err, data) {
        if (err)
            res.send(err);
        else
            res.send(data);
    });
});

app.get('/api/downvoteChat', function(req, res) {
    Message.update({ text: req.query.msgid }, { $inc: { votes: -1 } }, function(err, data) {
        if (err)
            res.send(err);
        else
            res.send(data);
    });
});


app.get('/chat', function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.sendFile(path.join(__dirname + '/chat.html'));
});

app.get('/archive', function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.sendFile(path.join(__dirname + '/archive.html'));
});
app.get('/index', function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/archivelist', function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.sendFile(path.join(__dirname + '/archivelist.html'));
});
app.get('/leader', function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.sendFile(path.join(__dirname + '/leaderboard.html'));
});


app.get('/api/archivecomments', function(req, res) {
    fs.readFile(ARCHIVE_COMMENTS_FILE, function(err, data) {
        var empty = {};
        if (err) {
            console.error(err);
            process.exit(1);

        }
        if (data == "") res.json(empty);
        else res.json(JSON.parse(data));
    });
});

app.post('/api/archivecomments', function(req, res) {
  console.log("Got a comment to save")
  fs.readFile(ARCHIVE_COMMENTS_FILE, function(err, data) {
    console.log("GOT POST REQUEST");
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(req.body);
    var comments = JSON.parse(data);
    // NOTE: In a real implementation, we would likely rely on a database or
    // some other approach (e.g. UUIDs) to ensure a globally unique id. We'll
    // treat Date.now() as unique-enough for our purposes.
    var newComment = {
      id: Date.now(),
      author: req.body.author,
      text: req.body.text,
      user: req.body.user
    };
    comments.push(newComment);
    fs.writeFile(ARCHIVE_COMMENTS_FILE, JSON.stringify(comments, null, 4), function(err) {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      res.json(comments);
    });

});
});
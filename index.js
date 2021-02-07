const express = require("express");
const app = express();
const http = require('http').Server(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const port = 3001;

const path = require('path');
app.use(express.static(path.join(__dirname, 'client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

const idLength = 12;
function makeID(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

let rooms = {}
let user_rooms = {};

io.on('connection', (socket) => {
  console.log(`${socket.id} connected`);
  user_rooms[socket.id] = null;

  socket.on('disconnect', () => {
    console.log(`${socket.id} disconnected`);
    if (user_rooms[socket.id]) {
      const index = rooms[user_rooms[socket.id]].users.indexOf(socket.id);
      rooms[user_rooms[socket.id]].users.splice(index, 1);
      if (rooms[user_rooms[socket.id]].users.length === 0) {
        delete rooms[user_rooms[socket.id]];
      }
      delete user_rooms[socket.id];
    }
  });

  socket.on('create_room', () => {
    let id = makeID(idLength);
    rooms[id] = { users: [], lines: [], started: false };
    socket.join(id);
    socket.emit('room_created', id);
  });

  socket.on('join_room', (room) => {
    if (!rooms.hasOwnProperty(room)) {
      socket.emit('exception', {errorMessage: 'No such room exists'});
      return;
    }
    socket.join(room);
    rooms[room].users.push(socket.id);
    user_rooms[socket.id] = room;
    socket.emit('initialize', { users: rooms[room].users,
      lines: rooms[room].lines });
    socket.to(room).emit('new_player', rooms[room]);
  });

  socket.on('start_room', () => {
    const room_id = user_rooms[socket.id];
    if (room_id
      && rooms[room_id]
      && rooms[room_id].users[0] === socket.id) {
      rooms[user_rooms[socket.id]].started = true;
      io.to(room_id).emit('room_started');
    }
  });

  socket.on('draw', (coords) => {
    const room = user_rooms[socket.id];
    if (room) { // && rooms[room].started) {
      socket.to(room).emit('draw', coords);
      rooms[room].lines.push(coords);
    }
  });
});

http.listen(port, () => {
  console.log(`listening on *:${port}`);
});
const express = require("express");
const app = express();
const http = require('http').Server(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:5000",
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 5000;

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

function shuffle(array) {
	var currentIndex = array.length;
	var temp, randomIndex;

	while (currentIndex !== 0) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		temp = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temp;
	}

	return array;
};

let rooms = {}
let user_rooms = {};

function round_start(room) {
  if (!rooms[room]) return;

  io.to(room).emit('round_started', {
    guesser: rooms[room].guesser,
    paint_order: rooms[room].paint_order
  });
  // TODO: Round counter, limit, round times should be in the room object
  // TODO: Maybe account for latency by adding some time
  setTimeout(() => { start_draw(room) }, 3000);
}

function start_draw(room) {
  if (!rooms[room]) return;

  console.log(rooms[room]);
  io.to(room).emit('start_draw', {
    painter: rooms[room].painter,
    inkAmount: 35, // TODO
    color: 'red' // TODO
  });
  io.to(rooms[room].painter).emit('your_turn');

  setTimeout(() => { times_up(room) }, 5000);
}

function times_up(room) {
  if (!rooms[room]) return;

  rooms[room].lines = [];

  painter_index = rooms[room].paint_order.indexOf(rooms[room].painter);
  if (painter_index < rooms[room].paint_order.length - 1) {
    rooms[room].painter = rooms[room].paint_order[painter_index + 1];
    start_draw(room);
  } else {
    console.log("Round end");
    rooms[room].lines = [];

    guesser_index = rooms[room].guess_order.indexOf(rooms[room].guesser);
    if (guesser_index < rooms[room].guess_order.length - 1) {
      rooms[room].guesser = rooms[room].guess_order[guesser_index + 1];
      rooms[room].paint_order = shuffle(rooms[room].users.slice());
      const index = rooms[room].paint_order.indexOf(rooms[room].guesser);
      rooms[room].paint_order.splice(index, 1);
      rooms[room].painter = rooms[room].paint_order[0];
      round_start(room);
    } else {
      // TODO: What to do when number of rounds exceeds number of players to guess? Probably just loop through.
      console.log("Game end?")
    }
  }
}

io.on('connection', (socket) => {
  console.log(`${socket.id} connected`);
  user_rooms[socket.id] = null;

  socket.on('disconnect', () => {
    console.log(`${socket.id} disconnected`);
    if (user_rooms[socket.id]) {
      const index = rooms[user_rooms[socket.id]].users.indexOf(socket.id);
      rooms[user_rooms[socket.id]].users.splice(index, 1);
      // TODO: players_changed should send more limited info, including new game state (especially drawers, etc). Also, what if it interrupts a round?
      socket.to(user_rooms[socket.id]).emit('players_changed', rooms[user_rooms[socket.id]]);
      if (rooms[user_rooms[socket.id]].users.length === 0) {
        console.log(`deleting room ${user_rooms[socket.id]}`)
        delete rooms[user_rooms[socket.id]];
      }
      delete user_rooms[socket.id];
    }
  });

  socket.on('create_room', () => {
    let id = makeID(idLength);
    rooms[id] = { users: [], lines: [],
      started: false, play_started: false,
      guess_order: null, guesser: null,
      paint_order: null, painter: null,
      users_loading: [] };
    socket.join(id);
    socket.emit('room_created', id);
  });

  socket.on('join_room', (room) => {
    if (!rooms.hasOwnProperty(room)) {
      socket.emit('exception', {errorMessage: 'No such room exists'});
      return;
    }
    if (user_rooms[socket.id]) {
      rooms[user_rooms[socket.id]].users_loading = rooms[user_rooms[socket.id]].users_loading.filter(x => x != socket.id);
      console.log(`${socket.id} finished loading into room ${user_rooms[socket.id]}`);
      if (rooms[user_rooms[socket.id]].users_loading.length == 0 && !rooms[user_rooms[socket.id]].play_started) {
        // TODO: Is this a race condition that won't run if two people finish loading at the same time?
        // TODO: Make some interface for this loading on the frontend
        rooms[user_rooms[socket.id]].play_started = true;
        round_start(user_rooms[socket.id]);
      }
      // socket.emit('rooms[user_rooms[socket.id]].users_loadingexception', {errorMessage: 'User already in a room'});
      return;
    }
    console.log(`${socket.id} joining room ${room}`);
    socket.join(room);
    rooms[room].users.push(socket.id);
    // TODO: Probably inject them into guess_order if game started. Probably at end?.
    user_rooms[socket.id] = room;
    socket.emit('initialize', { users: rooms[room].users,
      lines: rooms[room].lines });
    socket.to(room).emit('players_changed', rooms[room]);
    if (rooms[room].started) socket.emit('room_started');
  });

  socket.on('initialize', () => {
    const room_id = user_rooms[socket.id];
    if (room_id && rooms[room_id]) {
      socket.emit('initialize', {
        users: rooms[room_id].users,
        lines: rooms[room_id].lines,
        guesser: rooms[room_id].guesser,
        paint_order: rooms[room_id].paint_order,
        painter: rooms[room_id].painter,
      });
    }
  })

  socket.on('leave_room', () => {
    if (user_rooms[socket.id]) {
      socket.leave(user_rooms[socket.id]);
      console.log(`${socket.id} leaving room ${user_rooms[socket.id]}`);
      const index = rooms[user_rooms[socket.id]].users.indexOf(socket.id);
      rooms[user_rooms[socket.id]].users.splice(index, 1);
      socket.to(user_rooms[socket.id]).emit('players_changed', rooms[user_rooms[socket.id]]);
      if (rooms[user_rooms[socket.id]].users.length === 0) {
        console.log(`deleting room ${user_rooms[socket.id]}`)
        delete rooms[user_rooms[socket.id]];
      }
      delete user_rooms[socket.id];
    }
  });

  socket.on('start_room', () => {
    const room_id = user_rooms[socket.id];
    if (room_id
      && rooms[room_id]
      && rooms[room_id].users[0] === socket.id) {
      rooms[user_rooms[socket.id]].lines = [];
      rooms[user_rooms[socket.id]].guess_order =
        shuffle(rooms[user_rooms[socket.id]].users.slice());
      rooms[user_rooms[socket.id]].guesser =
        rooms[user_rooms[socket.id]].guess_order[0];
      rooms[user_rooms[socket.id]].paint_order =
        shuffle(rooms[user_rooms[socket.id]].users.slice());
      const index = rooms[user_rooms[socket.id]].paint_order
        .indexOf(rooms[user_rooms[socket.id]].guesser);
      rooms[user_rooms[socket.id]].paint_order.splice(index, 1);
      rooms[user_rooms[socket.id]].painter =
        rooms[user_rooms[socket.id]].paint_order[0];
      rooms[user_rooms[socket.id]].users_loading = rooms[user_rooms[socket.id]].users.slice();
      rooms[user_rooms[socket.id]].started = true;
      console.log("Room started", rooms[user_rooms[socket.id]]);
      io.to(room_id).emit('room_started');
    }
  });

  socket.on('draw', (coords) => {
    // TODO: Checks for painter, and track ink amount
    const room = user_rooms[socket.id];
    if (room && rooms[room].started) {
      socket.to(room).emit('draw', coords);
      rooms[room].lines.push(coords);
    }
  });
});

http.listen(port, () => {
  console.log(`listening on *:${port}`);
});
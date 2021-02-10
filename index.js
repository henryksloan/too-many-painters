const express = require("express");
const app = express();
const http = require('http').Server(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:5000",
    methods: ["GET", "POST"]
  }
});

const { createCanvas } = require('canvas');

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

let rooms = {};
let userRooms = {};
const inkMax = 100, inkMin = 35;
const pixelsPerPercent = 10;
// TODO: Should white be here as a funny eraser? Maybe make it rare and special on the frontend (like an eraser)?
const colors = ['red', 'blue', 'green', 'black', 'cyan', 'darkred', 'darkgreen', 'yellow', 'orange', 'gray', 'purple', 'pink'];

function roundStart(room) {
  if (!rooms[room]) return;

  io.to(room).emit('round_started', {
    guesser: rooms[room].guesser,
    paintOrder: rooms[room].paintOrder
  });

  rooms[room].lines = [];
  const context = rooms[room].canvas.getContext('2d');
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);

  // TODO: Round counter, limit, round times should be in the room object
  // TODO: Maybe account for latency by adding some time
  setTimeout(() => { startDraw(room) }, 3000);
}

function startDraw(room) {
  if (!rooms[room]) return;

  console.log(rooms[room]);
  const inkAmount = Math.floor(Math.random() * ((inkMax + 1) - inkMin) + inkMin);
  const color = colors[Math.floor(Math.random() * colors.length)];
  rooms[room].inkAmount = inkAmount;
  rooms[room].color = color;
  io.to(room).emit('start_draw', { painter: rooms[room].painter, inkAmount, color });
  io.to(rooms[room].painter).emit('your_turn');

  setTimeout(() => { timesUp(room) }, 5000);
}

function timesUp(room) {
  if (!rooms[room]) return;

  let painterIndex = rooms[room].paintOrder.indexOf(rooms[room].painter);
  rooms[room].painter = null;
  if (painterIndex < rooms[room].paintOrder.length - 1) {
    rooms[room].painter = rooms[room].paintOrder[painterIndex + 1];
    startDraw(room);
  } else {
    console.log("Round end");
    // TODO: Maybe extra guess time?
    let guesserIndex = rooms[room].guessOrder.indexOf(rooms[room].guesser);
    if (guesserIndex < rooms[room].guessOrder.length - 1) {
      rooms[room].guesser = rooms[room].guessOrder[guesserIndex + 1];
      rooms[room].paintOrder = shuffle(rooms[room].users.slice());
      const index = rooms[room].paintOrder.indexOf(rooms[room].guesser);
      rooms[room].paintOrder.splice(index, 1);
      rooms[room].painter = rooms[room].paintOrder[0];
      roundStart(room);
    } else {
      // TODO: What to do when number of rounds exceeds number of players to guess? Probably just loop through.
      console.log("Game end?")
    }
  }
}

io.on('connection', (socket) => {
  console.log(`${socket.id} connected`);
  userRooms[socket.id] = null;

  socket.on('disconnect', () => {
    console.log(`${socket.id} disconnected`);
    if (userRooms[socket.id]) {
      const index = rooms[userRooms[socket.id]].users.indexOf(socket.id);
      rooms[userRooms[socket.id]].users.splice(index, 1);
      // TODO: players_changed should send more limited info, including new game state (especially drawers, etc). Also, what if it interrupts a round?
      socket.to(userRooms[socket.id]).emit('players_changed', {
        users: rooms[userRooms[socket.id]].users
      });
      if (rooms[userRooms[socket.id]].users.length === 0) {
        console.log(`deleting room ${userRooms[socket.id]}`)
        delete rooms[userRooms[socket.id]];
      }
      delete userRooms[socket.id];
    }
  });

  socket.on('create_room', () => {
    let id = makeID(idLength);
    rooms[id] = { users: [], lines: [],
      started: false, playStarted: false,
      guessOrder: null, guesser: null,
      paintOrder: null, painter: null,
      canvas: createCanvas(500, 400), inkAmount: 0, color: 'red',
      usersLoading: [] };
    socket.join(id);
    socket.emit('room_created', id);
  });

  socket.on('join_room', (room) => {
    if (!rooms.hasOwnProperty(room)) {
      socket.emit('exception', {errorMessage: 'No such room exists'});
      return;
    }
    if (userRooms[socket.id]) {
      rooms[userRooms[socket.id]].usersLoading = rooms[userRooms[socket.id]].usersLoading.filter(x => x != socket.id);
      console.log(`${socket.id} finished loading into room ${userRooms[socket.id]}`);
      if (rooms[userRooms[socket.id]].usersLoading.length == 0 && !rooms[userRooms[socket.id]].playStarted) {
        // TODO: Is this a race condition that won't run if two people finish loading at the same time?
        // TODO: Make some interface for this loading on the frontend
        rooms[userRooms[socket.id]].playStarted = true;
        roundStart(userRooms[socket.id]);
      }
      return;
    }
    console.log(`${socket.id} joining room ${room}`);
    socket.join(room);
    rooms[room].users.push(socket.id);
    // TODO: Probably inject them into guessOrder if game started. Probably at end?.
    userRooms[socket.id] = room;
    socket.emit('initialize', { users: rooms[room].users,
      lines: rooms[room].lines });
    socket.to(room).emit('players_changed', {
      users: rooms[room].users
    });
    if (rooms[room].started) socket.emit('room_started');
  });

  socket.on('initialize', () => {
    const roomId = userRooms[socket.id];
    if (roomId && rooms[roomId]) {
      socket.emit('initialize', {
        users: rooms[roomId].users,
        lines: rooms[roomId].lines,
        guesser: rooms[roomId].guesser,
        paintOrder: rooms[roomId].paintOrder,
        painter: rooms[roomId].painter,
        color: rooms[roomId].color,
        inkAmount: rooms[roomId].inkAmount,
      });
    }
  })

  socket.on('leave_room', () => {
    if (userRooms[socket.id]) {
      socket.leave(userRooms[socket.id]);
      console.log(`${socket.id} leaving room ${userRooms[socket.id]}`);
      const index = rooms[userRooms[socket.id]].users.indexOf(socket.id);
      rooms[userRooms[socket.id]].users.splice(index, 1);
      socket.to(userRooms[socket.id]).emit('players_changed', {
        users: rooms[userRooms[socket.id]].users
      });
      if (rooms[userRooms[socket.id]].users.length === 0) {
        console.log(`deleting room ${userRooms[socket.id]}`)
        delete rooms[userRooms[socket.id]];
      }
      delete userRooms[socket.id];
    }
  });

  socket.on('start_room', () => {
    const roomId = userRooms[socket.id];
    if (roomId
      && rooms[roomId]
      && rooms[roomId].users[0] === socket.id) {
      if (!rooms[userRooms[socket.id]].canvas) {
        rooms[userRooms[socket.id]].canvas = createCanvas(500, 400);
      }
      rooms[userRooms[socket.id]].lines = [];
      rooms[userRooms[socket.id]].guessOrder =
        shuffle(rooms[userRooms[socket.id]].users.slice());
      rooms[userRooms[socket.id]].guesser =
        rooms[userRooms[socket.id]].guessOrder[0];
      rooms[userRooms[socket.id]].paintOrder =
        shuffle(rooms[userRooms[socket.id]].users.slice());
      const index = rooms[userRooms[socket.id]].paintOrder
        .indexOf(rooms[userRooms[socket.id]].guesser);
      rooms[userRooms[socket.id]].paintOrder.splice(index, 1);
      rooms[userRooms[socket.id]].painter =
        rooms[userRooms[socket.id]].paintOrder[0];
      rooms[userRooms[socket.id]].usersLoading = rooms[userRooms[socket.id]].users.slice();
      rooms[userRooms[socket.id]].started = true;
      console.log("Room started", rooms[userRooms[socket.id]]);
      io.to(roomId).emit('room_started');
    }
  });

  socket.on('draw', (coords) => {
    const room = userRooms[socket.id];
    if (room && rooms[room].started && rooms[room].painter === socket.id && rooms[room].inkAmount > 0) {
      const context = rooms[room].canvas.getContext('2d');
      let before = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
      context.strokeStyle = rooms[room].color;
      context.lineWidth = 5;
      context.lineCap = 'round'; 
      context.beginPath();
      context.moveTo(coords[0], coords[1]);
      context.lineTo(coords[2], coords[3]);
      context.stroke();
      context.closePath();
      let after = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
      let pixelsChanged = 0;
      // TODO: In principle, this should only have to check an area enclosing the two points, with sufficient padding
      for (let i = 0; i < before.data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
          if (before.data[i+j] !== after.data[i+j]) {
            pixelsChanged += 1;
            break;
          }
        }
      }
      rooms[room].inkAmount -= (pixelsChanged / pixelsPerPercent);
      // TODO: Simulate the draw and count pixels
      // TODO: Validate line length?
      // socket.to(room).emit('draw', { coords: coords, color: rooms[room].color, inkAmount: rooms[room].inkAmount });
      io.to(room).emit('draw', { coords: coords, color: rooms[room].color, inkAmount: rooms[room].inkAmount });
      rooms[room].lines.push({ line: coords, color: rooms[room].color });
    }
  });
});

http.listen(port, () => {
  console.log(`listening on *:${port}`);
});
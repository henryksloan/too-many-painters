const { io } = require('./app.js');
const { shuffle } = require('./helpers.js');
const { createCanvas } = require('canvas');

const inkMax = 100, inkMin = 35;
const pixelsPerPercent = 10;
// TODO: Should white be here as a funny eraser? Maybe make it rare and special on the frontend (like an eraser)?
const colors = ['red', 'blue', 'green', 'black', 'cyan', 'darkred', 'darkgreen', 'yellow', 'orange', 'gray', 'purple', 'pink'];

module.exports = class Room {
  constructor(id) {
    this.id = id;

    this.players = [] // Complete player list, even loading players
    this.sockets = {};
    this.usernames = {};
    this.playersLoading = [];

    this.guessOrder = []; // Applies to an entire game
    this.guesser = null;
    this.paintOrder = []; // Applies to a single round
    this.painter = null;

    this.lines = []; // [{ coords: [x1, y1, x2, y2], color: ...}, ...]
    this.inkAmount = 0;
    this.color = '';
    this.canvas = createCanvas(500, 400);

    this.started = false; // False when in lobby, true when on room screen
    this.playStarted = false; // Set to true for an entire game once all players load
  }

  getPlayerList() {
    return this.players.map(socketId => {
      return [socketId, this.usernames[socketId]];
    });
  }

  updatePaintOrder() {
    this.paintOrder = shuffle(this.players.slice());
    const index = this.paintOrder.indexOf(this.guesser);
    this.paintOrder.splice(index, 1);
    this.painter = this.paintOrder[0];
  }

  // Returns everything a new player needs to reconcile their local data
  getPublicData() {
    return {
      players: this.getPlayerList(),
      playersLoading: this.playersLoading,
      started: this.started, playStarted: this.playStarted,
      guesser: this.guesser, paintOrder: this.paintOrder, painter: this.painter,
      lines: this.lines, inkAmount: this.inkAmount, color: this.color
    };
  }

  playerJoin(socket, username) {
    this.players.push(socket.id);
    this.sockets[socket.id] = socket;
    this.usernames[socket.id] = username;
    // If game is in lobby, is it full?
    // If game is started, inject them into the draw order if possible?
    // Technically, that could make for rounds of infinite length if players keep cycling in
    // It would probably be better to make them wait till the next round... That wouldn't complicate logic very much at all
    // What if started && !playStarted?
  }

  // Returns true if the room is now empty
  playerLeave(socketId) {
    const index = this.players.indexOf(socketId);
    this.players.splice(index, 1);
    delete this.sockets[socketId];
    delete this.usernames[socketId];
    return this.players.length == 0;
    // TODO: Send signal to update client side user lists and state
    // TODO: What if the leaver is the current guesser or painter?
    // TODO: What if the players are counting down the round? Make sure the right signal is sent when they start
  }

  playerLoaded(socketId) {
    if (!this.playStarted) {
      this.playersLoading = this.playersLoading.filter(x => x != socketId);
      console.log(`${socketId} finished loading into room ${this.id}`);
      if (this.playersLoading.length == 0) this.roundStart();
    }
  }

  gameStart(socketId) {
    if (this.players[0] != socketId || this.started) return false;

    this.playersLoading = this.players.slice();

    this.guessOrder = shuffle(this.players.slice());
    this.guesser = this.guessOrder[0];
    this.updatePaintOrder();

    this.lines = [];
    this.inkAmount = 0;
    this.color = '';
    const context = this.canvas.getContext('2d');
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    this.started = true;
    this.playStarted = false;

    return true;
  }

  roundStart() {
    console.log("Round started");
    io.to(this.id).emit('round_started', {
      guesser: this.guesser,
      paintOrder: this.paintOrder
    });

    this.lines = [];
    const context = this.canvas.getContext('2d');
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    // TODO: Round counter, limit, round times should be in the room object
    // TODO: Maybe account for latency by adding some time
    setTimeout(() => { this.startDraw() }, 3000);
  }

  startDraw() {
    this.inkAmount = Math.floor(Math.random() * ((inkMax + 1) - inkMin) + inkMin);
    this.color = colors[Math.floor(Math.random() * colors.length)];

    io.to(this.id).emit('start_draw', {
      painter: this.painter,
      inkAmount: this.inkAmount,
      color: this.color
    });
    io.to(this.painter).emit('your_turn');
    setTimeout(() => { this.timesUp() }, 5000);
  }

  timesUp() {
    let painterIndex = this.paintOrder.indexOf(this.painter);
    this.painter = null;
    if (painterIndex < this.paintOrder.length - 1) {
      this.painter = this.paintOrder[painterIndex + 1];
      this.startDraw();
    } else {
      console.log("Round end");
      // TODO: Maybe extra guess time?
      let guesserIndex = this.guessOrder.indexOf(this.guesser);
      if (guesserIndex < this.guessOrder.length - 1) {
        this.guesser = this.guessOrder[guesserIndex + 1];
        this.updatePaintOrder();
        this.roundStart();
      } else {
        // TODO: What to do when number of rounds exceeds number of players to guess? Probably just loop through.
        console.log("Game end?")
      }
    }
  }

  draw(socketId, coords) {
    if (!this.started || this.painter !== socketId || this.inkAmount <= 0) return;

    const context = this.canvas.getContext('2d');
    let before = context.getImageData(0, 0, context.canvas.width, context.canvas.height);

    context.strokeStyle = this.color;
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
    this.inkAmount -= (pixelsChanged / pixelsPerPercent);

    // TODO: Validate line length?
    io.to(this.id).emit('draw', { coords: coords, color: this.color, inkAmount: this.inkAmount });
    this.lines.push({ line: coords, color: this.color });
  }
}
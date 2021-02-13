const { io } = require('./app.js');
const { shuffle } = require('./helpers.js');
const { createCanvas } = require('canvas');

const inkMax = 100, inkMin = 35;
const pixelsPerPercent = 10;
// TODO: Should white be here as a funny eraser? Maybe make it rare and special on the frontend (like an eraser)?
const colors = ['red', 'blue', 'green', 'black', 'cyan', 'darkred', 'darkgreen', 'yellow', 'orange', 'gray', 'purple', 'pink'];
const words = 
  ["bridge", "bone", "grapes", "bell",
  "jellyfish", "bunny", "truck", "grass",
  "door", "monkey", "spider", "bread",
  "ears", "bowl", "bracelet", "alligator",
  "bat", "clock", "lollipop", "moon",
  "doll", "orange", "ear", "basketball",
  "bike", "airplane", "pen", "seashell",
  "rocket", "cloud", "bear", "corn",
  "chicken", "purse", "glasses", "blocks",
  "carrot", "turtle", "pencil", "horse",
  "dinosaur", "head", "lamp", "snowman",
  "ant", "giraffe", "cupcake", "chair",
  "leaf", "bunk bed", "snail", "baby",
  "balloon", "bus", "cherry", "crab",
  "football", "branch", "robot"];

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

    this.word = '';
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

  generateUsername() {
    // TODO
    return "Generated";
  }

  playerJoin(socket, username) {
    // TODO: Should they be added to guess order?
    this.players.push(socket.id);
    this.sockets[socket.id] = socket;
    if (username && typeof username == "string") {
      this.usernames[socket.id] = username.substring(0, 13)
    } else {
      this.usernames[socket.id] = this.generateUsername();
    }
    io.to(this.id).emit('players_changed', this.getPlayerList());
  }

  // Returns true if the room is now empty
  playerLeave(socketId) {
    const wasPainter = socketId === this.painter;
    const wasGuesser = socketId === this.guesser;

    const index = this.players.indexOf(socketId);
    this.players.splice(index, 1);
    delete this.sockets[socketId];
    delete this.usernames[socketId];

    io.to(this.id).emit('players_changed', this.getPlayerList());
    if (wasPainter) {
      this.timesUp(); // TODO: What about score popup? Be careful!
    } else if (wasGuesser) {
      this.endRound(); // TODO: What about score popup? Be careful!
    }
    this.paintOrder = this.paintOrder.filter(x => x != socketId);
    this.guessOrder = this.guessOrder.filter(x => x != socketId);

    return this.players.length == 0;
  }

  playerLoaded(socketId) {
    if (!this.playStarted) {
      this.playersLoading = this.playersLoading.filter(x => x != socketId);
      console.log(`${socketId} finished loading into room ${this.id}`);
      if (this.playersLoading.length == 0) {
        this.playStarted = true;
        this.roundStart();
      }
    }
  }

  gameStart(socketId) {
    if (this.players[0] != socketId || this.started) return false;

    this.playersLoading = this.players.slice();

    this.guessOrder = shuffle(this.players.slice());
    this.guesser = this.guessOrder[0];
    this.updatePaintOrder();

    this.word = '';
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

    this.word = words[Math.floor(Math.random() * words.length)];
    for (let player of this.players) {
      let word = (player === this.guesser)
        ? this.word.replace(/[^\s]/g, '_')
        : this.word;
      // io.to(this.id).emit('round_started', {
      this.sockets[player].emit('round_started', {
        guesser: this.guesser,
        paintOrder: this.paintOrder,
        word
      });
    }
    io.to(this.guesser).emit('your_turn_guess');

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
      this.endRound();
    }
  }

  endRound() {
    console.log("Round end");
    // TODO: Should send a round end signal with score info,
    // then wait a few seconds (equal to the time it's shown on client),
    // Then increment the current round counter, and either start the next round or do some end_game protocol

    // TODO: Should probably take parameter for score, e.g. if it was preemptively ended (i.e. no score, maybe skip the popup)
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

  draw(socketId, coords) {
    if (!this.playStarted || this.painter !== socketId || this.inkAmount <= 0) return;

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

  guess(socketId, str) {
    if (!this.playStarted || this.guesser !== socketId) return;

    const correct = this.word === str;
    io.to(this.id).emit('guess', { sender: this.guesser, content: str, correct });
    if (correct) {
      console.log("Correct!");
      this.endRound();
    }
  }

  changeUsername(socketId, username) {
    if (username && typeof username == "string" && !this.started) {
      this.usernames[socketId] = username.substring(0, 13);
      io.to(this.id).emit('players_changed', this.getPlayerList());
    }
  }

  changeSetting(socket, name, value) {
    if (this.players[0] !== socket.id || this.started) return;

    if (name === "rounds" && value !== '') {
      value = Math.max(1, Math.min(30, Number(value) || 1));
    } else if (name === "draw_time" && value !== '') {
      value = Math.max(1, Math.min(60, Number(value) || 1));
    }
    socket.to(this.id).emit('setting_changed', name, value);
  }
}
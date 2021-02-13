const { io } = require('./app.js');
const { makeId } = require('./helpers.js');
const Room = require('./room.js');

const idLength = 12;
module.exports = class RoomList {
  constructor() {
    this.rooms = {};
    this.userRooms = {};
  }

  createRoom(creator) {
    if (this.userRooms[creator.id]) {
      socket.emit('exception', {errorMessage: 'User is already in a room'});
      return;
    }

    const id = makeId(idLength);
    this.rooms[id] = new Room(id);
    creator.join(id);
    creator.emit('room_created', id);
  }

  joinRoom(socket, roomId, username) {
    if (!this.rooms[roomId]) {
      socket.emit('exception', {errorMessage: 'No such room exists'});
      return;
    }
    if (this.userRooms[socket.id]) {
      socket.emit('exception', {errorMessage: 'User is already in a room'});
      return;
    }

    // TODO: Room capacity maximum
    console.log(`${socket.id} joining room ${roomId}`);
    socket.join(roomId);
    this.userRooms[socket.id] = roomId;
    this.rooms[roomId].playerJoin(socket, username);
    socket.emit('room_joined', { ...this.rooms[roomId].getPublicData(), selfId: socket.id });
    if (this.rooms[roomId].settings && !this.rooms[roomId].started) {
      for (let setting of Object.entries(this.rooms[roomId].settings)) {
        socket.emit('setting_changed', setting[0], setting[1]);
      }
    }
  }

  leaveRoom(socket) {
    const roomId = this.userRooms[socket.id];
    console.log(`${socket.id} leaving ${roomId}`);
    if (roomId) {
      const roomEmpty = this.rooms[roomId].playerLeave(socket.id);
      if (roomEmpty) {
        console.log(`deleting room ${roomId}`);
        delete this.rooms[roomId];
      }
      delete this.userRooms[socket.id];
    }
  }

  playerLoaded(socket) {
    const roomId = this.userRooms[socket.id];
    if (roomId) this.rooms[roomId].playerLoaded(socket.id);
  }

  startRoom(socket, settings) {
    const roomId = this.userRooms[socket.id];
    if (!roomId) {
      socket.emit('exception', {errorMessage: 'User is not in a room'});
      return;
    }

    const { success, ...new_settings } = this.rooms[roomId].gameStart(socket.id, settings);
    if (success) {
      console.log('Room started', this.rooms[roomId]);
      io.to(roomId).emit('room_started', new_settings);
    } else {
      socket.emit('exception', {errorMessage: 'Failed to start room'});
    }
  }

  draw(socket, coords) {
    const roomId = this.userRooms[socket.id];
    if (!roomId) {
      socket.emit('exception', {errorMessage: 'User is not in a room'});
    } else {
      this.rooms[roomId].draw(socket.id, coords);
    }
  }

  guess(socket, str) {
    const roomId = this.userRooms[socket.id];
    if (!roomId) {
      socket.emit('exception', {errorMessage: 'User is not in a room'});
    } else {
      this.rooms[roomId].guess(socket.id, str);
    }
  }

  changeUsername(socket, username) {
    const roomId = this.userRooms[socket.id];
    if (!roomId) {
      socket.emit('exception', {errorMessage: 'User is not in a room'});
    } else {
      this.rooms[roomId].changeUsername(socket.id, username);
    }
  }

  changeSetting(socket, name, value) {
    const roomId = this.userRooms[socket.id];
    if (!roomId) {
      socket.emit('exception', {errorMessage: 'User is not in a room'});
    } else {
      this.rooms[roomId].changeSetting(socket, name, value);
    }
  }
}
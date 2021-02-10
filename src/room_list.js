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

  joinRoom(socket, roomId) {
    if (!this.rooms[roomId]) {
      socket.emit('exception', {errorMessage: 'No such room exists'});
      return;
    }
    if (this.userRooms[socket.id]) {
      socket.emit('exception', {errorMessage: 'User is already in a room'});
      return;
    }

    console.log(`${socket.id} joining room ${roomId}`);
    socket.join(roomId);
    this.userRooms[socket.id] = roomId;
    this.rooms[roomId].playerJoin(socket, "Username");
    socket.emit('room_joined', this.rooms[roomId].getPublicData());
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

  startRoom(socket) {
    const roomId = this.userRooms[socket.id];
    if (!roomId) {
      socket.emit('exception', {errorMessage: 'User is not in a room'});
      return;
    }

    const success = this.rooms[roomId].gameStart(socket.id);
    if (success) {
      console.log('Room started', this.rooms[roomId]);
      io.to(roomId).emit('room_started');
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
}
const { http, io, port } = require('./app.js');
const RoomList = require('./room_list.js');

http.listen(port, () => {
  console.log(`listening on *:${port}`);
});

const roomList = new RoomList();

io.on('connection', (socket) => {
  console.log(`${socket.id} connected`);

  socket.on('disconnect', () => {
    console.log(`${socket.id} disconnected`);
    roomList.leaveRoom(socket);
  });

  socket.on('create_room', () => roomList.createRoom(socket));
  socket.on('join_room', (roomId) => roomList.joinRoom(socket, roomId));
  socket.on('leave_room', () => roomList.leaveRoom(socket));
  // socket.on('initialize', callback => callback(roomList.getPublicData(socket)));
  socket.on('game_loaded', () => roomList.playerLoaded(socket));
  socket.on('start_room', () => roomList.startRoom(socket));
  socket.on('draw', coords => roomList.draw(socket, coords));
});
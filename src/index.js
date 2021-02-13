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
  socket.on('join_room', (roomId, username) => roomList.joinRoom(socket, roomId, username));
  socket.on('leave_room', () => roomList.leaveRoom(socket));
  socket.on('game_loaded', () => roomList.playerLoaded(socket));
  socket.on('start_room', () => roomList.startRoom(socket));
  socket.on('draw', coords => roomList.draw(socket, coords));
  socket.on('guess', str => roomList.guess(socket, str));
  socket.on('change_username', username => roomList.changeUsername(socket, username));
  socket.on('change_setting', (name, value) => roomList.changeSetting(socket, name, value));
});
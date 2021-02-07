import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

const Lobby = props => {
  let { roomId } = useParams();
  const history = useHistory();
  let [users, setUsers] = useState([]);

  useEffect(() => {
    props.socket.on("new_player", (room) => {
      console.log(room);
      setUsers(room.users);
    });

    props.socket.on("initialize", (room) => {
      console.log(room);
      setUsers(room.users);
    });

    props.socket.on("room_started", (room) => {
      history.push(`/room/${roomId}`);
    });

    props.socket.emit("join_room", roomId);
  }, [roomId, props.socket, history]);
  
  const userList = users.map((user) => <li key={ user }>{ user }</li>);

  return (
    <div>
      <p>{ roomId }</p>
      <button onClick={ () => props.socket.emit('start_room') }>Start</button>
      <ol>{ userList }</ol>
    </div>
  );
}

export default Lobby;
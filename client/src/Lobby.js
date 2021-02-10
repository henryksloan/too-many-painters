import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

const Lobby = props => {
  let { roomId } = useParams();
  const history = useHistory();
  let [users, setUsers] = useState([]);

  useEffect(() => {
    let gameStarting = false;
    let isRendered = true;

    props.socket.on("players_changed", (room) => {
      if (isRendered) setUsers(room.users);
    });

    props.socket.on("initialize", (room) => {
      if (isRendered) setUsers(room.users);
    });

    props.socket.on("room_started", () => {
      gameStarting = true;
      history.push(`/room/${roomId}`);
    });

    props.socket.emit("join_room", roomId);

    return () => {
      isRendered = false;
      if (!gameStarting) props.socket.emit("leave_room");
      props.socket.removeAllListeners();
    }
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
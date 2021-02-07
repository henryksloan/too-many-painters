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
      console.log(room);
      if (isRendered) setUsers(room.users);
    });

    props.socket.on("initialize", (room) => {
      console.log(room);
      if (isRendered) setUsers(room.users);
    });

    props.socket.on("room_started", (room) => {
      gameStarting = true;
      console.log("Starting");
      history.push(`/room/${roomId}`);
    });

    props.socket.emit("join_room", roomId);

    return () => {
      isRendered = false;
      console.log("Leaving " + gameStarting);
      if (!gameStarting) props.socket.emit("leave_room");
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
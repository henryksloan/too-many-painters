import React, { useEffect } from "react";
import { useHistory } from "react-router-dom";

const Lobby = props => {
  const history = useHistory();

  useEffect(() => {
    props.socket.on("room_created", (id) => {
      history.push(`/lobby/${id}`);
    });
  }, [history, props.socket]);

  
  return (
    <button onClick={() => props.socket.emit('create_room') }>Create Room</button>
  );
}

export default Lobby;
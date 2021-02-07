import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import Canvas from './Canvas';

const Room = props => {
  let { roomId } = useParams();

  useEffect(() => {
    props.socket.emit("join_room", roomId);
  }, [props.socket, roomId]);

  return (
    <div>
      <Canvas width="500" height="400" socket={ props.socket } />
      <progress id="file" value="32" max="100">32%</progress>
    </div>
  );
}

export default Room;
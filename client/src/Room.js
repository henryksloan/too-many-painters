import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import Canvas from './Canvas';

const Room = props => {
  let { roomId } = useParams();
  let canvasRef = useRef();
  let [users, setUsers] = useState([]);
  let [painter, setPainter] = useState(null);
  let [guesser, setGuesser] = useState(null);
  let [myTurn, setMyTurn] = useState(false);

  useEffect(() => {
    props.socket.on("players_changed", (room) => {
      console.log(room);
      setUsers(room.users);
      // setPainter(room.users[1] || null);
      // setGuesser(room.users[2] || null);
    });

    props.socket.on("initialize", (room) => {
      console.log(room);
      setUsers(room.users);
      setPainter(room.painter);
      setGuesser(room.guesser);
    });

    props.socket.on('round_started', guesser => {
      console.log("Guesser:", guesser);
      setGuesser(guesser);
      setPainter(null);
      // TODO: Clear screen, start countdown
    });

    props.socket.on('start_draw', data => {
      console.log(data);
      let {painter: _painter, inkAmount, color} = data;
      setPainter(_painter);
      canvasRef.current.setInk(inkAmount, color);
      setMyTurn(false);
    });

    props.socket.on('your_turn', () => {
      console.log("My turn!!");
      setMyTurn(true);
    });

    props.socket.emit('join_room', roomId);
    props.socket.emit('initialize');

    return () => { props.socket.emit('leave_room') };
  }, [props.socket, roomId]);

  const userList = users.map((user) => {
    if (user === painter) {
      return <li key={ user }><strong>{ user }</strong></li>
    } else if (user === guesser) {
      return <li key={ user }><i>{ user }</i></li>
    } else {
      return <li key={ user }>{ user }</li>
    }
  });
  return (
    <div>
      <Canvas ref={ canvasRef } socket={ props.socket } myTurn={ myTurn } />
      <ol>{ userList }</ol>
    </div>
  );
}

export default Room;